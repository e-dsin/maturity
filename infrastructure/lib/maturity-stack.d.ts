import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface MaturityAppStackProps extends cdk.StackProps {
    environment: string;
    domainName: string;
}
export declare class MaturityAppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: MaturityAppStackProps);
}
