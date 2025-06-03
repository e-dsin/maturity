"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaturityAppStack = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const cloudfront = require("aws-cdk-lib/aws-cloudfront");
const origins = require("aws-cdk-lib/aws-cloudfront-origins");
const ec2 = require("aws-cdk-lib/aws-ec2");
const acm = require("aws-cdk-lib/aws-certificatemanager");
const route53 = require("aws-cdk-lib/aws-route53");
const targets = require("aws-cdk-lib/aws-route53-targets");
class MaturityAppStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { environment, domainName } = props;
        // VPC simple pour commencer
        const vpc = new ec2.Vpc(this, 'MaturityVPC', {
            maxAzs: 2,
            natGateways: 1,
        });
        // Zone DNS - référencer la zone Route 53 créée
        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
            domainName: 'dev-maturity.e-dsin.fr',
        });
        // Certificat SSL (obligatoirement en us-east-1 pour CloudFront)
        const certificate = new acm.Certificate(this, 'Certificate', {
            domainName: domainName,
            validation: acm.CertificateValidation.fromDns(hostedZone),
        });
        // S3 pour le frontend
        const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
            bucketName: `maturity-frontend-${environment}-${this.account}`,
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'index.html',
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Origin Access Identity (ancienne méthode, mais fonctionne)
        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
            comment: `OAI for ${frontendBucket.bucketName}`,
        });
        // Donner les permissions à CloudFront pour accéder au bucket
        frontendBucket.grantRead(originAccessIdentity);
        // CloudFront Distribution
        const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
            domainNames: [domainName],
            certificate: certificate,
            defaultRootObject: 'index.html',
            defaultBehavior: {
                origin: new origins.S3Origin(frontendBucket, {
                    originAccessIdentity: originAccessIdentity,
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            },
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                },
            ],
        });
        // Enregistrement DNS A pointant vers CloudFront
        new route53.ARecord(this, 'AliasRecord', {
            zone: hostedZone,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
        });
        // Outputs
        new cdk.CfnOutput(this, 'FrontendURL', {
            value: `https://${domainName}`,
            description: 'Frontend URL avec domaine personnalisé',
        });
        new cdk.CfnOutput(this, 'FrontendBucketName', {
            value: frontendBucket.bucketName,
            description: 'S3 Bucket Name',
        });
        new cdk.CfnOutput(this, 'CloudFrontURL', {
            value: `https://${distribution.distributionDomainName}`,
            description: 'URL CloudFront directe (backup)',
        });
    }
}
exports.MaturityAppStack = MaturityAppStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0dXJpdHktc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYXR1cml0eS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMseUNBQXlDO0FBQ3pDLHlEQUF5RDtBQUN6RCw4REFBOEQ7QUFFOUQsMkNBQTJDO0FBRzNDLDBEQUEwRDtBQUMxRCxtREFBbUQ7QUFDbkQsMkRBQTJEO0FBTzNELE1BQWEsZ0JBQWlCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDN0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE0QjtRQUNwRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUUxQyw0QkFBNEI7UUFDNUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDM0MsTUFBTSxFQUFFLENBQUM7WUFDVCxXQUFXLEVBQUUsQ0FBQztTQUNmLENBQUMsQ0FBQztRQUVILCtDQUErQztRQUNuRCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ25FLFVBQVUsRUFBRSx3QkFBd0I7U0FDckMsQ0FBQyxDQUFDO1FBRUgsZ0VBQWdFO1FBQ2hFLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQzNELFVBQVUsRUFBRSxVQUFVO1lBQ3RCLFVBQVUsRUFBRSxHQUFHLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztTQUMxRCxDQUFDLENBQUM7UUFFQyxzQkFBc0I7UUFDdEIsTUFBTSxjQUFjLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUMzRCxVQUFVLEVBQUUscUJBQXFCLFdBQVcsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQzlELG9CQUFvQixFQUFFLFlBQVk7WUFDbEMsb0JBQW9CLEVBQUUsWUFBWTtZQUNsQyxnQkFBZ0IsRUFBRSxLQUFLO1lBQ3ZCLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87U0FDekMsQ0FBQyxDQUFDO1FBRUgsNkRBQTZEO1FBQzdELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxVQUFVLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtZQUM1RSxPQUFPLEVBQUUsV0FBVyxjQUFjLENBQUMsVUFBVSxFQUFFO1NBQ2hELENBQUMsQ0FBQztRQUVILDZEQUE2RDtRQUM3RCxjQUFjLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFL0MsMEJBQTBCO1FBQzNCLE1BQU0sWUFBWSxHQUFHLElBQUksVUFBVSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDOUUsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDO1lBQ3pCLFdBQVcsRUFBRSxXQUFXO1lBQ3hCLGlCQUFpQixFQUFFLFlBQVk7WUFDL0IsZUFBZSxFQUFFO2dCQUNiLE1BQU0sRUFBRSxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFO29CQUM3QyxvQkFBb0IsRUFBRSxvQkFBb0I7aUJBQ3pDLENBQUM7Z0JBQ0Ysb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQjtnQkFDdkUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsaUJBQWlCO2FBQ3hEO1lBQ0QsY0FBYyxFQUFFO2dCQUNaO29CQUNBLFVBQVUsRUFBRSxHQUFHO29CQUNmLGtCQUFrQixFQUFFLEdBQUc7b0JBQ3ZCLGdCQUFnQixFQUFFLGFBQWE7aUJBQzlCO2FBQ0o7U0FDQSxDQUFDLENBQUM7UUFFSCxnREFBZ0Q7UUFDaEQsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDekMsSUFBSSxFQUFFLFVBQVU7WUFDaEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUNsQyxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FDN0M7U0FDQSxDQUFDLENBQUM7UUFFSCxVQUFVO1FBQ1YsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDdkMsS0FBSyxFQUFFLFdBQVcsVUFBVSxFQUFFO1lBQzlCLFdBQVcsRUFBRSx3Q0FBd0M7U0FDcEQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUM1QyxLQUFLLEVBQUUsY0FBYyxDQUFDLFVBQVU7WUFDaEMsV0FBVyxFQUFFLGdCQUFnQjtTQUM5QixDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN6QyxLQUFLLEVBQUUsV0FBVyxZQUFZLENBQUMsc0JBQXNCLEVBQUU7WUFDdkQsV0FBVyxFQUFFLGlDQUFpQztTQUM3QyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF0RkQsNENBc0ZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcclxuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XHJcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmltcG9ydCAqIGFzIGFjbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJztcclxuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XHJcbmltcG9ydCAqIGFzIHRhcmdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMtdGFyZ2V0cyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1hdHVyaXR5QXBwU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICBlbnZpcm9ubWVudDogc3RyaW5nO1xyXG4gIGRvbWFpbk5hbWU6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdHVyaXR5QXBwU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBNYXR1cml0eUFwcFN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIGNvbnN0IHsgZW52aXJvbm1lbnQsIGRvbWFpbk5hbWUgfSA9IHByb3BzO1xyXG5cclxuICAgIC8vIFZQQyBzaW1wbGUgcG91ciBjb21tZW5jZXJcclxuICAgIGNvbnN0IHZwYyA9IG5ldyBlYzIuVnBjKHRoaXMsICdNYXR1cml0eVZQQycsIHtcclxuICAgICAgbWF4QXpzOiAyLFxyXG4gICAgICBuYXRHYXRld2F5czogMSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFpvbmUgRE5TIC0gcsOpZsOpcmVuY2VyIGxhIHpvbmUgUm91dGUgNTMgY3LDqcOpZVxyXG5jb25zdCBob3N0ZWRab25lID0gcm91dGU1My5Ib3N0ZWRab25lLmZyb21Mb29rdXAodGhpcywgJ0hvc3RlZFpvbmUnLCB7XHJcbiAgZG9tYWluTmFtZTogJ2Rldi1tYXR1cml0eS5lLWRzaW4uZnInLFxyXG59KTtcclxuXHJcbi8vIENlcnRpZmljYXQgU1NMIChvYmxpZ2F0b2lyZW1lbnQgZW4gdXMtZWFzdC0xIHBvdXIgQ2xvdWRGcm9udClcclxuY29uc3QgY2VydGlmaWNhdGUgPSBuZXcgYWNtLkNlcnRpZmljYXRlKHRoaXMsICdDZXJ0aWZpY2F0ZScsIHtcclxuICBkb21haW5OYW1lOiBkb21haW5OYW1lLCAvLyBkZXYtbWF0dXJpdHkuZS1kc2luLmZyXHJcbiAgdmFsaWRhdGlvbjogYWNtLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKGhvc3RlZFpvbmUpLFxyXG59KTtcclxuXHJcbiAgICAvLyBTMyBwb3VyIGxlIGZyb250ZW5kXHJcbiAgICBjb25zdCBmcm9udGVuZEJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0Zyb250ZW5kQnVja2V0Jywge1xyXG4gICAgICBidWNrZXROYW1lOiBgbWF0dXJpdHktZnJvbnRlbmQtJHtlbnZpcm9ubWVudH0tJHt0aGlzLmFjY291bnR9YCxcclxuICAgICAgd2Vic2l0ZUluZGV4RG9jdW1lbnQ6ICdpbmRleC5odG1sJyxcclxuICAgICAgd2Vic2l0ZUVycm9yRG9jdW1lbnQ6ICdpbmRleC5odG1sJyxcclxuICAgICAgcHVibGljUmVhZEFjY2VzczogZmFsc2UsXHJcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPcmlnaW4gQWNjZXNzIElkZW50aXR5IChhbmNpZW5uZSBtw6l0aG9kZSwgbWFpcyBmb25jdGlvbm5lKVxyXG4gICAgY29uc3Qgb3JpZ2luQWNjZXNzSWRlbnRpdHkgPSBuZXcgY2xvdWRmcm9udC5PcmlnaW5BY2Nlc3NJZGVudGl0eSh0aGlzLCAnT0FJJywge1xyXG4gICAgICBjb21tZW50OiBgT0FJIGZvciAke2Zyb250ZW5kQnVja2V0LmJ1Y2tldE5hbWV9YCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIERvbm5lciBsZXMgcGVybWlzc2lvbnMgw6AgQ2xvdWRGcm9udCBwb3VyIGFjY8OpZGVyIGF1IGJ1Y2tldFxyXG4gICAgZnJvbnRlbmRCdWNrZXQuZ3JhbnRSZWFkKG9yaWdpbkFjY2Vzc0lkZW50aXR5KTtcclxuXHJcbiAgICAvLyBDbG91ZEZyb250IERpc3RyaWJ1dGlvblxyXG4gICBjb25zdCBkaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0Zyb250ZW5kRGlzdHJpYnV0aW9uJywge1xyXG4gICAgZG9tYWluTmFtZXM6IFtkb21haW5OYW1lXSwgLy8gZGV2LW1hdHVyaXR5LmUtZHNpbi5mclxyXG4gICAgY2VydGlmaWNhdGU6IGNlcnRpZmljYXRlLFxyXG4gICAgZGVmYXVsdFJvb3RPYmplY3Q6ICdpbmRleC5odG1sJyxcclxuICAgIGRlZmF1bHRCZWhhdmlvcjoge1xyXG4gICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4oZnJvbnRlbmRCdWNrZXQsIHtcclxuICAgICAgICBvcmlnaW5BY2Nlc3NJZGVudGl0eTogb3JpZ2luQWNjZXNzSWRlbnRpdHksXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXHJcbiAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXHJcbiAgICB9LFxyXG4gICAgZXJyb3JSZXNwb25zZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgaHR0cFN0YXR1czogNDA0LFxyXG4gICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxyXG4gICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgfSxcclxuICAgIF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFbnJlZ2lzdHJlbWVudCBETlMgQSBwb2ludGFudCB2ZXJzIENsb3VkRnJvbnRcclxuICAgIG5ldyByb3V0ZTUzLkFSZWNvcmQodGhpcywgJ0FsaWFzUmVjb3JkJywge1xyXG4gICAgem9uZTogaG9zdGVkWm9uZSxcclxuICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKFxyXG4gICAgICAgIG5ldyB0YXJnZXRzLkNsb3VkRnJvbnRUYXJnZXQoZGlzdHJpYnV0aW9uKVxyXG4gICAgKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE91dHB1dHNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGcm9udGVuZFVSTCcsIHtcclxuICAgIHZhbHVlOiBgaHR0cHM6Ly8ke2RvbWFpbk5hbWV9YCxcclxuICAgIGRlc2NyaXB0aW9uOiAnRnJvbnRlbmQgVVJMIGF2ZWMgZG9tYWluZSBwZXJzb25uYWxpc8OpJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGcm9udGVuZEJ1Y2tldE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBmcm9udGVuZEJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIEJ1Y2tldCBOYW1lJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbG91ZEZyb250VVJMJywge1xyXG4gICAgdmFsdWU6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9YCxcclxuICAgIGRlc2NyaXB0aW9uOiAnVVJMIENsb3VkRnJvbnQgZGlyZWN0ZSAoYmFja3VwKScsXHJcbiAgICB9KTtcclxuICB9XHJcbn0iXX0=