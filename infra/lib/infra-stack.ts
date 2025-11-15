import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sd from 'aws-cdk-lib/aws-servicediscovery';

import { createRedisFargateService } from './resources/services/redis-fargate';
import { Config } from '../lib/config/types/config';
import { CONTAINER_ENV_VARS } from '../lib/config/constants';

import { nameResource, getEnvVars } from './common';
import { createAlbFargateService } from './resources/services/alb-fargate';

interface InfraStackProps extends cdk.StackProps {
  stage: string;
  projectName: string;
  config: Config;
  imageTag: string;
  baseProjectName: string;
  appType: 'backend' | 'frontend';
}

// ... existing imports and interface ...

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const { stage, projectName, config, baseProjectName, appType } = props;
    const name    = nameResource(projectName, stage);
    const account = cdk.Stack.of(this).account;
    const region  = cdk.Stack.of(this).region;

    cdk.Tags.of(this).add('project', projectName);
    cdk.Tags.of(this).add('stack', stage);
    cdk.Tags.of(this).add('baseProject', baseProjectName);

    const imageTag = props.imageTag;
    const desired  = config.deploymentConfig.service.desiredCount;
    const min  = config.deploymentConfig.service.minCount;
    const max  = config.deploymentConfig.service.maxCount;

    // ... existing SSM reads and imports ...

    const vpcId = ssm.StringParameter.valueFromLookup(this, `/${baseProjectName}/${stage}/vpcId`);
    const clusterName = ssm.StringParameter.valueForStringParameter(this, `/${baseProjectName}/${stage}/clusterName`);
    const repoName    = ssm.StringParameter.valueForStringParameter(this, `/${baseProjectName}/${stage}/${appType}EcrRepoName`);
    const bucketName  = ssm.StringParameter.valueForStringParameter(this, `/${baseProjectName}/${stage}/s3BucketName`);
    const namespaceId   = ssm.StringParameter.valueForStringParameter(this, `/${baseProjectName}/${stage}/cloudMapNamespaceId`);
    const namespaceName = ssm.StringParameter.valueForStringParameter(this, `/${baseProjectName}/${stage}/cloudMapNamespaceName`);
    const namespaceArn  = ssm.StringParameter.valueForStringParameter(this, `/${baseProjectName}/${stage}/cloudMapNamespaceArn`);

    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcId });
    const cluster = ecs.Cluster.fromClusterAttributes(this, 'Cluster', {
      clusterName,
      vpc,
      securityGroups: [],
    });

    const repo  = ecr.Repository.fromRepositoryName(this, `${appType}Repo`, repoName);
    const image = ecs.ContainerImage.fromEcrRepository(repo, imageTag);
    const bucket = s3.Bucket.fromBucketName(this, 'AppBucket', bucketName);

    // ... service creation ...

    const result = createAlbFargateService(this, name(`${appType}Service`), {
      cluster,
      cpu: config.deploymentConfig.container.cpu,
      memoryLimitMiB: config.deploymentConfig.container.memory,
      desiredCount: desired,
      minCount: min,
      maxCount: max,
      image,
      containerName: name(`${appType}-container`),
      containerPort: config.deploymentConfig.targetGroup.port,
      serviceName: name(`${appType}-service`),
      repositoryName: repoName,
      healthCheck: config.deploymentConfig.targetGroup.healthCheck,
      publicLoadBalancer: true,
      environment: getEnvVars(CONTAINER_ENV_VARS),
    });

    const svc = result.service;

    bucket.grantReadWrite(svc.taskDefinition.taskRole);
    const backendServiceSg = svc.service.connections.securityGroups[0];

    const cloudMapNs = sd.PrivateDnsNamespace.fromPrivateDnsNamespaceAttributes(this, name('ImportedNs'), {
      namespaceId,
      namespaceName,
      namespaceArn,
    });

    const redis = createRedisFargateService(this, name('redis'), {
      cluster,
      vpc,
      serviceName: name('redis-service'),
      dnsServiceName: name('redis'),
      namespace: cloudMapNs,
      desiredCount: 1,
      allowFrom: [backendServiceSg],
      cpu: config.redis.container.cpu,
      memoryMiB: config.redis.container.memory,
    });

    svc.taskDefinition.defaultContainer?.addEnvironment('REDIS_HOST', redis.host);
    svc.taskDefinition.defaultContainer?.addEnvironment('REDIS_PORT', String(redis.port));
    svc.taskDefinition.defaultContainer?.addEnvironment('AWS_S3_BUCKET_NAME', String(bucketName));

    // ─────────────────────────────────────────────────────────────────────────────
    // Outputs (conditional based on TLS enabled)
    // ─────────────────────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, name(`${appType}URL`), {
      value: cdk.Fn.conditionIf(
        result.tlsEnabledCondition.logicalId,  // 👈 Use condition's logicalId
        `https://${result.domainNameParam.valueAsString}`,
        `http://${svc.loadBalancer.loadBalancerDnsName}`
      ).toString(),
      description: `${appType} URL (HTTPS if TLS enabled, otherwise HTTP ALB DNS)`,
    });

    new cdk.CfnOutput(this, name(`${appType}AlbDns`), {
      value: cdk.Fn.conditionIf(
        result.tlsEnabledCondition.logicalId,  // 👈 Use condition's logicalId
        `${result.domainNameParam.valueAsString}`,
        `${svc.loadBalancer.loadBalancerDnsName}`
      ).toString(),
      description: `${appType} ALB DNS name`,
    });

    new cdk.CfnOutput(this, name(`${appType}AlbAwsDns`), {
      value: svc.loadBalancer.loadBalancerDnsName,
      description: `${appType} ALB DNS name`,
    });

    new cdk.CfnOutput(this, name(`${appType}CustomDomain`), {
      value: cdk.Fn.conditionIf(
        result.tlsEnabledCondition.logicalId,  // 👈 Use condition's logicalId
        result.domainNameParam.valueAsString,
        'N/A - TLS not enabled'
      ).toString(),
      description: `${appType} custom domain (only if TLS enabled)`,
    });
  }
}
