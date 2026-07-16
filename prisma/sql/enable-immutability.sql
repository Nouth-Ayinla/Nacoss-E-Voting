-- Database-level immutability for the tables the app claims are tamper-proof.
--
-- Prisma's schema.prisma can't express Row-Level Security or privilege
-- revocation, so this runs as a one-off SQL script after migration. It is
-- idempotent — safe to re-run.
--
-- IMPORTANT: `FORCE ROW LEVEL SECURITY` below makes these policies apply
-- even to the table owner (normally RLS ignores the owner — FORCE is what
-- fixes that). The one case this can't stop is a Postgres role with the
-- SUPERUSER or BYPASSRLS attribute, which always bypasses RLS regardless of
-- FORCE. Managed providers occasionally hand out such a role by default —
-- run `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;`
-- against your connection to confirm both are false before relying on this.

-- ── votes ────────────────────────────────────────────────────────────────
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes FORCE ROW LEVEL SECURITY; -- applies even to the table owner

DROP POLICY IF EXISTS votes_insert_only ON votes;
CREATE POLICY votes_insert_only ON votes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS votes_select_all ON votes;
CREATE POLICY votes_select_all ON votes FOR SELECT USING (true);

-- No UPDATE/DELETE policy is defined, so RLS denies both outright for every
-- role. Also revoke the underlying privileges as defense-in-depth, in case
-- RLS is ever disabled by mistake:
REVOKE UPDATE, DELETE ON votes FROM PUBLIC;

-- ── vote_receipts ────────────────────────────────────────────────────────
ALTER TABLE vote_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_receipts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vote_receipts_insert_only ON vote_receipts;
CREATE POLICY vote_receipts_insert_only ON vote_receipts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS vote_receipts_select_all ON vote_receipts;
CREATE POLICY vote_receipts_select_all ON vote_receipts FOR SELECT USING (true);

REVOKE UPDATE, DELETE ON vote_receipts FROM PUBLIC;

-- ── audit_logs ───────────────────────────────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_insert_only ON audit_logs;
CREATE POLICY audit_logs_insert_only ON audit_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS audit_logs_select_all ON audit_logs;
CREATE POLICY audit_logs_select_all ON audit_logs FOR SELECT USING (true);

REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;

-- ── vote_chain_state ─────────────────────────────────────────────────────
-- This one DOES need UPDATE (the vote-cast transaction advances the anchor),
-- but never DELETE, and it must always have exactly one row.
ALTER TABLE vote_chain_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_chain_state FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vote_chain_state_no_delete ON vote_chain_state;
CREATE POLICY vote_chain_state_all_but_delete ON vote_chain_state
  FOR ALL USING (true) WITH CHECK (true);

REVOKE DELETE ON vote_chain_state FROM PUBLIC;
