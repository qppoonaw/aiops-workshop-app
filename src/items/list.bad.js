'use strict';

const { json } = require('../common/response');
const { listItems } = require('./db');

/**
 * BAD RELEASE VARIANT of GET /items.
 *
 * This is the fault that Module 2 ships through the pipeline. It looks like a
 * small, plausible change a developer might make — reading a nested property
 * from an object that is undefined on this code path — but it throws on EVERY
 * request because `event.requestContext.authorizer` is not present for this
 * public endpoint.
 *
 * Effect: every GET /items returns HTTP 500. Because the load generator calls
 * this endpoint continuously, CloudWatch shows an immediate error-rate spike,
 * giving the DevOps Agent a clear signal to investigate.
 *
 * The fix (Module 3) is to remove this unguarded dereference (or guard it),
 * restoring the handler to the healthy behavior in list.js.
 */
exports.handler = async (event) => {
  try {
    // FAULT: unguarded access to a property that is always undefined here.
    // Throws: "Cannot read properties of undefined (reading 'claims')".
    const tenantId = event.requestContext.authorizer.claims.tenantId;
    console.log('Serving items for tenant', tenantId);

    const category =
      event.queryStringParameters && event.queryStringParameters.category;

    const items = await listItems(category);
    return json(200, { items, count: items.length });
  } catch (err) {
    console.error('listItems failed', err);
    return json(500, { message: 'Failed to list items' });
  }
};
