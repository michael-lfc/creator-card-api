const { throwAppError, ERROR_STATUS_CODE_MAPPING } = require('@app-core/errors');

// Register custom business-rule codes into the framework's
// own HTTP status mapping table so it resolves them correctly
ERROR_STATUS_CODE_MAPPING.SL02 = 400;
ERROR_STATUS_CODE_MAPPING.AC01 = 400;
ERROR_STATUS_CODE_MAPPING.AC05 = 400;
ERROR_STATUS_CODE_MAPPING.NF01 = 404;
ERROR_STATUS_CODE_MAPPING.NF02 = 404;
ERROR_STATUS_CODE_MAPPING.AC03 = 403;
ERROR_STATUS_CODE_MAPPING.AC04 = 403;

/**
 * Throws a business-rule error with a custom code and correct HTTP status.
 * @param {string} message - Human readable message
 * @param {string} code - Custom error code e.g. 'NF01'
 */
function throwBusinessError(message, code) {
  throwAppError(message, code);
}

module.exports = throwBusinessError;
