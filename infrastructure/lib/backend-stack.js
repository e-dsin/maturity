"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendStack = void 0;
const cdk = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const rds = require("aws-cdk-lib/aws-rds");
const ecs = require("aws-cdk-lib/aws-ecs");
const ecsPatterns = require("aws-cdk-lib/aws-ecs-patterns");
const secretsmanager = require("aws-cdk-lib/aws-secretsmanager");
const logs = require("aws-cdk-lib/aws-logs");
const ecr = require("aws-cdk-lib/aws-ecr");
const elbv2 = require("aws-cdk-lib/aws-elasticloadbalancingv2");
const route53 = require("aws-cdk-lib/aws-route53");
const acm = require("aws-cdk-lib/aws-certificatemanager");
class BackendStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { environment, domainName, hostedZoneId, hostedZoneName, certificateArn, fallbackDbPassword } = props;
        // Import de la hosted zone et du certificat
        const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
            hostedZoneId: hostedZoneId,
            zoneName: hostedZoneName,
        });
        const certificate = acm.Certificate.fromCertificateArn(this, 'Certificate', certificateArn);
        // VPC pour l'infrastructure backend
        const vpc = new ec2.Vpc(this, 'BackendVPC', {
            maxAzs: 2,
            natGateways: 1,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    cidrMask: 28,
                    name: 'database',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ],
        });
        // Security Groups
        const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSG', {
            vpc,
            description: 'Security group for RDS database',
            allowAllOutbound: false,
        });
        const appSecurityGroup = new ec2.SecurityGroup(this, 'ApplicationSG', {
            vpc,
            description: 'Security group for ECS application',
        });
        const albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSG', {
            vpc,
            description: 'Security group for Application Load Balancer',
        });
        // ALB peut recevoir du trafic HTTPS
        albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');
        // App peut recevoir du trafic de l'ALB
        appSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(3000), 'Allow traffic from ALB');
        // DB peut recevoir du trafic de l'app
        dbSecurityGroup.addIngressRule(appSecurityGroup, ec2.Port.tcp(3306), 'Allow MySQL traffic from application');
        // Secrets Manager pour les credentials
        const dbSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
            secretName: `maturity-db-${environment}`,
            description: 'Database credentials for Maturity Assessment',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: 'admin' }),
                generateStringKey: 'password',
                excludeCharacters: '"@/\\\'',
                passwordLength: 32,
            },
        });
        const jwtSecret = new secretsmanager.Secret(this, 'JWTSecret', {
            secretName: `maturity-jwt-${environment}`,
            description: 'JWT Secret for Maturity Assessment',
            generateSecretString: {
                passwordLength: 64,
                excludeCharacters: '"@/\\\'',
            },
        });
        // RDS MySQL (compatible MariaDB)
        const database = new rds.DatabaseInstance(this, 'Database', {
            engine: rds.DatabaseInstanceEngine.mysql({
                version: rds.MysqlEngineVersion.VER_8_0_35,
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
            credentials: rds.Credentials.fromSecret(dbSecret),
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
            securityGroups: [dbSecurityGroup],
            databaseName: 'maturity_assessment',
            storageEncrypted: true,
            backupRetention: cdk.Duration.days(7),
            deletionProtection: false,
            removalPolicy: environment === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.SNAPSHOT,
        });
        // ECR Repository
        const ecrRepo = ecr.Repository.fromRepositoryName(this, 'BackendRepository', `maturity-backend-${environment}`);
        // ECS Cluster
        const cluster = new ecs.Cluster(this, 'BackendCluster', {
            vpc,
            clusterName: `maturity-backend-${environment}`,
            containerInsights: true,
        });
        // CloudWatch Log Group
        const logGroup = new logs.LogGroup(this, 'BackendLogGroup', {
            logGroupName: `/ecs/maturity-backend-${environment}`,
            retention: logs.RetentionDays.TWO_WEEKS,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Task Definition
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'BackendTaskDefinition', {
            memoryLimitMiB: 512,
            cpu: 256,
        });
        // Accorder les permissions pour lire les secrets
        dbSecret.grantRead(taskDefinition.taskRole);
        jwtSecret.grantRead(taskDefinition.taskRole);
        // Container Definition
        const container = taskDefinition.addContainer('backend', {
            image: ecs.ContainerImage.fromEcrRepository(ecrRepo, 'latest'),
            environment: {
                NODE_ENV: 'production',
                PORT: '3000',
                DB_HOST: database.instanceEndpoint.hostname,
                DB_PORT: '3306',
                DB_NAME: 'maturity_assessment',
                FRONTEND_URL: environment === 'dev'
                    ? 'https://dev-maturity.e-dsin.fr'
                    : 'https://maturity.e-dsin.fr',
                LOG_LEVEL: 'info',
                DB_PASSWORD_FALLBACK: fallbackDbPassword || '',
                ECS_ENABLE_CONTAINER_METADATA: 'true',
            },
            secrets: {
                DB_USER: ecs.Secret.fromSecretsManager(dbSecret, 'username'),
                DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
                JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
            },
            logging: ecs.LogDrivers.awsLogs({
                logGroup,
                streamPrefix: 'backend',
            }),
            healthCheck: {
                command: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
                interval: cdk.Duration.seconds(60),
                timeout: cdk.Duration.seconds(10),
                retries: 3,
                startPeriod: cdk.Duration.seconds(300),
            },
        });
        container.addPortMappings({
            containerPort: 3000,
            protocol: ecs.Protocol.TCP,
        });
        // Application Load Balancer avec Fargate Service
        const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'BackendService', {
            cluster,
            taskDefinition,
            serviceName: `maturity-backend-${environment}`,
            desiredCount: environment === 'dev' ? 1 : 2,
            assignPublicIp: false,
            securityGroups: [appSecurityGroup],
            domainName: `api-${environment}.dev-maturity.e-dsin.fr`,
            domainZone: hostedZone,
            certificate: certificate,
            protocol: elbv2.ApplicationProtocol.HTTPS,
            redirectHTTP: true,
            listenerPort: 443,
        });
        // Configuration du health check pour le load balancer
        fargateService.targetGroup.configureHealthCheck({
            path: '/health',
            protocol: elbv2.Protocol.HTTP,
            port: '3000',
            healthyThresholdCount: 2,
            unhealthyThresholdCount: 5,
            timeout: cdk.Duration.seconds(10),
            interval: cdk.Duration.seconds(30),
        });
        // Auto-scaling basé sur le CPU
        const scaling = fargateService.service.autoScaleTaskCount({
            minCapacity: environment === 'dev' ? 1 : 2,
            maxCapacity: environment === 'dev' ? 2 : 10,
        });
        scaling.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 70,
            scaleInCooldown: cdk.Duration.minutes(5),
            scaleOutCooldown: cdk.Duration.minutes(5),
        });
        // Enregistrement DNS
        this.apiUrl = `https://api-${environment}.dev-maturity.e-dsin.fr`;
        this.databaseEndpoint = database.instanceEndpoint.hostname;
        // Outputs
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: this.apiUrl,
            description: 'API URL',
        });
        new cdk.CfnOutput(this, 'DatabaseEndpoint', {
            value: this.databaseEndpoint,
            description: 'RDS Database Endpoint',
        });
        new cdk.CfnOutput(this, 'ECRRepositoryURI', {
            value: ecrRepo.repositoryUri,
            description: 'ECR Repository URI',
        });
        new cdk.CfnOutput(this, 'DatabaseSecretArn', {
            value: dbSecret.secretArn,
            description: 'Database Secret ARN',
        });
        new cdk.CfnOutput(this, 'ClusterName', {
            value: cluster.clusterName,
            description: 'ECS Cluster Name',
        });
        new cdk.CfnOutput(this, 'ServiceName', {
            value: fargateService.service.serviceName,
            description: 'ECS Service Name',
        });
    }
}
exports.BackendStack = BackendStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2VuZC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJhY2tlbmQtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLDJDQUEyQztBQUMzQywyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDREQUE0RDtBQUM1RCxpRUFBaUU7QUFDakUsNkNBQTZDO0FBQzdDLDJDQUEyQztBQUMzQyxnRUFBZ0U7QUFDaEUsbURBQW1EO0FBQ25ELDBEQUEwRDtBQVkxRCxNQUFhLFlBQWEsU0FBUSxHQUFHLENBQUMsS0FBSztJQUl6QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXdCO1FBQ2hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRTVHLDRDQUE0QztRQUM1QyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDakYsWUFBWSxFQUFFLFlBQVk7WUFDMUIsUUFBUSxFQUFFLGNBQWM7U0FDekIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRTVGLG9DQUFvQztRQUNwQyxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUMxQyxNQUFNLEVBQUUsQ0FBQztZQUNULFdBQVcsRUFBRSxDQUFDO1lBQ2QsbUJBQW1CLEVBQUU7Z0JBQ25CO29CQUNFLFFBQVEsRUFBRSxFQUFFO29CQUNaLElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUs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QUMsU0FBUyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDaEMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ2xCLFdBQVcsRUFBRSxTQUFTO1NBQ3ZCLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDMUMsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0I7WUFDNUIsV0FBVyxFQUFFLHVCQUF1QjtTQUNyQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzFDLEtBQUssRUFBRSxPQUFPLENBQUMsYUFBYTtZQUM1QixXQUFXLEVBQUUsb0JBQW9CO1NBQ2xDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDM0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxTQUFTO1lBQ3pCLFdBQVcsRUFBRSxxQkFBcUI7U0FDbkMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDckMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxXQUFXO1lBQzFCLFdBQVcsRUFBRSxrQkFBa0I7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDckMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxPQUFPLENBQUMsV0FBVztZQUN6QyxXQUFXLEVBQUUsa0JBQWtCO1NBQ2hDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTFRRCxvQ0EwUUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XHJcbmltcG9ydCAqIGFzIHJkcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtcmRzJztcclxuaW1wb3J0ICogYXMgZWNzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3MnO1xyXG5pbXBvcnQgKiBhcyBlY3NQYXR0ZXJucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNzLXBhdHRlcm5zJztcclxuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XHJcbmltcG9ydCAqIGFzIGVjciBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNyJztcclxuaW1wb3J0ICogYXMgZWxidjIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVsYXN0aWNsb2FkYmFsYW5jaW5ndjInO1xyXG5pbXBvcnQgKiBhcyByb3V0ZTUzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzJztcclxuaW1wb3J0ICogYXMgYWNtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQmFja2VuZFN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XHJcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcclxuICBkb21haW5OYW1lOiBzdHJpbmc7XHJcbiAgaG9zdGVkWm9uZUlkOiBzdHJpbmc7XHJcbiAgaG9zdGVkWm9uZU5hbWU6IHN0cmluZztcclxuICBjZXJ0aWZpY2F0ZUFybjogc3RyaW5nO1xyXG4gIGZhbGxiYWNrRGJQYXNzd29yZD86IHN0cmluZzsgLy8gTmV3IG9wdGlvbmFsIHBhcmFtZXRlciBmb3IgZmFsbGJhY2sgcGFzc3dvcmRcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEJhY2tlbmRTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGFwaVVybDogc3RyaW5nO1xyXG4gIHB1YmxpYyByZWFkb25seSBkYXRhYmFzZUVuZHBvaW50OiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBCYWNrZW5kU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgY29uc3QgeyBlbnZpcm9ubWVudCwgZG9tYWluTmFtZSwgaG9zdGVkWm9uZUlkLCBob3N0ZWRab25lTmFtZSwgY2VydGlmaWNhdGVBcm4sIGZhbGxiYWNrRGJQYXNzd29yZCB9ID0gcHJvcHM7XHJcblxyXG4gICAgLy8gSW1wb3J0IGRlIGxhIGhvc3RlZCB6b25lIGV0IGR1IGNlcnRpZmljYXRcclxuICAgIGNvbnN0IGhvc3RlZFpvbmUgPSByb3V0ZTUzLkhvc3RlZFpvbmUuZnJvbUhvc3RlZFpvbmVBdHRyaWJ1dGVzKHRoaXMsICdIb3N0ZWRab25lJywge1xyXG4gICAgICBob3N0ZWRab25lSWQ6IGhvc3RlZFpvbmVJZCxcclxuICAgICAgem9uZU5hbWU6IGhvc3RlZFpvbmVOYW1lLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgY2VydGlmaWNhdGUgPSBhY20uQ2VydGlmaWNhdGUuZnJvbUNlcnRpZmljYXRlQXJuKHRoaXMsICdDZXJ0aWZpY2F0ZScsIGNlcnRpZmljYXRlQXJuKTtcclxuXHJcbiAgICAvLyBWUEMgcG91ciBsJ2luZnJhc3RydWN0dXJlIGJhY2tlbmRcclxuICAgIGNvbnN0IHZwYyA9IG5ldyBlYzIuVnBjKHRoaXMsICdCYWNrZW5kVlBDJywge1xyXG4gICAgICBtYXhBenM6IDIsXHJcbiAgICAgIG5hdEdhdGV3YXlzOiAxLFxyXG4gICAgICBzdWJuZXRDb25maWd1cmF0aW9uOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgY2lkck1hc2s6IDI0LFxyXG4gICAgICAgICAgbmFtZTogJ3B1YmxpYycsXHJcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBjaWRyTWFzazogMjQsXHJcbiAgICAgICAgICBuYW1lOiAncHJpdmF0ZScsXHJcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgY2lkck1hc2s6IDI4LFxyXG4gICAgICAgICAgbmFtZTogJ2RhdGFiYXNlJyxcclxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfSVNPTEFURUQsXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNlY3VyaXR5IEdyb3Vwc1xyXG4gICAgY29uc3QgZGJTZWN1cml0eUdyb3VwID0gbmV3IGVjMi5TZWN1cml0eUdyb3VwKHRoaXMsICdEYXRhYmFzZVNHJywge1xyXG4gICAgICB2cGMsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VjdXJpdHkgZ3JvdXAgZm9yIFJEUyBkYXRhYmFzZScsXHJcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IGZhbHNlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgYXBwU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnQXBwbGljYXRpb25TRycsIHtcclxuICAgICAgdnBjLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBFQ1MgYXBwbGljYXRpb24nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgYWxiU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnQUxCU0cnLCB7XHJcbiAgICAgIHZwYyxcclxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlcicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBTEIgcGV1dCByZWNldm9pciBkdSB0cmFmaWMgSFRUUFNcclxuICAgIGFsYlNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXHJcbiAgICAgIGVjMi5QZWVyLmFueUlwdjQoKSxcclxuICAgICAgZWMyLlBvcnQudGNwKDQ0MyksXHJcbiAgICAgICdBbGxvdyBIVFRQUyB0cmFmZmljJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBBcHAgcGV1dCByZWNldm9pciBkdSB0cmFmaWMgZGUgbCdBTEJcclxuICAgIGFwcFNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXHJcbiAgICAgIGFsYlNlY3VyaXR5R3JvdXAsXHJcbiAgICAgIGVjMi5Qb3J0LnRjcCgzMDAwKSxcclxuICAgICAgJ0FsbG93IHRyYWZmaWMgZnJvbSBBTEInXHJcbiAgICApO1xyXG5cclxuICAgIC8vIERCIHBldXQgcmVjZXZvaXIgZHUgdHJhZmljIGRlIGwnYXBwXHJcbiAgICBkYlNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXHJcbiAgICAgIGFwcFNlY3VyaXR5R3JvdXAsXHJcbiAgICAgIGVjMi5Qb3J0LnRjcCgzMzA2KSxcclxuICAgICAgJ0FsbG93IE15U1FMIHRyYWZmaWMgZnJvbSBhcHBsaWNhdGlvbidcclxuICAgICk7XHJcblxyXG4gICAgLy8gU2VjcmV0cyBNYW5hZ2VyIHBvdXIgbGVzIGNyZWRlbnRpYWxzXHJcbiAgICBjb25zdCBkYlNlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ0RhdGFiYXNlU2VjcmV0Jywge1xyXG4gICAgICBzZWNyZXROYW1lOiBgbWF0dXJpdHktZGItJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0RhdGFiYXNlIGNyZWRlbnRpYWxzIGZvciBNYXR1cml0eSBBc3Nlc3NtZW50JyxcclxuICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcclxuICAgICAgICBzZWNyZXRTdHJpbmdUZW1wbGF0ZTogSlNPTi5zdHJpbmdpZnkoeyB1c2VybmFtZTogJ2FkbWluJyB9KSxcclxuICAgICAgICBnZW5lcmF0ZVN0cmluZ0tleTogJ3Bhc3N3b3JkJyxcclxuICAgICAgICBleGNsdWRlQ2hhcmFjdGVyczogJ1wiQC9cXFxcXFwnJyxcclxuICAgICAgICBwYXNzd29yZExlbmd0aDogMzIsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBqd3RTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdKV1RTZWNyZXQnLCB7XHJcbiAgICAgIHNlY3JldE5hbWU6IGBtYXR1cml0eS1qd3QtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0pXVCBTZWNyZXQgZm9yIE1hdHVyaXR5IEFzc2Vzc21lbnQnLFxyXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xyXG4gICAgICAgIHBhc3N3b3JkTGVuZ3RoOiA2NCxcclxuICAgICAgICBleGNsdWRlQ2hhcmFjdGVyczogJ1wiQC9cXFxcXFwnJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFJEUyBNeVNRTCAoY29tcGF0aWJsZSBNYXJpYURCKVxyXG4gICAgY29uc3QgZGF0YWJhc2UgPSBuZXcgcmRzLkRhdGFiYXNlSW5zdGFuY2UodGhpcywgJ0RhdGFiYXNlJywge1xyXG4gICAgICBlbmdpbmU6IHJkcy5EYXRhYmFzZUluc3RhbmNlRW5naW5lLm15c3FsKHtcclxuICAgICAgICB2ZXJzaW9uOiByZHMuTXlzcWxFbmdpbmVWZXJzaW9uLlZFUl84XzBfMzUsXHJcbiAgICAgIH0pLFxyXG4gICAgICBpbnN0YW5jZVR5cGU6IGVjMi5JbnN0YW5jZVR5cGUub2YoZWMyLkluc3RhbmNlQ2xhc3MuVDMsIGVjMi5JbnN0YW5jZVNpemUuTUlDUk8pLFxyXG4gICAgICBjcmVkZW50aWFsczogcmRzLkNyZWRlbnRpYWxzLmZyb21TZWNyZXQoZGJTZWNyZXQpLFxyXG4gICAgICB2cGMsXHJcbiAgICAgIHZwY1N1Ym5ldHM6IHtcclxuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVELFxyXG4gICAgICB9LFxyXG4gICAgICBzZWN1cml0eUdyb3VwczogW2RiU2VjdXJpdHlHcm91cF0sXHJcbiAgICAgIGRhdGFiYXNlTmFtZTogJ21hdHVyaXR5X2Fzc2Vzc21lbnQnLFxyXG4gICAgICBzdG9yYWdlRW5jcnlwdGVkOiB0cnVlLFxyXG4gICAgICBiYWNrdXBSZXRlbnRpb246IGNkay5EdXJhdGlvbi5kYXlzKDcpLFxyXG4gICAgICBkZWxldGlvblByb3RlY3Rpb246IGZhbHNlLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBlbnZpcm9ubWVudCA9PT0gJ2RldicgPyBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZIDogY2RrLlJlbW92YWxQb2xpY3kuU05BUFNIT1QsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFQ1IgUmVwb3NpdG9yeVxyXG4gICAgY29uc3QgZWNyUmVwbyA9IGVjci5SZXBvc2l0b3J5LmZyb21SZXBvc2l0b3J5TmFtZShcclxuICAgICAgdGhpcyxcclxuICAgICAgJ0JhY2tlbmRSZXBvc2l0b3J5JyxcclxuICAgICAgYG1hdHVyaXR5LWJhY2tlbmQtJHtlbnZpcm9ubWVudH1gXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEVDUyBDbHVzdGVyXHJcbiAgICBjb25zdCBjbHVzdGVyID0gbmV3IGVjcy5DbHVzdGVyKHRoaXMsICdCYWNrZW5kQ2x1c3RlcicsIHtcclxuICAgICAgdnBjLFxyXG4gICAgICBjbHVzdGVyTmFtZTogYG1hdHVyaXR5LWJhY2tlbmQtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBjb250YWluZXJJbnNpZ2h0czogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENsb3VkV2F0Y2ggTG9nIEdyb3VwXHJcbiAgICBjb25zdCBsb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdCYWNrZW5kTG9nR3JvdXAnLCB7XHJcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9lY3MvbWF0dXJpdHktYmFja2VuZC0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLlRXT19XRUVLUyxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRhc2sgRGVmaW5pdGlvblxyXG4gICAgY29uc3QgdGFza0RlZmluaXRpb24gPSBuZXcgZWNzLkZhcmdhdGVUYXNrRGVmaW5pdGlvbih0aGlzLCAnQmFja2VuZFRhc2tEZWZpbml0aW9uJywge1xyXG4gICAgICBtZW1vcnlMaW1pdE1pQjogNTEyLFxyXG4gICAgICBjcHU6IDI1NixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFjY29yZGVyIGxlcyBwZXJtaXNzaW9ucyBwb3VyIGxpcmUgbGVzIHNlY3JldHNcclxuICAgIGRiU2VjcmV0LmdyYW50UmVhZCh0YXNrRGVmaW5pdGlvbi50YXNrUm9sZSk7XHJcbiAgICBqd3RTZWNyZXQuZ3JhbnRSZWFkKHRhc2tEZWZpbml0aW9uLnRhc2tSb2xlKTtcclxuXHJcbiAgICAvLyBDb250YWluZXIgRGVmaW5pdGlvblxyXG4gICAgY29uc3QgY29udGFpbmVyID0gdGFza0RlZmluaXRpb24uYWRkQ29udGFpbmVyKCdiYWNrZW5kJywge1xyXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21FY3JSZXBvc2l0b3J5KGVjclJlcG8sICdsYXRlc3QnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxyXG4gICAgICAgIFBPUlQ6ICczMDAwJyxcclxuICAgICAgICBEQl9IT1NUOiBkYXRhYmFzZS5pbnN0YW5jZUVuZHBvaW50Lmhvc3RuYW1lLFxyXG4gICAgICAgIERCX1BPUlQ6ICczMzA2JyxcclxuICAgICAgICBEQl9OQU1FOiAnbWF0dXJpdHlfYXNzZXNzbWVudCcsXHJcbiAgICAgICAgRlJPTlRFTkRfVVJMOiBlbnZpcm9ubWVudCA9PT0gJ2RldicgXHJcbiAgICAgICAgICA/ICdodHRwczovL2Rldi1tYXR1cml0eS5lLWRzaW4uZnInIFxyXG4gICAgICAgICAgOiAnaHR0cHM6Ly9tYXR1cml0eS5lLWRzaW4uZnInLFxyXG4gICAgICAgIExPR19MRVZFTDogJ2luZm8nLFxyXG4gICAgICAgIERCX1BBU1NXT1JEX0ZBTExCQUNLOiBmYWxsYmFja0RiUGFzc3dvcmQgfHwgJycsXHJcbiAgICAgICAgRUNTX0VOQUJMRV9DT05UQUlORVJfTUVUQURBVEE6ICd0cnVlJyxcclxuICAgICAgfSxcclxuICAgICAgc2VjcmV0czoge1xyXG4gICAgICAgIERCX1VTRVI6IGVjcy5TZWNyZXQuZnJvbVNlY3JldHNNYW5hZ2VyKGRiU2VjcmV0LCAndXNlcm5hbWUnKSxcclxuICAgICAgICBEQl9QQVNTV09SRDogZWNzLlNlY3JldC5mcm9tU2VjcmV0c01hbmFnZXIoZGJTZWNyZXQsICdwYXNzd29yZCcpLFxyXG4gICAgICAgIEpXVF9TRUNSRVQ6IGVjcy5TZWNyZXQuZnJvbVNlY3JldHNNYW5hZ2VyKGp3dFNlY3JldCksXHJcbiAgICAgIH0sXHJcbiAgICAgIGxvZ2dpbmc6IGVjcy5Mb2dEcml2ZXJzLmF3c0xvZ3Moe1xyXG4gICAgICAgIGxvZ0dyb3VwLFxyXG4gICAgICAgIHN0cmVhbVByZWZpeDogJ2JhY2tlbmQnLFxyXG4gICAgICB9KSxcclxuICAgICAgaGVhbHRoQ2hlY2s6IHtcclxuICAgICAgICBjb21tYW5kOiBbJ0NNRC1TSEVMTCcsICdjdXJsIC1mIGh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9oZWFsdGggfHwgZXhpdCAxJ10sXHJcbiAgICAgICAgaW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcclxuICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXHJcbiAgICAgICAgcmV0cmllczogMyxcclxuICAgICAgICBzdGFydFBlcmlvZDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzAwKSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnRhaW5lci5hZGRQb3J0TWFwcGluZ3Moe1xyXG4gICAgICBjb250YWluZXJQb3J0OiAzMDAwLFxyXG4gICAgICBwcm90b2NvbDogZWNzLlByb3RvY29sLlRDUCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXIgYXZlYyBGYXJnYXRlIFNlcnZpY2VcclxuICAgIGNvbnN0IGZhcmdhdGVTZXJ2aWNlID0gbmV3IGVjc1BhdHRlcm5zLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VkRmFyZ2F0ZVNlcnZpY2UoXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgICdCYWNrZW5kU2VydmljZScsXHJcbiAgICAgIHtcclxuICAgICAgICBjbHVzdGVyLFxyXG4gICAgICAgIHRhc2tEZWZpbml0aW9uLFxyXG4gICAgICAgIHNlcnZpY2VOYW1lOiBgbWF0dXJpdHktYmFja2VuZC0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgICAgZGVzaXJlZENvdW50OiBlbnZpcm9ubWVudCA9PT0gJ2RldicgPyAxIDogMixcclxuICAgICAgICBhc3NpZ25QdWJsaWNJcDogZmFsc2UsXHJcbiAgICAgICAgc2VjdXJpdHlHcm91cHM6IFthcHBTZWN1cml0eUdyb3VwXSxcclxuICAgICAgICBkb21haW5OYW1lOiBgYXBpLSR7ZW52aXJvbm1lbnR9LmRldi1tYXR1cml0eS5lLWRzaW4uZnJgLFxyXG4gICAgICAgIGRvbWFpblpvbmU6IGhvc3RlZFpvbmUsXHJcbiAgICAgICAgY2VydGlmaWNhdGU6IGNlcnRpZmljYXRlLFxyXG4gICAgICAgIHByb3RvY29sOiBlbGJ2Mi5BcHBsaWNhdGlvblByb3RvY29sLkhUVFBTLFxyXG4gICAgICAgIHJlZGlyZWN0SFRUUDogdHJ1ZSxcclxuICAgICAgICBsaXN0ZW5lclBvcnQ6IDQ0MyxcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBDb25maWd1cmF0aW9uIGR1IGhlYWx0aCBjaGVjayBwb3VyIGxlIGxvYWQgYmFsYW5jZXJcclxuICAgIGZhcmdhdGVTZXJ2aWNlLnRhcmdldEdyb3VwLmNvbmZpZ3VyZUhlYWx0aENoZWNrKHtcclxuICAgICAgcGF0aDogJy9oZWFsdGgnLFxyXG4gICAgICBwcm90b2NvbDogZWxidjIuUHJvdG9jb2wuSFRUUCxcclxuICAgICAgcG9ydDogJzMwMDAnLFxyXG4gICAgICBoZWFsdGh5VGhyZXNob2xkQ291bnQ6IDIsXHJcbiAgICAgIHVuaGVhbHRoeVRocmVzaG9sZENvdW50OiA1LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXHJcbiAgICAgIGludGVydmFsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBdXRvLXNjYWxpbmcgYmFzw6kgc3VyIGxlIENQVVxyXG4gICAgY29uc3Qgc2NhbGluZyA9IGZhcmdhdGVTZXJ2aWNlLnNlcnZpY2UuYXV0b1NjYWxlVGFza0NvdW50KHtcclxuICAgICAgbWluQ2FwYWNpdHk6IGVudmlyb25tZW50ID09PSAnZGV2JyA/IDEgOiAyLFxyXG4gICAgICBtYXhDYXBhY2l0eTogZW52aXJvbm1lbnQgPT09ICdkZXYnID8gMiA6IDEwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgc2NhbGluZy5zY2FsZU9uQ3B1VXRpbGl6YXRpb24oJ0NwdVNjYWxpbmcnLCB7XHJcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogNzAsXHJcbiAgICAgIHNjYWxlSW5Db29sZG93bjogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIHNjYWxlT3V0Q29vbGRvd246IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRW5yZWdpc3RyZW1lbnQgRE5TXHJcbiAgICB0aGlzLmFwaVVybCA9IGBodHRwczovL2FwaS0ke2Vudmlyb25tZW50fS5kZXYtbWF0dXJpdHkuZS1kc2luLmZyYDtcclxuICAgIHRoaXMuZGF0YWJhc2VFbmRwb2ludCA9IGRhdGFiYXNlLmluc3RhbmNlRW5kcG9pbnQuaG9zdG5hbWU7XHJcblxyXG4gICAgLy8gT3V0cHV0c1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaVVybCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYXBpVXJsLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBVUkwnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RhdGFiYXNlRW5kcG9pbnQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmRhdGFiYXNlRW5kcG9pbnQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUkRTIERhdGFiYXNlIEVuZHBvaW50JyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdFQ1JSZXBvc2l0b3J5VVJJJywge1xyXG4gICAgICB2YWx1ZTogZWNyUmVwby5yZXBvc2l0b3J5VXJpLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0VDUiBSZXBvc2l0b3J5IFVSSScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGF0YWJhc2VTZWNyZXRBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiBkYlNlY3JldC5zZWNyZXRBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRGF0YWJhc2UgU2VjcmV0IEFSTicsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2x1c3Rlck5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBjbHVzdGVyLmNsdXN0ZXJOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0VDUyBDbHVzdGVyIE5hbWUnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1NlcnZpY2VOYW1lJywge1xyXG4gICAgICB2YWx1ZTogZmFyZ2F0ZVNlcnZpY2Uuc2VydmljZS5zZXJ2aWNlTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdFQ1MgU2VydmljZSBOYW1lJyxcclxuICAgIH0pO1xyXG4gIH1cclxufSJdfQ==