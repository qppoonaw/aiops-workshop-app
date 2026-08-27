# Pipeline provisioning moved

The workshop's CI/CD is now provisioned by **`static/workshop-provision.yaml`** at the
repository root, which Workshop Studio deploys automatically into each participant
account.

## Why the change

The earlier `pipeline.yaml` in this folder used **AWS CodeCommit** as the source.
AWS closed CodeCommit to new AWS accounts, and Workshop Studio provisions fresh
accounts — so a CodeCommit-based pipeline would fail to deploy. The workshop now uses
an **S3 source** instead (AWS-only, always available), and participants work with the
application code as a zip in S3 rather than via git.

See:

- `static/workshop-provision.yaml` — the source bucket, CodeBuild, and S3-sourced CodePipeline.
- `sample-app/buildspec.yml` — the build/deploy steps (unchanged; source-type agnostic).
- `sample-app/template.yaml` — the application SAM stack deployed by the pipeline.
- Workshop content **Set Up Your Environment** and **Module 3** — how participants
  download the code from S3, edit it in Kiro, re-upload, and trigger a release.
