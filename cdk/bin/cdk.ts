#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EducateFirstAiStack } from '../lib/educate-first-ai-stack';

const app = new cdk.App();
new EducateFirstAiStack(app, 'EducateFirstAiStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});