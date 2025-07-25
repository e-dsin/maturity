#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = require("aws-cdk-lib");
const backend_stack_1 = require("../lib/backend-stack");
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
const config = environments[envName];
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
new backend_stack_1.BackendStack(app, `MaturityBackend-${envName}`, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHVDQUFxQztBQUNyQyxtQ0FBbUM7QUFDbkMsd0RBQW9EO0FBRXBELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLGtDQUFrQztBQUNsQyxNQUFNLFlBQVksR0FBRztJQUNuQixHQUFHLEVBQUU7UUFDSCxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7UUFDeEMsTUFBTSxFQUFFLFdBQVc7UUFDbkIsVUFBVSxFQUFFLHdCQUF3QjtRQUNwQyxZQUFZLEVBQUUsdUJBQXVCO1FBQ3JDLGNBQWMsRUFBRSx3QkFBd0I7UUFDeEMsY0FBYyxFQUFFLHFGQUFxRjtLQUN0RztJQUNELElBQUksRUFBRTtRQUNKLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtRQUN4QyxNQUFNLEVBQUUsV0FBVztRQUNuQixVQUFVLEVBQUUsV0FBVztRQUN2QixZQUFZLEVBQUUsdUJBQXVCO1FBQ3JDLGNBQWMsRUFBRSxXQUFXO1FBQzNCLGNBQWMsRUFBRSxnRkFBZ0Y7S0FDakc7Q0FDRixDQUFDO0FBRUYsNEJBQTRCO0FBQzVCLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQztBQUNqRCxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsT0FBb0MsQ0FBQyxDQUFDO0FBRWxFLElBQUksQ0FBQyxNQUFNLEVBQUU7SUFDWCxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsT0FBTyxZQUFZLENBQUMsQ0FBQztDQUNyRDtBQUVELElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO0lBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsc0RBQXNELENBQUMsQ0FBQztDQUN6RTtBQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0RBQWdELE9BQU8sRUFBRSxDQUFDLENBQUM7QUFDdkUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0FBRTlDLGlEQUFpRDtBQUNqRCxJQUFJLDRCQUFZLENBQUMsR0FBRyxFQUFFLG1CQUFtQixPQUFPLEVBQUUsRUFBRTtJQUNsRCxHQUFHLEVBQUU7UUFDSCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87UUFDdkIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO0tBQ3RCO0lBQ0QsV0FBVyxFQUFFLE9BQU87SUFDcEIsVUFBVSxFQUFFLE1BQU0sQ0FBQyxVQUFVO0lBQzdCLFlBQVksRUFBRSxNQUFNLENBQUMsWUFBWTtJQUNqQyxjQUFjLEVBQUUsTUFBTSxDQUFDLGNBQWM7SUFDckMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxjQUFjO0lBQ3JDLFdBQVcsRUFBRSxnREFBZ0QsT0FBTyxFQUFFO0lBQ3RFLElBQUksRUFBRTtRQUNKLE9BQU8sRUFBRSxvQkFBb0I7UUFDN0IsV0FBVyxFQUFFLE9BQU87UUFDcEIsS0FBSyxFQUFFLGFBQWE7S0FDckI7Q0FDRixDQUFDLENBQUM7QUFFSCxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXHJcbmltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcclxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgQmFja2VuZFN0YWNrIH0gZnJvbSAnLi4vbGliL2JhY2tlbmQtc3RhY2snO1xyXG5cclxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcclxuXHJcbi8vIENvbmZpZ3VyYXRpb24gcGFyIGVudmlyb25uZW1lbnRcclxuY29uc3QgZW52aXJvbm1lbnRzID0ge1xyXG4gIGRldjoge1xyXG4gICAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcclxuICAgIHJlZ2lvbjogJ2V1LXdlc3QtMScsXHJcbiAgICBkb21haW5OYW1lOiAnZGV2LW1hdHVyaXR5LmUtZHNpbi5mcicsXHJcbiAgICBob3N0ZWRab25lSWQ6ICdaMDM5MDkzNzFQMTJVUTRVQTAwRjAnLFxyXG4gICAgaG9zdGVkWm9uZU5hbWU6ICdkZXYtbWF0dXJpdHkuZS1kc2luLmZyJyxcclxuICAgIGNlcnRpZmljYXRlQXJuOiAnYXJuOmF3czphY206ZXUtd2VzdC0xOjYzNzQyMzI4NTc3MTpjZXJ0aWZpY2F0ZS9jZjZhMTYwZC04NzdjLTQyOGMtYmYwYS04YTVmNzVmYWFiZmMnLFxyXG4gIH0sXHJcbiAgcHJvZDoge1xyXG4gICAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcclxuICAgIHJlZ2lvbjogJ2V1LXdlc3QtMScsXHJcbiAgICBkb21haW5OYW1lOiAnZS1kc2luLmZyJyxcclxuICAgIGhvc3RlZFpvbmVJZDogJ1owMzkwOTM3MVAxMlVRNFVBMDBGMCcsXHJcbiAgICBob3N0ZWRab25lTmFtZTogJ2UtZHNpbi5mcicsXHJcbiAgICBjZXJ0aWZpY2F0ZUFybjogJ2Fybjphd3M6YWNtOmV1LXdlc3QtMTo2Mzc0MjMyODU3NzE6Y2VydGlmaWNhdGUvY2Y2YTE2MGQtODc3Yy1iZjBhLThhNWY3NWZhYWJmYycsXHJcbiAgfVxyXG59O1xyXG5cclxuLy8gUsOpY3Vww6lyZXIgbCdlbnZpcm9ubmVtZW50XHJcbmNvbnN0IGVudk5hbWUgPSBwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCB8fCAnZGV2JztcclxuY29uc3QgY29uZmlnID0gZW52aXJvbm1lbnRzW2Vudk5hbWUgYXMga2V5b2YgdHlwZW9mIGVudmlyb25tZW50c107XHJcblxyXG5pZiAoIWNvbmZpZykge1xyXG4gIHRocm93IG5ldyBFcnJvcihgRW52aXJvbm1lbnQgJHtlbnZOYW1lfSBub3QgZm91bmRgKTtcclxufVxyXG5cclxuaWYgKCFjb25maWcuYWNjb3VudCkge1xyXG4gIHRocm93IG5ldyBFcnJvcignQ0RLX0RFRkFVTFRfQUNDT1VOVCBlbnZpcm9ubWVudCB2YXJpYWJsZSBpcyByZXF1aXJlZCcpO1xyXG59XHJcblxyXG5jb25zb2xlLmxvZyhg8J+agCBEZXBsb3lpbmcgTWF0dXJpdHkgQmFja2VuZCAtIEVudmlyb25tZW50OiAke2Vudk5hbWV9YCk7XHJcbmNvbnNvbGUubG9nKGDwn5ONIFJlZ2lvbjogJHtjb25maWcucmVnaW9ufWApO1xyXG5jb25zb2xlLmxvZyhg8J+Pl++4jyBBY2NvdW50OiAke2NvbmZpZy5hY2NvdW50fWApO1xyXG5cclxuLy8gQ3LDqWF0aW9uIGR1IHN0YWNrIGF2ZWMgbGVzIG5vdXZlYXV4IHBhcmFtw6h0cmVzXHJcbm5ldyBCYWNrZW5kU3RhY2soYXBwLCBgTWF0dXJpdHlCYWNrZW5kLSR7ZW52TmFtZX1gLCB7XHJcbiAgZW52OiB7XHJcbiAgICBhY2NvdW50OiBjb25maWcuYWNjb3VudCxcclxuICAgIHJlZ2lvbjogY29uZmlnLnJlZ2lvbixcclxuICB9LFxyXG4gIGVudmlyb25tZW50OiBlbnZOYW1lLFxyXG4gIGRvbWFpbk5hbWU6IGNvbmZpZy5kb21haW5OYW1lLFxyXG4gIGhvc3RlZFpvbmVJZDogY29uZmlnLmhvc3RlZFpvbmVJZCwgICAgICAgIFxyXG4gIGhvc3RlZFpvbmVOYW1lOiBjb25maWcuaG9zdGVkWm9uZU5hbWUsICAgXHJcbiAgY2VydGlmaWNhdGVBcm46IGNvbmZpZy5jZXJ0aWZpY2F0ZUFybiwgICBcclxuICBkZXNjcmlwdGlvbjogYE1hdHVyaXR5IEFzc2Vzc21lbnQgQmFja2VuZCBJbmZyYXN0cnVjdHVyZSAtICR7ZW52TmFtZX1gLFxyXG4gIHRhZ3M6IHtcclxuICAgIFByb2plY3Q6ICdNYXR1cml0eUFzc2Vzc21lbnQnLFxyXG4gICAgRW52aXJvbm1lbnQ6IGVudk5hbWUsXHJcbiAgICBPd25lcjogJ011bmRvIEFyY2hpJyxcclxuICB9LFxyXG59KTtcclxuXHJcbmFwcC5zeW50aCgpOyJdfQ==