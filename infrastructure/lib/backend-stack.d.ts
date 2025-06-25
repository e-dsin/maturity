import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface BackendStackProps extends cdk.StackProps {
    environment: string;
    domainName: string;
    hostedZoneId: string;
    hostedZoneName: string;
    certificateArn: string;
    fallbackDbPassword?: string;
}
export declare class BackendStack extends cdk.Stack {
    readonly apiUrl: string;
    readonly databaseEndpoint: string;
    constructor(scope: Construct, id: string, props: BackendStackProps);
}
