import { getRequiredEnvVar } from "../common";

export const stagingConfig = {
  environment: 'staging',
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
        healthyThreshold: 3,
        unhealthyThreshold: 3,
      },
    },
    service: {
      desiredCount: 2,
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
