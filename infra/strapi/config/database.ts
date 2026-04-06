export default ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DATABASE_HOST', 'postgres'),
      port: env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME', 'pdc_strapi'),
      user: env('DATABASE_USERNAME', 'pdc'),
      password: env('DATABASE_PASSWORD', 'pdc_dev_password'),
      ssl: false,
    },
    useNullAsDefault: true,
  },
});
