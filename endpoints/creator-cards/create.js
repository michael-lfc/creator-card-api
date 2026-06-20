const { createHandler } = require('@app-core/server');
const createCreatorCard = require('../../services/creator-cards/create-creator-card');
const CreatorCardMessages = require('../../messages/creator-card');

module.exports = createHandler({
  path: '/creator-cards',
  method: 'post',
  middlewares: [],
  async handler(rc, helpers) {
    const data = await createCreatorCard({ ...rc.body });
    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardMessages.CREATED,
      data,
    };
  },
});
