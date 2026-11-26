#!/usr/bin/env bash
# Builds the Hugging Face Space folder and uploads it.
#
#   hf auth login                                   # once, with a write token
#   ./deploy/n8n-space/push.sh <hf-user>/lendloop-n8n
#
# The Space itself needs these settings (Settings -> Variables and secrets):
#   secrets:   LENDLOOP_HMAC_SECRET  same value as on the Convex deployment
#              N8N_ENCRYPTION_KEY    any long random string
#              MP_UI_AUTH            "user:password" for the Mailpit inbox
#   variables: LENDLOOP_CONVEX_SITE_URL  https://<deployment>.convex.site
#              LENDLOOP_APP_URL          the deployed app, e.g. https://lendloop.vercel.app
set -euo pipefail
cd "$(dirname "$0")/../.."

repo="${1:?usage: push.sh <hf-user>/<space-name>}"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

here=deploy/n8n-space
cp "$here/Dockerfile" "$here/start.sh" "$here/proxy.mjs" "$stage/"
cp "$here/SPACE_README.md" "$stage/README.md"
mkdir -p "$stage/credentials" "$stage/workflows"
cp "$here/mailpit-smtp.json" "$stage/credentials/"
cp n8n/workflows/*.json "$stage/workflows/"

hf repo create "$repo" --repo-type space --space-sdk docker --exist-ok
hf upload "$repo" "$stage" . --repo-type space --commit-message "Update LendLoop automation host"
echo "Uploaded. Build log: https://huggingface.co/spaces/$repo"
