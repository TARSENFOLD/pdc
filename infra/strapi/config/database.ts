import { parse, type ConnectionOptions } from 'pg-connection-string';
import { requireProductionEnv } from './env-validation';

type EnvGetter = {
  (key: string, defaultValue?: string): string;
  int: (key: string, defaultValue?: number) => number;
  bool: (key: string, defaultValue?: boolean) => boolean;
};

export default ({ env }: { env: EnvGetter }) => {
  requireProductionEnv(['DATABASE_URL']);

  const connectionUrl = env('DATABASE_URL');
  const config: Partial<ConnectionOptions> = connectionUrl ? parse(connectionUrl) : {};

  return {
    connection: {
      client: 'postgres',
      connection: {
        host: config.host || env('DATABASE_HOST', '127.0.0.1'),
        port: config.port || env.int('DATABASE_PORT', 5432),
        database: config.database || env('DATABASE_NAME', 'strapi'),
        user: config.user || env('DATABASE_USERNAME', 'strapi'),
        password: config.password || env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) || (connectionUrl && { rejectUnauthorized: false }),
      },
      useNullAsDefault: true,
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
  };
};
