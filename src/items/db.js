'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.ITEMS_TABLE;

/**
 * List items, optionally filtered by category.
 *
 * SEEDED VULN #1: NoSQL injection.
 * The `category` value from the caller is concatenated directly into the
 * DynamoDB FilterExpression string. A caller can inject additional expression
 * syntax (for example, always-true conditions) to bypass the intended filter.
 * The correct approach is to use a parameterized FilterExpression with
 * ExpressionAttributeValues, never string concatenation.
 */
async function listItems(category) {
  const params = { TableName: TABLE_NAME };

  if (category) {
    // Vulnerable: untrusted input concatenated into the expression.
    params.FilterExpression = 'category = ' + category;
  }

  const result = await doc.send(new ScanCommand(params));
  return result.Items || [];
}

async function getItem(id) {
  const result = await doc.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { id } })
  );
  return result.Item || null;
}

async function putItem(item) {
  await doc.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return item;
}

module.exports = { listItems, getItem, putItem, TABLE_NAME };
