process.env.NODE_ENV ??= 'test';
process.env.API_URL ??= 'http://localhost:3001';
process.env.FRONTEND_URL ??= 'http://localhost:5173';
process.env.STRAPI_URL ??= 'http://localhost:1337';
process.env.STRAPI_API_TOKEN ??= 'test-strapi-token';
process.env.JWT_SECRET ??= 'test-jwt-secret-for-ci-minimum-32-chars';
process.env.REDIS_URL ??= 'redis://localhost:6379';
