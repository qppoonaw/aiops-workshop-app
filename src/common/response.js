'use strict';

// SEEDED VULN #2: Hardcoded secret committed in source.
// A real service would read this from AWS Secrets Manager or SSM Parameter Store
// at runtime and never store it in the repository.
const API_KEY = 'sk_live_51H8xWorkshopHardcodedSecretDoNotUse';

// SEEDED VULN #3: Overly permissive CORS.
// Access-Control-Allow-Origin '*' allows any origin to call the API. A real
// service would restrict this to the known frontend origin.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

/**
 * Build a standard JSON HTTP API response with CORS headers.
 * @param {number} statusCode
 * @param {object} body
 */
function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
    body: JSON.stringify(body),
  };
}

module.exports = { json, CORS_HEADERS, API_KEY };
