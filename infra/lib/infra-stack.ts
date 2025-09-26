import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Config } from '../lib/config/types/config';

import { nameResource } from './common';
import { createAlbFargateService } from './resources/services/alb-fargate';

interface InfraStackProps extends cdk.StackProps {
  stage: string;
  projectName: string;
  config: Config;
  imageTag?: string; // pass via -c imageTag=... or props
}

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const { stage, projectName, config } = props;
    const name    = nameResource(projectName, stage);
    const account = cdk.Stack.of(this).account;
    const region  = cdk.Stack.of(this).region;

    const imageTag = props.imageTag ?? this.node.tryGetContext('imageTag') ?? 'latest';
    const desired  = config.deploymentConfig.service.desiredCount;

    cdk.Tags.of(this).add('Project', projectName);
    cdk.Tags.of(this).add('Stage', stage);

    // ─────────────────────────────────────────────────────────────────────────────
    // Read common-infra exports from SSM
    const vpcId   = ssm.StringParameter.valueForStringParameter(this, `/${projectName}/${stage}/vpcId`);
    const privIds = ssm.StringParameter.valueForStringParameter(this, `/${projectName}/${stage}/privateSubnetIds`).split(',');
    const privRt  = ssm.StringParameter.valueForStringParameter(this, `/${projectName}/${stage}/privateSubnetRouteTableIds`).split(',');
    const clusterName = ssm.StringParameter.valueForStringParameter(this, `/${projectName}/${stage}/clusterName`);
    const repoName    = ssm.StringParameter.valueForStringParameter(this, `/${projectName}/${stage}/ecrBackendRepoName`);
    const bucketName  = ssm.StringParameter.valueForStringParameter(this, `/${projectName}/${stage}/s3BucketName`);

    console.log('─────────────────────────────────────────────────────────────────────────────');
    console.log(`Account: ${account}`);
    console.log(`Region:  ${region}`);
    console.log(`VPC:     ${vpcId}`);
    console.log(`Cluster: ${clusterName}`);
    console.log(`ECR:     ${repoName}`);
    console.log(`S3:      ${bucketName}`);
    console.log(`Image:   ${account}.dkr.ecr.${region}.amazonaws.com/${repoName}:${imageTag}`);
    console.log(`privIds: ${privIds}`);
    console.log(`privRt:  ${privRt}`);
    console.log('─────────────────────────────────────────────────────────────────────────────');
    // ─────────────────────────────────────────────────────────────────────────────
    // Import VPC & ECS Cluster
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcId });   // CDK queries AWS
    const cluster = ecs.Cluster.fromClusterAttributes(this, 'Cluster', {
      clusterName,
      vpc,
      securityGroups: [],
    });

    // ECR repo and image
    const repo  = ecr.Repository.fromRepositoryName(this, 'BackendRepo', repoName);
    const image = ecs.ContainerImage.fromEcrRepository(repo, imageTag);

    // S3 bucket (shared from common-infra)
    const bucket = s3.Bucket.fromBucketName(this, 'AppBucket', bucketName);

    // ─────────────────────────────────────────────────────────────────────────────
    // Service (pattern creates its own ALB)
    const svc = createAlbFargateService(this, name('BackendService'), {
      cluster,
      cpu: config.deploymentConfig.container.cpu,
      memoryLimitMiB: config.deploymentConfig.container.memory,
      desiredCount: desired,
      image,
      containerName: name('backend-container'),
      containerPort: config.deploymentConfig.targetGroup.port,
      serviceName: name('backend-service'),
      repositoryName: repoName, // so helper can grant ECR pull on executionRole
      healthCheck: config.deploymentConfig.targetGroup.healthCheck,
      publicLoadBalancer: true,
    });

    // Grant S3 read/write to TASK ROLE (app code)
    bucket.grantReadWrite(svc.taskDefinition.taskRole);

    // If you want env vars:
    // svc.taskDefinition.defaultContainer?.addEnvironment('S3_BUCKET', bucketName);

    new cdk.CfnOutput(this, name('BackendURL'), {
      value: `http://${svc.loadBalancer.loadBalancerDnsName}`,
    });
  }
}
