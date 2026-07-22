# NACOSS E-Voting System

Passwordless, anonymous e-voting for the NACOSS department, built on Next.js
(App Router) with Postgres, Upstash Redis, Cloudflare R2 (or any S3-compatible
storage), and Resend.

## Structure

```
/app
  /register, /register/success        Voter registration (2-step + confirmation)
  /vote                                OTP gate + per-position ballot + receipt
  /admin/login                         Admin sign-in (password, then TOTP if enabled)
  /admin/dashboard                     Voter verification queue (protected)
  /admin/dashboard/candidates          Candidate CRUD (protected)
  /admin/dashboard/results             Live results (protected)
  /admin/dashboard/audit               Audit log + live vote-chain verification (protected)
  /admin/dashboard/settings            Account settings, 2FA enable/disable (protected)
  /api
    /voters/register                   Voter registration + real ID card upload
    /voters                            GET — list voters for admin (protected)
    /voters/verify                     Admin approve/reject + audit log
    /voters/[matricNumber]/id-card     Signed-URL redirect for viewing an ID card
    /auth/otp/request, /auth/otp/verify
    /auth/session                      GET — voter session check for the /vote gate
    /votes/cast                        Atomic + hash-chained vote transaction
    /candidates, /candidates/[id]      CRUD (protected writes, public reads)
    /election-state                    Toggle upcoming/ongoing/ended (protected)
    /admin/login, /admin/logout, /admin/me
    /admin/2fa/setup, /enable, /disable  TOTP 2FA lifecycle (protected)
    /audit-logs                        GET — protected
    /audit/verify-chain                GET — recomputes and verifies the vote hash chain
    /results                           GET — aggregated vote counts, protected
  middleware.ts                        Edge-level admin cookie gating only
/lib
  db.ts, redis.ts, otp.ts, totp.ts, email.ts, session.ts, validation.ts, storage.ts
/prisma
  schema.prisma                        Full schema incl. audit log, vote receipts, hash chain
  seed.ts                              Bootstraps the first admin + chain/election anchors
  sql/enable-immutability.sql          RLS + privilege revocation for votes/audit_logs
```

## Security decisions implemented

- **Double-vote prevention**: `votes/cast/route.ts` uses a single
  `UPDATE ... WHERE has_voted = FALSE` inside a transaction, not a
  check-then-update, so concurrent requests can't race past the check.
- **OTP**: hashed in Redis, single-use, constant-time compared, separately
  rate-limited for request and verify.
- **Ballot anonymity**: `Vote` has no foreign key to `Voter`. A separate
  `VoteReceipt` table proves participation without linking to choice.
- **Vote hash chain**: every vote links to a hash of the one before it
  (`prevHash` → `hash`), anchored by a locked singleton row
  (`vote_chain_state`) so concurrent vote-casts can't fork the chain.
  `GET /api/audit/verify-chain` recomputes the whole chain from scratch and
  is exposed as a live "Verify Chain Now" button on the audit log page —
  this is a real check, not a static claim.
- **Database-level immutability**: `prisma/sql/enable-immutability.sql`
  enables Row-Level Security with `FORCE` (so it applies even to the table
  owner) on the admin, election-state, candidate, vote, receipt, audit-log,
  and chain-anchor tables. Access is claim-based: the app sets a per-transaction
  request role before each protected query. Read the caveat at the top of that
  file — this only holds if your DB connection role isn't a Postgres
  superuser.
- **Admin 2FA**: TOTP (Google Authenticator—compatible), set up via a
  QR-code flow at `/admin/dashboard/settings`. The secret is only persisted
  after the admin proves they scanned it. Login becomes two-step once
  enabled: password first, then a 6-digit code, separately rate-limited.
- **ID card privacy**: uploaded files are stored under a random key in
  private object storage. Admins view them only via a short-lived signed URL
  generated on demand — the storage key itself is never exposed to the browser.
- **Audit log**: insert-only trail of every admin action, enforced both at
  the application layer and (once you run the SQL script) at the database
  permission layer.
- **Sessions**: admin and voter JWTs use different secrets; voter session
  expires in 15 minutes and is destroyed immediately after a vote is cast.

## Setup

```bash
npm install
cp .env.example .env    # fill in real values, including SEED_ADMIN_EMAIL/PASSWORD
npx prisma migrate dev
npm run prisma:seed     # creates your first admin login + chain/election anchors
npm run prisma:secure   # applies RLS + immutability — see caveat in the SQL file
npm run dev
```

After signing in for the first time, visit **Settings** to enable 2FA —
it's optional at the database level but strongly recommended before the
election actually starts.

## Known remaining gaps

- The `id-card` signed-URL route trusts any authenticated admin session;
  there's no additional audit-log entry specifically for "admin viewed this
  ID card" (approve/reject actions are logged, viewing isn't).
- No automated tests yet — the atomic vote transaction and hash chain in
  particular would benefit from a concurrency test that fires many
  simultaneous `POST /api/votes/cast` requests and asserts the chain never
  forks and no voter double-votes.
