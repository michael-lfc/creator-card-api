const validator = require('@app-core/validator');
const { appLogger } = require('@app-core/logger');
// const CreatorCardMessages = require('@app/messages/creator-card');
const CreatorCardMessages = require('../../messages/creator-card');
const CreatorCardRepo = require('../../repository/creator-cards');
const throwBusinessError = require('./throw-business-error');

const spec = `root { // Retrieve creator card
  slug string<trim|minLength:1>
  access_code? string<trim>
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
    created: raw.created,
    updated: raw.updated,
    deleted: raw.deleted !== 0 ? raw.deleted : null,
    // access_code intentionally omitted
  };
}

async function getCreatorCard(serviceData) {
  let response;

  const data = validator.validate(serviceData, parsedSpec);

  try {
    // Rule 1: card exists and is not deleted?
    // paranoid automatically filters deleted records
    const card = await CreatorCardRepo.findOne({
      query: { slug: data.slug },
    });

    if (!card) {
      throwBusinessError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
    }

    // Rule 2: draft check
    if (card.status === 'draft') {
      throwBusinessError(CreatorCardMessages.CARD_IS_DRAFT, 'NF02');
    }

    // Rules 3 & 4: private access
    if (card.access_type === 'private') {
      if (!data.access_code) {
        throwBusinessError(CreatorCardMessages.PRIVATE_CARD_NO_CODE, 'AC03');
      }
      if (data.access_code !== card.access_code) {
        throwBusinessError(CreatorCardMessages.INVALID_ACCESS_CODE, 'AC04');
      }
    }

    response = serializeCard(card);
  } catch (error) {
    appLogger.errorX(error, 'get-creator-card-error');
    throw error;
  }

  return response;
}

module.exports = getCreatorCard;
