'use strict';

const { randomUUID } = require('crypto');
const { json } = require('../common/response');
const { putItem } = require('./db');

/**
 * POST /items
 * Body: { "name": string, "category": string, "price": number }
 *
 * SEEDED VULN #4: Missing input validation.
 * The request body is parsed and written straight to the data store with no
 * validation of presence, type, or bounds. A caller can persist arbitrary,
 * malformed, or oversized attributes. A correct implementation validates each
 * field (required, type, length, numeric range) before persisting.
 */
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');

    // Vulnerable: no validation — whatever the caller sent is stored as-is.
    const item = {
      id: randomUUID(),
      name: body.name,
      category: body.category,
      price: body.price,
      createdAt: new Date().toISOString(),
    };

    await putItem(item);
    return json(201, { item });
  } catch (err) {
    console.error('createItem failed', err);
    return json(500, { message: 'Failed to create item' });
  }
};
