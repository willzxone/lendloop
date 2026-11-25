#!/usr/bin/env bash
# Imports the LendLoop workflows and the local Mailpit SMTP credential into the
# running n8n container, publishes all three, then restarts n8n so the webhook
# and schedule are registered. The error workflow has to be published too:
# n8n 2.x refuses to run an unpublished error workflow.
#
# Safe to run again: the files carry fixed ids, so a re-import overwrites the
# same workflows instead of creating copies.
set -euo pipefail
cd "$(dirname "$0")/.."

run() { docker compose exec -T n8n n8n "$@"; }

echo "Importing credential (local Mailpit, no secret)..."
run import:credentials --input=/import/credentials/mailpit-smtp.json

echo "Importing workflows..."
run import:workflow --separate --input=/import/workflows

echo "Publishing workflows..."
run publish:workflow --id=lendloopNotify01
run publish:workflow --id=lendloopRemind01
run publish:workflow --id=lendloopErrors01

echo "Restarting n8n..."
docker compose restart n8n
for _ in $(seq 1 30); do
  if curl -fsS http://localhost:5678/healthz >/dev/null 2>&1; then
    echo "n8n is up: http://localhost:5678 (Mailpit inbox: http://localhost:8025)"
    exit 0
  fi
  sleep 2
done
echo "n8n did not come back within 60 s; check: docker compose logs n8n" >&2
exit 1
