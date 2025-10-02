import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sd from 'aws-cdk-lib/aws-servicediscovery';

export interface RedisFargateOptions {
  cluster: ecs.ICluster;
  vpc: ec2.IVpc;
  serviceName: string;         // e.g. name('redis-service')
  dnsServiceName: string;      // e.g. name('redis')
  namespace: sd.IPrivateDnsNamespace;
  cpu?: number;                // default 256
  memoryMiB?: number;          // default 512
  desiredCount?: number;       // default 1
  allowFrom?: ec2.ISecurityGroup[]; // who can talk to Redis:6379
}

export function createRedisFargateService(
  scope: Construct,
  id: string,
  opts: RedisFargateOptions
) {
  const cpu        = opts.cpu;
  const memoryMiB  = opts.memoryMiB;
  const desired    = opts.desiredCount;
  const namespace  = opts.namespace;

  // SG for Redis
  const redisSg = new ec2.SecurityGroup(scope, `${id}Sg`, {
    vpc: opts.vpc,
    allowAllOutbound: true,
    description: 'Security group for Redis',
  });

  // Task def
  const taskDef = new ecs.FargateTaskDefinition(scope, `${id}TaskDef`, {
    cpu,
    memoryLimitMiB: memoryMiB,
  });

  const container = taskDef.addContainer(`${id}Container`, {
    image: ecs.ContainerImage.fromRegistry('redis:8.2.1-alpine'),
    logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'redis' }),
    healthCheck: {
      command: ['CMD-SHELL', 'redis-cli ping || exit 1'],
      interval: cdk.Duration.seconds(10),
      timeout: cdk.Duration.seconds(5),
      retries: 3,
      startPeriod: cdk.Duration.seconds(15),
    },
  });

  container.addPortMappings({ containerPort: 6379, protocol: ecs.Protocol.TCP });

  // Service (no LB; Cloud Map for DNS)
  const service = new ecs.FargateService(scope, `${id}Svc`, {
    cluster: opts.cluster,
    taskDefinition: taskDef,
    assignPublicIp: false,
    desiredCount: desired,
    securityGroups: [redisSg],
    vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    serviceName: opts.serviceName, // e.g. "whiplash-dev-redis-service"
    cloudMapOptions: {
      name: opts.dnsServiceName, // e.g. "whiplash-dev-redis"
      cloudMapNamespace: namespace,
      dnsRecordType: sd.DnsRecordType.A,
      dnsTtl: cdk.Duration.seconds(10),
    },
    enableExecuteCommand: true,
    circuitBreaker: { rollback: true },
  });

  // Allow callers
  if (opts.allowFrom?.length) {
    for (const sg of opts.allowFrom) {
      redisSg.addIngressRule(sg, ec2.Port.tcp(6379), 'Allow backend to Redis');
    }
  }

  const fqdn = `${opts.dnsServiceName}.${opts.namespace.namespaceName}`;

  return {
    service,
    securityGroup: redisSg,
    // FQDN your backend should use:
    host: fqdn,
    port: 6379,
  };
}
