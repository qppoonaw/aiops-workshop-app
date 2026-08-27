# AIOps Workshop — Sample Application Asset

A cost-optimized, 3-tier **serverless** web application used as the hands-on target for the AIOps Pipeline Workshop. This is a **reusable asset**: deploy it into a workshop account, run the pipeline, and drive the Security Agent / DevOps Agent / Kiro loop against it.

> ⚠️ **Intentionally vulnerable — do NOT use in production.** This application ships with **deliberately seeded security vulnerabilities** and a **deliberately broken "bad release" variant** so the AWS Security Agent and DevOps Agent have concrete, safe issues to find during the workshop. See [Seeded security vulnerabilities](#seeded-security-vulnerabilities-intentional) and [Good vs bad release](#good-vs-bad-release-the-fault) below. Never reuse this code as a starting point for real services.

> This repository is the standalone app asset used by the [AIOps Pipeline Workshop](https://github.com/qppoonaw). It contains the deployable application (`buildspec.yml`, `template.yaml`, `src/`, `frontend/`). The workshop *guide* (Workshop Studio content) lives separately.

## Architecture

| Tier | Component | Purpose |
|------|-----------|---------|
| Presentation | Amazon S3 + CloudFront, Amazon API Gateway (HTTP API) | Static frontend + API entry point |
| Application | AWS Lambda (Node.js 20) | Items API business logic |
| Data | Amazon DynamoDB (on-demand) | Item persistence |

Supporting components (workshop glue):

- **Load generator** — a Lambda on an EventBridge schedule that calls the API so CloudWatch shows steady baseline traffic.
- **RCA sink** — a DynamoDB table + Lambda (Function URL) that stores and serves the RCA so Kiro can fetch it in Module 3.
- **X-Ray** active tracing + CloudWatch logs/metrics on all functions.

## Directory layout

```
.
├── README.md                  <-- this file
├── package.json               <-- Node deps + scripts for the API
├── template.yaml              <-- SAM template: full application stack
├── buildspec.yml              <-- CodeBuild build/package steps
├── src/
│   ├── items/
│   │   ├── list.js            <-- GET  /items  (healthy hot-path handler)
│   │   ├── list.bad.js        <-- GET  /items  (bad-release fault variant)
│   │   ├── get.js             <-- GET  /items/{id}
│   │   ├── create.js          <-- POST /items   (contains seeded vulns)
│   │   ├── db.js              <-- DynamoDB data layer (contains seeded vulns)
│   │   └── RELEASE_VARIANTS.md <-- how the good/bad release swap works
│   ├── common/
│   │   └── response.js        <-- shared HTTP response helper (contains seeded vulns)
│   ├── loadgen/
│   │   └── index.js           <-- scheduled load generator
│   └── rca/
│       └── index.js           <-- RCA sink (POST store / GET fetch)
└── frontend/
    ├── index.html             <-- minimal single-page UI
    ├── app.js                 <-- calls the items API
    └── config.js              <-- generated at build time with the deployed API URL
```

> **CI/CD is not in this repo.** The pipeline (S3-sourced CodePipeline + CodeBuild) is provisioned by the workshop's `static/workshop-provision.yaml` in the workshop content repository — see `pipeline/README.md`. The old `pipeline/pipeline.yaml` (CodeCommit-based) was removed because CodeCommit is closed to new AWS accounts.

## Seeded security vulnerabilities (intentional)

The application ships with **four deliberate vulnerabilities** so the AWS Security Agent returns clear, predictable findings in Module 1. They are marked in-code with `// SEEDED VULN:` comments.

| # | Vulnerability | Location |
|---|---------------|----------|
| 1 | NoSQL injection — unvalidated input into a DynamoDB filter expression | `src/items/db.js` |
| 2 | Hardcoded secret — API key committed in source | `src/common/response.js` |
| 3 | Overly permissive CORS — `Access-Control-Allow-Origin: *` | `src/common/response.js` |
| 4 | Missing input validation on the create path | `src/items/create.js` |

> **Note:** In a real project these would never be committed. They exist here only to give the Security Agent something concrete and safe to find and remediate during the workshop.

## Good vs bad release (the fault)

The "break" in Module 2 is shipped as a **bad release** through the pipeline. The default fault is a **hot-path code-throw**: the list handler dereferences a value that is always undefined after the bad release, so every `GET /items` returns HTTP 500. This produces an immediate, unmistakable error-rate spike in CloudWatch for the DevOps Agent to investigate.

The fault is controlled by the `RELEASE_VARIANT` build-time flag (`good` | `bad`), documented in `buildspec.yml`. A **config-fault alternative** (pointing the app at a non-existent DynamoDB table via an environment variable) is documented there as well.

## Local build

```bash
npm install
npm run build      # sam build
npm run deploy      # sam deploy --guided (first time)
```

## Pre-baked CI/CD

The workshop's CI/CD is provisioned by **`static/workshop-provision.yaml`** at the repo root (deployed automatically by Workshop Studio via the `contentspec.yaml` `infrastructure` block). It creates:

- An **S3 source bucket** (versioned) holding the app source zip (`source/app-source.zip`). No CodeCommit/Git — CodeCommit is closed to new AWS accounts.
- A **CodeBuild** project that runs `buildspec.yml` (installs SAM, selects the release variant, `sam build` + `sam deploy`, then generates `frontend/config.js` and syncs the frontend to S3).
- A two-stage **CodePipeline**: `Source` (S3 object) → `BuildAndDeploy` (CodeBuild). Uploading a new source zip auto-triggers the pipeline.

**Shipping the bad release (Module 2):** set the CodeBuild project's `RELEASE_VARIANT` env var to `bad` and run the pipeline. The build swaps in the faulty handler and deploys it. To recover (Module 3), fix `src/items/list.js`, set `RELEASE_VARIANT` back to `good`, and upload the fixed source zip (which re-runs the pipeline).

Deploy order in a workshop account: Workshop Studio deploys `static/workshop-provision.yaml`, the bootstrap Lambda seeds `source/app-source.zip` from the WS assets bucket, and the pipeline runs `buildspec.yml` which deploys `template.yaml`.

## Repackaging the source zip (IMPORTANT)

Workshop Studio uploads everything under the **`assets/`** folder (not `static/`) to the event assets bucket and exposes it via the `{{.AssetsBucketName}}` / `{{.AssetsBucketPrefix}}` magic variables. The `assets/` folder is **gitignored** — it is the local S3-Assets staging area. So the app source must be staged as **`assets/app-source.zip`**, and because it is gitignored it is **not committed**; you (or whoever builds the content) must regenerate it before uploading/rebuilding the workshop.

Whenever you change anything in `sample-app/` — and before building the workshop content — regenerate the zip:

```bash
python scripts/build-app-source-zip.py
```

This writes `assets/app-source.zip`, packaging `sample-app/` with `buildspec.yml`, `template.yaml`, `src/`, and `frontend/` at the **archive root**, using forward-slash paths (Linux-safe for CodeBuild). Do **not** build it with PowerShell `Compress-Archive` — it writes backslash paths that break on Linux.

