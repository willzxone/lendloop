#!/bin/sh
# Boots the LendLoop automation host on a Hugging Face Docker Space.
#
# The Space has no persistent disk, so every boot starts from what's in the
# image: the three workflows, the SMTP credential and the environment. n8n's
# database, execution history and the "already emailed" list start empty after
# a restart. Convex keeps the outbox, so nothing is lost: an event that was in
# flight gets retried.
set -eu

missing=""
for name in LENDLOOP_HMAC_SECRET N8N_ENCRYPTION_KEY LENDLOOP_CONVEX_SITE_URL LENDLOOP_APP_URL MP_UI_AUTH; do
  eval "value=\${$name:-}"
  [ -n "$value" ] || missing="$missing $name"
done
if [ -n "$missing" ]; then
  echo "Missing:$missing. Add them in the Space settings under Variables and secrets." >&2
  exit 1
fi

# Hugging Face sets SPACE_HOST, e.g. someone-lendloop-n8n.hf.space
export N8N_WEBHOOK_URL="https://${SPACE_HOST:-localhost}/"

echo "Starting proxy and Mailpit..."
node /lendloop/proxy.mjs &
mailpit \
  --listen 127.0.0.1:8025 \
  --smtp 127.0.0.1:1025 \
  --webroot /mail/ \
  --database /tmp/mailpit.db \
  --max 500 \
  --smtp-auth-accept-any \
  --smtp-auth-allow-insecure &

echo "Importing the SMTP credential and workflows..."
n8n import:credentials --input=/lendloop/credentials/mailpit-smtp.json
n8n import:workflow --separate --input=/lendloop/workflows

# The error workflow must be published too: n8n 2.x won't run an unpublished
# error workflow.
for id in lendloopNotify01 lendloopRemind01 lendloopErrors01; do
  n8n publish:workflow --id="$id"
done

echo "Starting n8n..."
exec n8n start
