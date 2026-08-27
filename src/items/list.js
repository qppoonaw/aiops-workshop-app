'use strict';

const { json } = require('../common/response');
const { listItems } = require('./db');

/**
 * GET /items
 * Optional query string: ?category=<value>
 *
 * NOTE (Module 2 fault target): this is the application's hot path — the load
 * generator calls it continuously, so a fault here produces an immediate,
 * clearly visible error-rate spike in CloudWatch. See list.bad.js for the
 * bad-release variant.
 */
exports.handler = async (event) => {
  try {
    const category =
      event.queryStringParameters && event.queryStringParameters.category;

    const items = await listItems(category);
    return json(200, { items, count: items.length });
  } catch (err) {
    console.error('listItems failed', err);
    return json(500, { message: 'Failed to list items' });
  }
};
