const { createHandler } = require('@app-core/server');
const getCreatorCard = require('../../services/creator-cards/get-creator-card');
const CreatorCardMessages = require('../../messages/creator-card');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'get',
  middlewares: [],
  async handler(rc, helpers) {
    const data = await getCreatorCard({
      slug: rc.params.slug,
      access_code: rc.query.access_code || undefined,
    });
    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardMessages.RETRIEVED,
      data,
    };
  },
});
