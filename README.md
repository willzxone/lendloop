# LendLoop

A neighbourhood tool-lending board. People list tools they are happy to lend, neighbours ask to borrow them for a date range, and the owner approves or declines. n8n sends the emails: one when a request is made or changes status, and a daily reminder when a loan is overdue.

Stack: Next.js 16 (App Router) + TypeScript, Clerk for sign-in, Convex for data and backend logic, n8n for the automations, Tailwind for the UI. Built as a take-home exercise. Most of the code was written with an AI assistant, which the brief allows.

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Local setup](#local-setup)
- [Roles and making an admin](#roles-and-making-an-admin)
- [Security and data minimisation](#security-and-data-minimisation)
- [The n8n integration](#the-n8n-integration)
- [Tests and what was verified](#tests-and-what-was-verified)
- [Known gaps and changes from the plan](#known-gaps-and-changes-from-the-plan)

Production notes are in [PRODUCTION.md](PRODUCTION.md).

## What it does

**Visitors** see the name and tagline, the tools available right now (name and category only, nothing about owners), and a "Sign in to lend or borrow" button.

**Signed-in users** can:

- start from an overview (`/dashboard`): requests waiting for an answer, tools out on loan and anything overdue, with recent automation activity;
- browse all tools with their availability, search them and filter by category (`/tools`), and ask to borrow one for a date range;
- list, edit and remove their own tools (`/listings`);
- follow their own requests (`/requests`);
- approve or decline requests for their tools, and mark loans returned (`/incoming`).

Each loan card lists its recent automation activity, for example "Overdue reminder sent · 2 days ago" or "Approval notification queued · just now".

**Admins** also get `/admin`: every listing (with remove), every loan, the user list with a "Trusted Lender" switch, and an "Automation failures" list with a retry button for notifications that ran out of attempts.

Request rules, all checked in Convex:

- you can't borrow your own tool;
- dates are calendar dates, inclusive, at most 30 days long and at most 180 days ahead; the start can be yesterday at the earliest, as a margin for time zones behind UTC;
- requests that overlap an approved loan are refused, and two overlapping requests can't both be approved;
- one borrower can have at most 10 pending requests;
- status moves only `requested → approved | declined` and `approved → returned`;
- removing a listing declines its pending requests (and notifies those borrowers). A listing with an approved loan can't be removed by its owner until the loan is returned; an admin can remove it.

## Architecture

```
 Browser (Next.js, Clerk UI)
    │  Clerk session JWT (aud "convex")
    ▼
 Convex ─────────────── queries / mutations: every one checks the caller and role
    │  ▲
    │  │                 automationEvents = outbox, one row per notification
    │  │
    │  │ signed GET  /n8n/overdue-loans          ┌──────────────────────────────┐
    │  └─ signed POST /n8n/reminders ────────────┤ n8n: overdue reminders       │ daily 09:00 UTC
    │    signed POST /n8n/automation-errors ─────┤ n8n: automation errors       │ on any failure
    │                                            └──────────────────────────────┘
    │ signed POST /webhook/lendloop-notify       ┌──────────────────────────────┐
    └───────────────────────────────────────────►│ n8n: loan notifications      │
                                                 └──────────────┬───────────────┘
                                                                ▼
                                                 SMTP: Mailpit locally (http://localhost:8025)
```

How a notification travels:

1. A mutation changes a loan (for example `loans.approve`). In the same transaction it writes a `pending` row to `automationEvents` and schedules `notifications.deliver`. Either all of that commits or none of it does.
2. `deliver` (a Convex action) builds a minimal payload, signs it and POSTs it to the n8n webhook, then records `sent`, `retrying` (with the next attempt time) or `failed`.
3. n8n checks the signature, writes a short email and sends it.

Overdue reminders go the other way: n8n asks Convex for the loans that need a reminder today, emails each borrower, and writes the result back to Convex. Convex then shows the reminder on the loan.

### Code layout

```
app/                    pages. (app)/ holds the signed-in pages behind <RequireUser>
components/             UI pieces; ui.tsx holds the small shared primitives
convex/
  schema.ts             users, tools, loans, automationEvents, reminders
  tools.ts loans.ts     public API used by the browser
  users.ts admin.ts
  notifications.ts      outbox delivery to n8n (internal only)
  http.ts               the three signed HTTP endpoints n8n calls
  integrations.ts       internal queries/mutations behind http.ts
  seed.ts               demo data (internal only)
  lib/                  auth + permission checks, HMAC, date rules, payload
                        parsing, retry policy. Plain functions, unit tested.
n8n/workflows/          the three exported workflows
n8n/credentials/        local Mailpit SMTP credential (host and port only)
n8n/import.sh           imports and publishes the workflows into the container
docker-compose.yml      n8n 2.49.6 + Mailpit, bound to 127.0.0.1
scripts/verify-e2e.mjs  end-to-end checks against the running stack
tests/                  Vitest: HMAC, date and loan rules, Convex functions
```

## Local setup

You need Node 20.9 or newer (built and tested on Node 24) and Docker.

### 1. Install

```bash
npm install
cp .env.example .env.local        # Clerk keys go here (step 3)
cp n8n/.env.example n8n/.env      # n8n secrets go here (step 4)
```

### 2. Convex (local, no account needed)

```bash
CONVEX_AGENT_MODE=anonymous npx convex dev
```

This downloads and starts a local Convex backend on `127.0.0.1:3210` (HTTP actions on `:3211`), pushes the functions, and writes `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` into `.env.local`. Keep it running. If you have a Convex account, plain `npx convex dev` lets you pick a local or cloud deployment instead.

### 3. Clerk (needs a Clerk account)

The app won't render without Clerk keys. This part has to be done in the Clerk dashboard:

1. Create an application at <https://dashboard.clerk.com> with email sign-in turned on.
2. Turn on the Convex integration: **Integrations → Convex → Activate**. Clerk then adds `aud: "convex"` to session tokens, which `convex/auth.config.ts` expects (`applicationID: "convex"`). A JWT template named `convex` works too; `ConvexProviderWithClerk` uses either.
3. Put the user's name and email into the token, because LendLoop sends notifications to that email: **Sessions → Customize session token**:
   ```json
   { "name": "{{user.full_name}}", "email": "{{user.primary_email_address}}" }
   ```
   (If you use the `convex` JWT template instead, check that it has `name` and `email` claims.)
4. Copy the **Frontend API URL** (shown on the Convex integration page and under API keys) and give it to Convex:
   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-app>.clerk.accounts.dev
   ```
5. Copy the publishable key and secret key into `.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

If the integration is not active or the issuer is wrong, you can still sign in, but the app shows "Signed in, but the backend rejected the session" instead of failing silently.

### 4. n8n and Mailpit

Generate the two secrets and put them in `n8n/.env`:

```bash
openssl rand -hex 32   # N8N_ENCRYPTION_KEY
openssl rand -hex 32   # LENDLOOP_HMAC_SECRET
```

Give Convex the same HMAC secret and the webhook URL:

```bash
npx convex env set LENDLOOP_HMAC_SECRET <the same value as in n8n/.env>
npx convex env set N8N_NOTIFY_WEBHOOK_URL http://localhost:5678/webhook/lendloop-notify
```

Start the containers and load the workflows:

```bash
docker compose up -d
./n8n/import.sh
```

`import.sh` imports the Mailpit credential and the three workflows, publishes them, and restarts n8n so the webhook and schedule are registered. The files have fixed ids, so running it again overwrites the workflows rather than duplicating them. The first time you open <http://localhost:5678>, n8n asks you to create an owner account; it exists only in your local n8n.

Emails show up in Mailpit at <http://localhost:8025>. Nothing is sent to real inboxes.

### 5. Run

```bash
npm run dev            # http://localhost:3000 (keep `npx convex dev` running too)
```

### 6. Demo data and the end-to-end check

```bash
npx convex run seed:demo     # Alice lends, Bob borrows: one overdue loan, one pending request
npm run verify:e2e           # signed / unsigned / tampered requests against Convex and n8n
```

The seed's pending request queues a real notification, so an email to Alice should appear in Mailpit within a few seconds. To send the overdue reminder now rather than at 09:00 UTC, open "LendLoop: overdue reminders" in n8n and click **Execute workflow**, or run:

```bash
docker compose exec -e N8N_RUNNERS_BROKER_PORT=5690 n8n n8n execute --id=lendloopRemind01
```

(The different broker port avoids a clash with the task runner of the n8n that is already running.)

### Environment variables

| Where | Name | What |
|---|---|---|
| `.env.local` | `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_SITE_URL` | written by `npx convex dev` |
| `.env.local` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk API keys |
| Convex (`npx convex env set`) | `CLERK_JWT_ISSUER_DOMAIN` | Clerk Frontend API URL |
| Convex | `LENDLOOP_HMAC_SECRET` | shared signing secret, 32+ characters |
| Convex | `N8N_NOTIFY_WEBHOOK_URL` | n8n webhook for loan events |
| `n8n/.env` | `N8N_ENCRYPTION_KEY` | encrypts credentials in n8n's database |
| `n8n/.env` | `LENDLOOP_HMAC_SECRET` | same value as on Convex |
| `n8n/.env` | `LENDLOOP_CONVEX_SITE_URL` | Convex HTTP actions as seen from the container (`http://host.docker.internal:3211` locally) |
| `n8n/.env` | `LENDLOOP_APP_URL`, `LENDLOOP_MAIL_FROM` | links and sender used in emails |

`.env*` files are gitignored except the two `.env.example` files. The HMAC secret never reaches the browser: only `NEXT_PUBLIC_*` values do.

## Roles and making an admin

Each user has a `role` of `"user"` or `"admin"` in the Convex `users` table. The row is created the first time someone signs in, always with `role: "user"`. The browser can't change a role. The only way is the internal `admin:setRole` mutation, which you can run from the CLI or the Convex dashboard:

```bash
npx convex run admin:setRole '{"email":"you@example.com","role":"admin"}'
```

The person has to sign in once first so their row exists. Use `"role":"user"` to demote.

Roles are enforced in the Convex functions, not just hidden in the UI. The checks are in `convex/lib/auth.ts` (who is calling, loaded from the verified Clerk token) and `convex/lib/permissions.ts` (small pure functions such as `canEditTool` and `canDecideLoan`):

| Action | user | admin |
|---|---|---|
| List a tool; edit or delete it | own tools only | edit own; remove any |
| Request a loan | yes, not on own tools | same |
| Approve / decline | requests on own tools | same |
| Mark returned | lender of that loan | same |
| See a loan | as borrower or lender | all loans (`/admin`) |
| Mark "Trusted Lender" | no | yes |
| See automation errors, retry a failed notification | no | yes |

Admins can remove any listing and see everything, but approving, declining and returning stay with the lender. The brief doesn't ask admins to act for lenders, so they can't.

## Security and data minimisation

- **Authorisation on the server.** Every public Convex query and mutation starts with `requireUser`, `requireAdmin`, `requireToolOwnerOrAdmin`, `requireLoanLender` or `requireLoanViewer`. Hiding buttons in the UI is only for convenience. `tests/convex.test.ts` calls the functions as different users and checks that the wrong ones are refused.
- **Identity comes from the token.** The key is the Clerk subject in the verified JWT. The browser never passes a user id, role or email. Name and email are copied from the token on each sign-in.
- **The public page gets only what it shows.** `tools.listPublic` returns `{ name, category }` for tools that aren't on loan today: no ids, owners, descriptions or dates.
- **Signed-in views get only what they need.** The other person on a loan is shown by first name and last initial ("Alice L.") and the Trusted Lender badge. Email addresses are never sent to another user's browser. Admins see emails on the user list.
- **n8n gets only what it needs.** A notification payload holds the event, tool name, dates, and the recipient's name and email. It doesn't include the other person, user ids or the tool description. The overdue endpoint returns the borrower's name and email, the tool name and the dates.
- **Error detail stays with admins.** Users see "Overdue reminder failed" on their loan. The error text can contain hostnames or SMTP messages, so only admins get it.
- **Validation.** Mutations use Convex validators for types and check lengths, dates and allowed values themselves. Bodies from n8n are parsed field by field (`convex/lib/n8nPayloads.ts`) even after the signature check: a signature shows who sent the body, not that the body is well formed.
- **Errors.** Expected failures are thrown as `ConvexError` with a code (`FORBIDDEN`, `CONFLICT`, …) and a message written for the user. Anything unexpected shows up in the browser as a generic "Something went wrong".
- **Headers.** Every page sends `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a restrictive `Permissions-Policy`. There is no `X-Powered-By`.
- **Local services.** n8n and Mailpit listen on 127.0.0.1 only.

## The n8n integration

Three workflows, exported in `n8n/workflows/`:

| Workflow | Trigger | Does |
|---|---|---|
| LendLoop: loan notifications | webhook `POST /webhook/lendloop-notify` | verify → skip if already sent → email → 200 |
| LendLoop: overdue reminders | every day 09:00 UTC, plus a manual trigger | signed GET overdue loans → email each borrower → signed write-back |
| LendLoop: automation errors | error workflow of the two above | signed report of the failed execution to Convex |

Each workflow has a sticky note explaining it.

### Signing

Every request in either direction carries:

```
X-LendLoop-Timestamp: <unix seconds>
X-LendLoop-Signature: hex(HMAC-SHA256(LENDLOOP_HMAC_SECRET, "<timestamp>.<raw body>"))
```

- The signature covers the **raw bytes** of the body. Convex reads `request.text()` before parsing anything. The n8n webhook has "Raw Body" turned on, and the Code node hashes that buffer, not a re-serialised copy.
- The timestamp is part of the signed string, and both sides refuse timestamps more than 5 minutes off. A captured request can't be replayed later, and its timestamp can't be swapped.
- The comparison is constant-time: `crypto.subtle.verify` in Convex, `crypto.timingSafeEqual` in n8n.
- Convex refuses bodies over 64 KB before verifying. If its secret is missing or shorter than 32 characters, it answers 503 and accepts nothing.
- A bad signature gets a plain `401 {"error":"invalid_signature"}`. The exact reason (missing headers, expired, mismatch) goes to the Convex log or the n8n execution data, not into the response.
- The secret is an environment variable in both places (`npx convex env set` and `n8n/.env`). The workflows read it as `$env.LENDLOOP_HMAC_SECRET`, so the exported JSON contains no secret. The SMTP credential in the repo is the local Mailpit host and port, with no password.

### Idempotency

- **Reminder write-backs.** Each result carries `idempotencyKey = "<loanId>:<YYYY-MM-DD>"`, and Convex keeps at most one `reminders` row per key. A repeated report returns `duplicate` and writes nothing. The only change allowed is `failed → sent` (a later retry succeeded), which returns `updated`. So retrying the whole HTTP call is safe.
- **No double reminders.** `/n8n/overdue-loans` leaves out loans that already have a `sent` reminder today, so running the workflow twice in a day (the schedule plus a manual run) emails nobody twice.
- **Notifications.** Convex retries a notification until it gets a 2xx. If n8n sent the email but the 200 was lost (timeout, restart), the retry would send it again. To prevent that, the workflow remembers delivered `eventId`s for 14 days (workflow static data) and answers a repeat with `200 {"duplicate": true}` without sending.
- **Outbox claims.** `notifications.startAttempt` only goes ahead while the row is `pending` or `retrying`, so a duplicate scheduled run does nothing.
- **Error reports.** Deduplicated by n8n execution id.

### Retries and errors

- **Convex → n8n.** Each attempt has a 10 s timeout. 5xx, 404 (webhook not registered yet, for example while n8n restarts), 408, 429 and network errors are retried with exponential backoff and jitter (about 15 s, 30 s, 60 s, 120 s), up to 5 attempts. Other 4xx answers are final, because resending the same request would fail the same way. A row that runs out of attempts becomes `failed`, appears under "Automation failures" on `/admin`, and can be retried from there.
- **Inside n8n.** The email nodes retry once after 2 s, and the HTTP calls to Convex retry 3 times, 5 s apart. In the reminder run, one failed email doesn't stop the batch: that loan is written back as `failed` with the reason, and the next day's run tries it again. If a node still fails:
  - for a notification, the webhook answers 500, so Convex retries later;
  - n8n runs the **automation errors** workflow, which posts the workflow name, execution id, failed node and message to Convex. It shows up on `/admin` next to the failed notifications.
- **What users see.** Loan cards show the activity ("Approval notification queued", "Overdue reminder sent", "Overdue reminder failed"), so a missing email is noticeable.

## Tests and what was verified

```bash
npm test             # 39 Vitest tests
npm run typecheck
npm run lint
npm run verify:e2e   # needs Convex, n8n and Mailpit running and the demo seed
```

The unit tests cover:

- the HMAC scheme: good, tampered, wrong secret, expired, future-dated and malformed signatures;
- date and overlap rules, status transitions, the retry policy and payload parsing.

`tests/convex.test.ts` runs the real Convex functions in `convex-test` with fake identities. It covers:

- role checks and the borrowing flow, including overlap refusals;
- the outbox: a signed minimal payload, retry with backoff and then giving up, and no retry on a 401;
- the signed HTTP endpoints and write-back idempotency.

Checked by hand against the running local stack (Convex local backend, n8n 2.49.6, Mailpit) while building:

- `npm run verify:e2e` passed 10 of 10 checks:
  - Convex returned 401 for unsigned, wrong-secret, 10-minute-old and tampered requests, and 200 for a signed one.
  - n8n returned 401 for unsigned and tampered requests and 200 for a signed one (the email arrived in Mailpit). It returned `200 {"duplicate":true}` for a repeat.
  - A repeated reminder write-back returned `duplicate` and left one row.
- `seed:demo`: the queued notification went Convex → n8n → Mailpit, and the outbox row became `sent` on the first attempt.
- Reminder workflow run with `n8n execute`: Bob got the overdue email, and Convex stored one `sent` reminder plus the activity row. A second run the same day sent nothing and added nothing.
- With Mailpit stopped, a signed notification made n8n answer 500. The error workflow's report appeared in Convex as a `workflow_error` with the failed node and message.
- Exported the workflows from n8n with `n8n export:workflow --all` and searched the output for both secrets. Neither appears there or anywhere in the repo.
- `next build` passes. With placeholder Clerk keys, every page renders and sends the security headers.

**Not verified:** signing in and clicking through the app in a browser. That needs a real Clerk application, which I couldn't create (see below). The `convex-test` suite covers the signed-in flows at the function level, but nobody has used the pages with a live session yet.

## Known gaps and changes from the plan

- **Clerk keyless mode wasn't used.** In `@clerk/nextjs` 7 the app no longer creates temporary keys by itself. They now come from `npx clerk init`, which registers a temporary application with Clerk. That wouldn't be enough anyway, because the Convex integration and the session-token claims still have to be set in the dashboard. So you need a real Clerk application (step 3) before you can sign in.
- **Mailpit instead of a real email provider**, so nothing leaves the machine. Moving to real SMTP means changing one credential in n8n.
- **n8n reads the HMAC secret from its environment** (`N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, `NODE_FUNCTION_ALLOW_BUILTIN=crypto`). It's simple and keeps the secret out of the workflow JSON, but every workflow on that n8n instance can read every environment variable. See PRODUCTION.md.
- **The notification dedupe list lives in n8n workflow static data.** It's saved when an execution finishes, and re-importing the workflow clears it. It covers the usual case (Convex retrying after a lost response), not every race.
- **If SMTP is unreachable, a notification run can last longer than Convex's 10 s timeout.** It took about 28 s when the Mailpit host was down. Convex records a retry, and the dedupe above stops a second email if the first one went out in the end.
- **`proxy.ts` doesn't guard routes.** Clerk 7 deprecates `createRouteMatcher`, and the pages hold no data of their own. Signed-out visitors get a sign-in prompt from `RequireUser`, and Convex refuses their queries.
- **Times are UTC.** Loan dates are calendar dates compared with today's date in UTC, and the reminder runs at 09:00 UTC.
- **Making someone an admin is CLI-only**, on purpose (see above).
