#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';
import { getConfigForStack } from '../lib/config';

const app = new cdk.App();

console.log('process.env.PROJECT_NAME', process.env.PROJECT);
console.log('process.env.STAGE', process.env.STAGE);
console.log('process.env.VERSION', process.env.VERSION);

const projectName = 'whiplash-backend';
const stage = app.node.tryGetContext('stage') || 'dev';
const config = getConfigForStack(stage);
if (!config) throw new Error(`No config found for stage: ${stage}`);

new InfraStack(app, stage, {
  stackName: `${projectName}-${stage}`, // Option A: short id, explicit stackName
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  stage,
  projectName,
  config,
});
