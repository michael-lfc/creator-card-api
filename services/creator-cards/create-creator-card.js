const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const { randomBytes } = require('@app-core/randomness');
const CreatorCardMessages = require('../../messages/creator-card');
const CreatorCardRepo = require('../../repository/creator-cards');
const throwBusinessError = require('./throw-business-error');

// ---------------------------------------------------------------------------
// Validation spec
// ---------------------------------------------------------------------------
const spec = `root { // Creator Card creation
  title string<trim|minLength:3|maxLength:100>
  description? string<trim|maxLength:500>
  slug? string<trim|minLength:5|maxLength:50>
  creator_reference string<length:20>
  links[]? {
    title string<trim|minLength:1|maxLength:100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|minLength:3|maxLength:100>
      description? string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<trim|length:6>
}`;

const parsedSpec = validator.parse(spec);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidUrl(url) {
  return url.startsWith('http://') || url.startsWith('https://');
}

function isValidSlugChars(str) {
  const allowed = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
  for (let i = 0; i < str.length; i++) {
    if (allowed.indexOf(str[i]) === -1) return false;
  }
  return true;
}

function isAlphanumeric(str) {
  const allowed = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < str.length; i++) {
    if (allowed.indexOf(str[i]) === -1) return false;
  }
  return true;
}

function generateSlugFromTitle(title) {
  const lower = title.toLowerCase();
  let result = '';
  let prevWasSpace = false;
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    const isSpace = ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
    if (isSpace) {
      if (!prevWasSpace) result += '-';
      prevWasSpace = true;
    } else {
      prevWasSpace = false;
      const allowed = 'abcdefghijklmnopqrstuvwxyz0123456789-_';
      if (allowed.indexOf(ch) !== -1) result += ch;
    }
  }
  return result;
}

function randomSuffix() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const hex = randomBytes(12);
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    suffix += chars[byte % chars.length];
  }
  return suffix;
}

function serializeCard(doc, includeAccessCode = false) {
  const raw = doc._doc || doc;
  const card = {
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
  };
  if (includeAccessCode) {
    card.access_code = raw.access_code || null;
  }
  return card;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

async function createCreatorCard(serviceData) {
  let response;

  const data = validator.validate(serviceData, parsedSpec);

  try {
    // 1. Validate link URLs
    if (data.links && data.links.length > 0) {
      for (let i = 0; i < data.links.length; i++) {
        if (!isValidUrl(data.links[i].url)) {
          throwAppError('Each link URL must start with http:// or https://', ERROR_CODE.INVLDDATA);
        }
      }
    }

    // 2. Validate rate amounts are positive integers
    if (data.service_rates && data.service_rates.rates) {
      for (let i = 0; i < data.service_rates.rates.length; i++) {
        const { amount } = data.service_rates.rates[i];
        if (!Number.isInteger(amount) || amount < 1) {
          throwAppError('Each rate amount must be a positive integer', ERROR_CODE.INVLDDATA);
        }
      }
    }

    // 3. Validate slug characters if provided
    if (data.slug && !isValidSlugChars(data.slug)) {
      throwAppError(
        'Slug may only contain letters, numbers, hyphens and underscores',
        ERROR_CODE.INVLDDATA
      );
    }

    // 4. access_code / access_type business rules
    const effectiveAccessType = data.access_type || 'public';

    if (effectiveAccessType === 'private' && !data.access_code) {
      throwBusinessError(CreatorCardMessages.ACCESS_CODE_REQUIRED, 'AC01');
    }

    if (effectiveAccessType !== 'private' && data.access_code) {
      throwBusinessError(CreatorCardMessages.ACCESS_CODE_NOT_ALLOWED, 'AC05');
    }

    if (data.access_code && !isAlphanumeric(data.access_code)) {
      throwAppError('access_code must be exactly 6 alphanumeric characters', ERROR_CODE.INVLDDATA);
    }

    // 5. Slug resolution
    let slug;

    if (data.slug) {
      const existing = await CreatorCardRepo.findOne({
        query: { slug: data.slug },
      });
      if (existing) throwBusinessError(CreatorCardMessages.SLUG_TAKEN, 'SL02');
      slug = data.slug;
    } else {
      slug = generateSlugFromTitle(data.title);

      if (slug.length < 5) {
        slug = `${slug}-${randomSuffix()}`;
      } else {
        const existing = await CreatorCardRepo.findOne({
          query: { slug },
        });
        if (existing) slug = `${slug}-${randomSuffix()}`;
      }

      // Rare collision retry
      const stillExists = await CreatorCardRepo.findOne({
        query: { slug },
      });
      if (stillExists) {
        slug = `${generateSlugFromTitle(data.title)}-${randomSuffix()}`;
      }
    }

    // 6. Persist
    const now = Date.now();
    const cardDoc = await CreatorCardRepo.create({
      title: data.title,
      description: data.description || null,
      slug,
      creator_reference: data.creator_reference,
      links: data.links || [],
      service_rates: data.service_rates || null,
      status: data.status,
      access_type: effectiveAccessType,
      access_code: data.access_code || null,
    });

    response = serializeCard({ ...cardDoc, created: now, updated: now }, true);
  } catch (error) {
    appLogger.errorX(error, 'create-creator-card-error');
    throw error;
  }

  return response;
}
module.exports = createCreatorCard;
