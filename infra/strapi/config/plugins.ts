import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  'users-permissions': {
    config: {
      ratelimit: {
        enabled: env('NODE_ENV') === 'production',
        interval: 60000,
        max: 10,
      },
    },
  },
});

export default config;
