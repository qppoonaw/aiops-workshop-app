'use strict';

const { json } = require('../common/response');
const { getItem } = require('./db');

/**
 * GET /items/{id}
 */
exports.handler = async (event) => {
  try {
    const id = event.pathParameters && event.pathParameters.id;
    if (!id) {
      return json(400, { message: 'id is required' });
    }

    const item = await getItem(id);
    if (!item) {
      return json(404, { message: 'Item not found' });
    }
    return json(200, { item });
  } catch (err) {
    console.error('getItem failed', err);
    return json(500, { message: 'Failed to get item' });
  }
};
