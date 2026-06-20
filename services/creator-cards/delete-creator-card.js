const validator = require('@app-core/validator');
const { appLogger } = require('@app-core/logger');
// const CreatorCardMessages = require('@app/messages/creator-card');
const CreatorCardMessages = require('../../messages/creator-card');
const CreatorCardRepo = require('../../repository/creator-cards');
const throwBusinessError = require('./throw-business-error');

const spec = `root { // Delete creator card
  slug string<trim|minLength:1>
  creator_reference string<length:20>
}`;

const parsedSpec = validator.parse(spec);

function serializeCard(doc) {
  const raw = doc._doc || doc;
  return {
    id: raw._id,
    title: raw.title,
    description: raw.description || null,
    slug: raw.slug,
    creator_reference: raw.creator_reference,
    links: raw.links || [],
    service_rates: raw.service_rates || null,
    status: raw.status,
    access_type: raw.access_type,
    access_code: raw.access_code || null,
    created: raw.created,
    updated: raw.updated,
    deleted: raw.deleted !== 0 ? raw.deleted : null,
  };
}

async function deleteCreatorCard(serviceData) {
  let response;

  const data = validator.validate(serviceData, parsedSpec);

  try {
    const card = await CreatorCardRepo.findOne({
      query: { slug: data.slug },
    });

    appLogger.info({ card }, 'delete-card-debug');

    if (!card) {
      throwBusinessError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
    }

    const deletedAt = Date.now();

    await CreatorCardRepo.updateOne({
      query: { _id: card._id },
      updateValues: {
        deleted: deletedAt,
        updated: deletedAt,
      },
    });

    const deletedCard = { ...card, created: card.created, updated: deletedAt, deleted: deletedAt };

    response = serializeCard(deletedCard);
  } catch (error) {
    appLogger.errorX(error, 'delete-creator-card-error');
    throw error;
  }

  return response;
}

module.exports = deleteCreatorCard;
