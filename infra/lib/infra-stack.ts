import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';

import { nameResource } from './common';
import { createAlbFargateService } from './resources/services/alb-fargate';
import { associateWebAcl } from './resources/security/waf';

interface InfraStackProps extends cdk.StackProps {
  stage: string;
  projectName: string;
  config: {
    cpu: number;
    memory: number;
    backendDesiredCount?: number;
    frontendDesiredCount?: number;
  };
}

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const { stage, projectName, config } = props;
    const name    = nameResource(projectName, stage);
    const account = cdk.Stack.of(this).account;
    const region  = cdk.Stack.of(this).region;

    cdk.Tags.of(this).add('Project', projectName);
    cdk.Tags.of(this).add('Stage', stage);

    const backendDesired  = config.backendDesiredCount  ?? 1;
    // ─────────────────────────────────────────────────────────────────────────────
    // Backend
    const backend = createAlbFargateService(this, name('BackendService'), {
      cluster,
      cpu: config.cpu,
      memoryLimitMiB: config.memory,
      desiredCount: backendDesired,
      image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'), // TODO: Replace with real image
      containerName: name('backend-container'),
      containerPort: 3000,
      serviceName: name('backend-service'),
      repositoryName: `${projectName}-${stage}-backend`,
      healthCheck: { path: '/api/healthcheck', healthyHttpCodes: '200-399' },
    });

    associateWebAcl(this, name('BackendWafAssoc'), wafAcl, backend.loadBalancer);

    // Atlas Private Endpoint
    const atlasServiceNameParam = new cdk.CfnParameter(this, 'AtlasServiceName', {
      type: 'String',
      description: 'Atlas PrivateLink service name from Atlas console',
    });

    // Outputs
    new cdk.CfnOutput(this, name('BackendURL'),  { value: backend.loadBalancer.loadBalancerDnsName });
  }
}
