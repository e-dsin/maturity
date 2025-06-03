#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MaturityAppStack } from '../lib/maturity-stack';

const app = new cdk.App();

// Récupérer le certificateArn du contexte
const certificateArn = app.node.tryGetContext('certificateArn');

console.log('CertificateArn from context:', certificateArn);

new MaturityAppStack(app, 'MaturityApp-Dev-V2', {
  environment: 'dev',
  domainName: 'dev-maturity.e-dsin.fr',
  certificateArn: certificateArn, // Passer le certificateArn explicitement
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'eu-west-3', // Votre région de déploiement
  },
});

// Stack de production si nécessaire
new MaturityAppStack(app, 'MaturityApp-Prod', {
  environment: 'prod',
  domainName: 'maturity.e-dsin.fr', // Domaine de prod
  // certificateArn pour prod à définir
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'eu-west-3',
  },
});