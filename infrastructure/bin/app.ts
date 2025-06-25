#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BackendStack } from '../lib/backend-stack';

const app = new cdk.App();

// Configuration par environnement
const environments = {
  dev: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'eu-west-1',
    domainName: 'dev-maturity.e-dsin.fr',
    hostedZoneId: 'Z03909371P12UQ4UA00F0',
    hostedZoneName: 'dev-maturity.e-dsin.fr',
    certificateArn: 'arn:aws:acm:eu-west-1:637423285771:certificate/cf6a160d-877c-428c-bf0a-8a5f75faabfc',
  },
  prod: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'eu-west-1',
    domainName: 'e-dsin.fr',
    hostedZoneId: 'Z03909371P12UQ4UA00F0',
    hostedZoneName: 'e-dsin.fr',
    certificateArn: 'arn:aws:acm:eu-west-1:637423285771:certificate/cf6a160d-877c-bf0a-8a5f75faabfc',
  }
};

// Récupérer l'environnement
const envName = process.env.ENVIRONMENT || 'dev';
const config = environments[envName as keyof typeof environments];

if (!config) {
  throw new Error(`Environment ${envName} not found`);
}

if (!config.account) {
  throw new Error('CDK_DEFAULT_ACCOUNT environment variable is required');
}

console.log(`🚀 Deploying Maturity Backend - Environment: ${envName}`);
console.log(`📍 Region: ${config.region}`);
console.log(`🏗️ Account: ${config.account}`);

// Création du stack avec les nouveaux paramètres
new BackendStack(app, `MaturityBackend-${envName}`, {
  env: {
    account: config.account,
    region: config.region,
  },
  environment: envName,
  domainName: config.domainName,
  hostedZoneId: config.hostedZoneId,        
  hostedZoneName: config.hostedZoneName,   
  certificateArn: config.certificateArn,   
  description: `Maturity Assessment Backend Infrastructure - ${envName}`,
  tags: {
    Project: 'MaturityAssessment',
    Environment: envName,
    Owner: 'Mundo Archi',
  },
});

app.synth();