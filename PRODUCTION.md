# What I'd change for production

LendLoop as it stands is built to run locally and be read. Below is what I'd do before real people used it, roughly in priority order.

## Deployment and secrets

- **Hosting.** Put Convex on a cloud deployment (separate dev and prod), the Next.js app on Vercel or similar, and n8n on n8n Cloud or a self-hosted instance with Postgres, behind TLS. Production n8n should not use SQLite.
- **Secrets in n8n.** Stop reading the HMAC secret through `$env`. Use n8n's external secrets (Vault, AWS Secrets Manager, …) or a credential type the Code node can read, and set `N8N_BLOCK_ENV_ACCESS_IN_NODE=true` again so no workflow can read the whole environment. Run the task runners in external mode, which n8n 2.x already recommends.
- **Secret rotation.** Accept two HMAC secrets during a rotation window (verify against either, sign with the new one), so the secret can change without downtime or lost messages.
- **Separate secrets per direction.** Use one key for Convex → n8n and another for n8n → Convex, so a leak on one side can't forge requests the other way.
- **Clerk production instance** with its own keys and domain. `CLERK_JWT_ISSUER_DOMAIN` points at the production Frontend API.

## Email and notifications

- **A real provider** (Postmark, SES, Resend) with SPF, DKIM and DMARC set up, bounce and complaint webhooks, and suppression of addresses that bounce.
- **Unsubscribe and preferences.** Per-user settings for which emails they get. Reminders should stop after a few days and go to the lender instead.
- **Durable dedupe.** Move the "already sent" list from n8n static data into Convex. n8n would ask Convex to claim the `eventId` before sending, or the email provider's idempotency key would be set to the `eventId`. Then dedupe survives a workflow re-import, and two executions racing on the same event can't both send.
- **Queue mode.** Run n8n with Redis and workers, and have the webhook answer 202 straight away, sending the email after. The webhook then stays fast even when SMTP is slow, and Convex's 10 s timeout stops mattering.

## Data protection

- **Execution data in n8n.** It contains names and email addresses. Save only failed executions (`saveDataSuccessExecution: "none"`), keep them for a short time, and restrict who can open them.
- **Retention in Convex.** Delete or anonymise `automationEvents` and `reminders` after a set period (a scheduled Convex cron), and drop the error text even sooner.
- **Account deletion.** Handle Clerk's `user.deleted` webhook: anonymise the user row, decline open requests and remove their listings.
- **Audit log** of admin actions (role changes, removals, Trusted Lender changes): who, what, when.
- **Privacy notice** saying what is shared with whom (lender and borrower see a first name and last initial, emails go to n8n and the email provider).

## Abuse and limits

- **Rate limits** on mutations per user (for example with the Convex rate-limiter component). Today the only limit is 10 pending requests per borrower.
- **Moderation.** Listings are free text. Add a "report listing" button, and give admins a way to suspend a user, not just remove listings.
- **Network restrictions.** Restrict who can reach the n8n webhook: an IP allow-list or a private network between Convex and n8n where the hosting allows it. HMAC stays as the main check.

## Reliability and operations

- **Monitoring.** Alerts on: notifications stuck in `retrying` or `failed`, a missing daily reminder run (a dead-man's switch: alert if no write-back by 10:00), and n8n error workflow reports. Today these appear only on the admin page.
- **Reminder run size.** The overdue query takes up to 500 loans per run. With more, page through them (Convex pagination) and process them in batches.
- **Time zones.** Store each user's time zone. Dates are UTC now, so "overdue" and the 09:00 reminder are UTC-based.
- **Workflow versioning.** Keep the workflow JSON in git as now, but deploy it through CI (n8n CLI or API) rather than by hand, with a staging n8n to try changes first.
- **Backups** of the n8n database and a tested Convex export and restore.

## Code and product

- **Tests.** Add Playwright end-to-end tests for the main flows with a Clerk test instance, and run `npm test`, `typecheck`, `lint` and the n8n signature checks in CI.
- **Server-side guards.** Add server-side route guards (Clerk `auth()` in a server layout) if pages ever start rendering data on the server. Today they are client-rendered and Convex does the checks.
- **Pagination** on lists (`/tools`, admin tables), which currently show the most recent 200 to 500 rows.
- **Content Security Policy** once the Clerk and Convex domains are fixed.
- **Product:** photos, pickup notes, lender-side "extend loan", and in-app notifications next to email.
