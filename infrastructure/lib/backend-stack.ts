import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface BackendStackProps extends cdk.StackProps {
  environment: string;
  domainName: string;
  hostedZoneId: string;
  hostedZoneName: string;
  certificateArn: string;
  fallbackDbPassword?: string; // New optional parameter for fallback password
}

export class BackendStack extends cdk.Stack {
  public readonly apiUrl: string;
  public readonly databaseEndpoint: string;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
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
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic'
    );

    // App peut recevoir du trafic de l'ALB
    appSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(3000),
      'Allow traffic from ALB'
    );

    // DB peut recevoir du trafic de l'app
    dbSecurityGroup.addIngressRule(
      appSecurityGroup,
      ec2.Port.tcp(3306),
      'Allow MySQL traffic from application'
    );

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
    const ecrRepo = ecr.Repository.fromRepositoryName(
      this,
      'BackendRepository',
      `maturity-backend-${environment}`
    );

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
    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      'BackendService',
      {
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
      }
    );

    // // Configuration du health check pour le load balancer
    fargateService.targetGroup.configureHealthCheck({
      path: '/health',
      protocol: elbv2.Protocol.HTTP,
      port: '3000',
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 5,
      timeout: cdk.Duration.seconds(10),
      interval: cdk.Duration.seconds(30),
    });

    // // Auto-scaling basé sur le CPU
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