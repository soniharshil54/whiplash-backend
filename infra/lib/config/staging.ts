export const stagingConfig = {
  environment: 'staging',
  deploymentConfig: {
    container: {
      // imageRepositoryName: 'whiplash-backend',
      instances: 1,
      memory: 512,
      cpu: 256,
    },
    targetGroup: {
      port: 3000,
      healthCheck: {
        port: '3000',
        path: '/health-check',
        interval: 30,
        timeout: 10,
        healthyThreshold: 3,
        unhealthyThreshold: 3,
      },
    },
    service: {
      desiredCount: 2,
    },
  },
};
