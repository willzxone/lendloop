# LendLoop automation host for a Hugging Face Docker Space.
# Built by deploy/n8n-space/push.sh, which copies the workflows next to this file.
FROM axllent/mailpit:v1.34.0 AS mailpit

FROM docker.n8n.io/n8nio/n8n:2.49.6

COPY --from=mailpit /mailpit /usr/local/bin/mailpit
COPY --chown=node:node start.sh proxy.mjs /lendloop/
COPY --chown=node:node credentials /lendloop/credentials
COPY --chown=node:node workflows /lendloop/workflows

ENV N8N_LISTEN_ADDRESS=127.0.0.1 \
    N8N_PORT=5678 \
    N8N_PROTOCOL=https \
    N8N_BLOCK_ENV_ACCESS_IN_NODE=false \
    NODE_FUNCTION_ALLOW_BUILTIN=crypto \
    GENERIC_TIMEZONE=UTC \
    TZ=UTC \
    N8N_DIAGNOSTICS_ENABLED=false \
    N8N_PERSONALIZATION_ENABLED=false \
    N8N_VERSION_NOTIFICATIONS_ENABLED=false \
    EXECUTIONS_DATA_PRUNE=true \
    EXECUTIONS_DATA_MAX_AGE=168 \
    LENDLOOP_MAIL_FROM="LendLoop <no-reply@lendloop.local>" \
    PORT=7860

EXPOSE 7860
ENTRYPOINT ["/sbin/tini", "--", "/bin/sh", "/lendloop/start.sh"]
