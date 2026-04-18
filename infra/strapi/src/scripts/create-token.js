'use strict';

/**
 * Script to create a Strapi API Token
 */

module.exports = async ({ strapi }) => {
  const tokenService = strapi.service('admin::api-token');
  const existing = await tokenService.list();
  const found = existing.find(t => t.name === 'BFF Token Full Access');
  
  if (found) {
    // Note: Strapi doesn't show the secret accessKey again after creation.
    // So if it exists, we might need to delete and recreate it to get the key.
    await tokenService.delete(found.id);
  }

  const token = await tokenService.create({
    name: 'BFF Token Full Access',
    description: 'Token for BFF',
    type: 'full-access',
    lifespan: null,
  });
  
  console.log('TOKEN_START:' + token.accessKey + ':TOKEN_END');
};
