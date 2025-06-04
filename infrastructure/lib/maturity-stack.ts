import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';

//import Backend Stack
import { BackendStack } from './backend-stack';

export interface MaturityAppStackProps extends cdk.StackProps {
  environment: string;
  domainName: string;
  certificateArn?: string;
}

export class MaturityAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MaturityAppStackProps) {
    super(scope, id, props);

    const { environment, domainName, certificateArn } = props;

    // VPC simple pour commencer
    const vpc = new ec2.Vpc(this, 'MaturityVPC', {
      maxAzs: 2,
      natGateways: 1,
    });

    // Zone DNS - référencer la zone Route 53 créée
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: 'dev-maturity.e-dsin.fr',
    });

    // Certificat SSL - TOUJOURS utiliser le certificat us-east-1 pour dev
    let certificate: acm.ICertificate;
    
    console.log('=== DEBUG INFO ===');
    console.log('Environment:', environment);
    console.log('Domain Name:', domainName);
    console.log('Certificate ARN received:', certificateArn);
    console.log('Stack region:', this.region);
    console.log('Stack account:', this.account);
    console.log('==================');
    
    // FORCE l'utilisation du certificat us-east-1 pour dev
    if (environment === 'dev') {
      console.log('Using hardcoded certificate for dev environment');
      certificate = acm.Certificate.fromCertificateArn(
        this,
        'DevCertificate',
        'arn:aws:acm:us-east-1:637423285771:certificate/5c67fed5-1acc-418e-a2de-307a32f7db66'
      );
    } else {
      console.log('Creating new certificate for production');
      certificate = new acm.Certificate(this, 'Certificate', {
        domainName: domainName,
        validation: acm.CertificateValidation.fromDns(hostedZone),
      });
    }

    // S3 pour le frontend
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `maturity-frontend-${environment}-${this.account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true, // ✅ Vider automatiquement à la suppression
    });

    // Origin Access Identity (ancienne méthode, mais fonctionne)
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for ${frontendBucket.bucketName}`,
    });

    // Donner les permissions à CloudFront pour accéder au bucket
    frontendBucket.grantRead(originAccessIdentity);

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      domainNames: [domainName], // dev-maturity.e-dsin.fr
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
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
    });

    // Ajouter le backend
    const backendStack = new BackendStack(this, 'Backend', {
      environment,
      domainName: `api-${domainName}`,
      hostedZone,
      certificate,
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

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: certificate.certificateArn,
      description: 'Certificate ARN utilisé',
    });

    new cdk.CfnOutput(this, 'BackendApiUrl', {
      value: backendStack.apiUrl,
      description: 'Backend API URL pour le frontend',
    });
  }
}