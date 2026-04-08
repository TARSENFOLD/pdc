export default ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DATABASE_HOST', 'postgres'),
      port: env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME', 'pdc_strapi'),
      user: env('DATABASE_USERNAME', 'pdc'),
      password: env('DATABASE_PASSWORD'),
      ssl: env.bool('DATABASE_SSL', false),
    },
    useNullAsDefault: true,
    pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 20) },
    acquireConnectionTimeout: env.int('DATABASE_ACQUIRE_TIMEOUT', 10000),
  },
});
