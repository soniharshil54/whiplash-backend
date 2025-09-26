export const nameResource = (project: string, stage: string) => (base: string) =>
  `${project}-${stage}-${base}`;