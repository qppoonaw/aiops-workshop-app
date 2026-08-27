# Release variants — the "break" in Module 2

The workshop's incident is delivered as a **bad release** through the pipeline. The behavior is selected at build time by the `RELEASE_VARIANT` environment variable, read in `buildspec.yml`.

| `RELEASE_VARIANT` | Behavior | Handler used for `GET /items` |
|-------------------|----------|-------------------------------|
| `good` (default) | Healthy application | `list.js` |
| `bad` | Every `GET /items` returns HTTP 500 | `list.bad.js` |

## How the swap works

`GET /items` is the application's hot path (the load generator calls it continuously). The build copies the selected variant into the deployed handler file. In `buildspec.yml`:

```bash
if [ "$RELEASE_VARIANT" = "bad" ]; then
  cp src/items/list.bad.js src/items/list.js
fi
```

- **Good release:** `list.js` is used as-is — items are listed normally.
- **Bad release:** `list.bad.js` overwrites `list.js` before packaging, so the deployed function throws on every request.

The SAM template always points the `ListItems` function at `list.handler`; only the file contents change between variants. This keeps the infrastructure identical across releases — exactly the situation a real team faces when "only the code changed."

## The default fault: hot-path code-throw

`list.bad.js` dereferences `event.requestContext.authorizer.claims.tenantId`, which is undefined for this public endpoint. The handler throws, the catch block returns HTTP 500, and the error rate spikes immediately in CloudWatch.

**Why this fault:** it is deterministic (fails on 100% of requests), fast to surface (visible within a couple of minutes at load-generator cadence), realistic (a plausible "read the tenant from the token" change), and maps to a clean one-line fix in Module 3.

## Alternative fault: config / environment

If you prefer a configuration-driven incident instead of a code change, point the application at a non-existent DynamoDB table via an environment variable override on the `ListItems` function:

```
ITEMS_TABLE = does-not-exist-table
```

Every `GET /items` then fails with a DynamoDB `ResourceNotFoundException` (HTTP 500). The DevOps Agent's RCA points at the misconfigured table name, and the fix is to restore the correct value. Use this variant when you want to emphasize configuration/observability over code review.

> Only one fault should be active at a time. The default workshop flow uses the code-throw variant.
