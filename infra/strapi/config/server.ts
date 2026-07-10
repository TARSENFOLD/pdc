import type { Core } from '@strapi/strapi';
import { requireProductionCsvEnv } from './env-validation';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => {
  requireProductionCsvEnv('APP_KEYS', 4);

  return {
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    app: {
      keys: env.array('APP_KEYS'),
    },
  };
};

export default config;
