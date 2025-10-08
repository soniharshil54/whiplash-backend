import { getRequiredEnvVar } from '../common';

export const devConfig = {
  environment: 'dev',
  deploymentConfig: {
    container: {
      instances: 1,
      memory: 512,
      cpu: 256,
    },
    targetGroup: {
      port: Number(getRequiredEnvVar('PORT')),
      healthCheck: {
        port: getRequiredEnvVar('PORT'),
        path: '/api/healthcheck',
        interval: 30,
        timeout: 10,
        healthyThreshold: 2,
        unhealthyThreshold: 2,
      },
    },
    service: {
      desiredCount: 1,
      minCount: 1,
      maxCount: 2,
    },
  },
  redis: {
    container: {
      memory: 512,
      cpu: 256,
    },
  },
};
