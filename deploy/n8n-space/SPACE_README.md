---
title: LendLoop automation
sdk: docker
app_port: 7860
pinned: false
short_description: n8n workflows behind the LendLoop demo
---

# LendLoop automation host

n8n 2.49.6 with the three LendLoop workflows (loan notifications, daily
overdue reminders, failure reporting) and Mailpit as a fake mail server.
Source and setup: https://github.com/willzxone/lendloop (`deploy/n8n-space/`).

Public paths: `POST /webhook/lendloop-notify` (HMAC-signed by Convex),
`GET /healthz`, and `/mail/` (Mailpit inbox, password protected). The n8n
editor is not exposed.
