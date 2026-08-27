'use strict';

/**
 * RCA sink (workshop glue — not a native agent feature).
 *
 * Exposed via a Lambda Function URL so Kiro can call it directly:
 *   POST /   body: { "id"?: string, "rootCause": string, "recommendation": string, ... }
 *            -> stores the RCA, returns { id }
 *   GET  /            -> returns the most recent RCA
 *   GET  /?id=<id>    -> returns a specific RCA by id
 *
 * In Module 2, Kiro POSTs the DevOps Agent's RCA here. In Module 3, Kiro GETs
 * it back to drive the code fix.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.RCA_TABLE;

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

async function storeRca(payload) {
  const now = new Date().toISOString();
  const record = {
    id: payload.id || randomUUID(),
    createdAt: now,
    rootCause: payload.rootCause || null,
    recommendation: payload.recommendation || null,
    // Keep the full RCA text/JSON the agent produced, whatever shape it is.
    detail: payload.detail ?? payload,
  };
  await doc.send(new PutCommand({ TableName: TABLE_NAME, Item: record }));
  return record;
}

async function getRcaById(id) {
  const res = await doc.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { id } })
  );
  return res.Item || null;
}

async function getLatestRca() {
  // Small table (one workshop's worth of RCAs) — a scan + sort is fine here.
  const res = await doc.send(new ScanCommand({ TableName: TABLE_NAME }));
  const items = res.Items || [];
  if (!items.length) return null;
  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return items[0];
}

exports.handler = async (event) => {
  const method =
    (event.requestContext &&
      event.requestContext.http &&
      event.requestContext.http.method) ||
    'GET';

  try {
    if (method === 'POST') {
      const payload = JSON.parse(event.body || '{}');
      const record = await storeRca(payload);
      return response(201, { id: record.id, createdAt: record.createdAt });
    }

    if (method === 'GET') {
      const id =
        event.queryStringParameters && event.queryStringParameters.id;
      const rca = id ? await getRcaById(id) : await getLatestRca();
      if (!rca) {
        return response(404, { message: 'No RCA found' });
      }
      return response(200, { rca });
    }

    return response(405, { message: `Method ${method} not allowed` });
  } catch (err) {
    console.error('RCA sink failed', err);
    return response(500, { message: 'RCA sink error' });
  }
};
