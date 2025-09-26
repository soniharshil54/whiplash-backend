/* eslint-disable */
import { devConfig } from './dev';
import { stagingConfig } from './staging';
import { prodConfig } from './prod';
import { Config } from './types/config';

// Environment configuration mapping
type StackName = 'dev' | 'staging' | 'prod';

const configs: Record<StackName, Config> = {
  dev: devConfig,
  staging: stagingConfig,
  prod: prodConfig,
};

export function getConfigForStack(stackName: StackName) {
  const selectedConfig = configs[stackName];
  if (!selectedConfig) {
    throw new Error(`No configuration found for stack: ${stackName}`);
  }
  const configMap = selectedConfig;
  return configMap;
}
