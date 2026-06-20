const { createHandler } = require('@app-core/server');
const deleteCreatorCard = require('../../services/creator-cards/delete-creator-card');
const CreatorCardMessages = require('../../messages/creator-card');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'delete',
  middlewares: [],
  async handler(rc, helpers) {
    const data = await deleteCreatorCard({
      slug: rc.params.slug,
      ...rc.body,
    });
    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardMessages.DELETED,
      data,
    };
  },
});
