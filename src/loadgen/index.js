'use strict';

/**
 * Load generator (workshop glue — not a native agent feature).
 *
 * Triggered by EventBridge on a schedule (e.g., every 1 minute). Each
 * invocation sends a burst of requests to GET /items so CloudWatch shows a
 * steady baseline of traffic. When the bad release is deployed, these same
 * requests start returning HTTP 500, producing a clear error-rate spike for
 * the DevOps Agent to investigate.
 *
 * Uses the global fetch available in the Node.js 20 Lambda runtime.
 */

const API_BASE_URL = (process.env.API_BASE_URL || '').replace(/\/$/, '');
const REQUESTS_PER_RUN = Number(process.env.REQUESTS_PER_RUN || 20);

exports.handler = async () => {
  if (!API_BASE_URL) {
    console.warn('API_BASE_URL not set; skipping load generation.');
    return { sent: 0 };
  }

  const url = `${API_BASE_URL}/items`;
  let ok = 0;
  let failed = 0;

  const results = await Promise.allSettled(
    Array.from({ length: REQUESTS_PER_RUN }, () => fetch(url))
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.ok) {
      ok += 1;
    } else {
      failed += 1;
    }
  }

  console.log(
    JSON.stringify({ target: url, requests: REQUESTS_PER_RUN, ok, failed })
  );
  return { sent: REQUESTS_PER_RUN, ok, failed };
};
