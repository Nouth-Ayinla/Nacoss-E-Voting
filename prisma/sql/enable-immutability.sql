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
CREATE POLICY votes_insert_only ON votes
  FOR INSERT
  WITH CHECK (current_setting('app.request_role', true) = 'voter');

DROP POLICY IF EXISTS votes_select_all ON votes;
CREATE POLICY votes_select_all ON votes
  FOR SELECT
  USING (current_setting('app.request_role', true) = 'admin');

-- No UPDATE/DELETE policy is defined, so RLS denies both outright for every
-- role. Also revoke the underlying privileges as defense-in-depth, in case
-- RLS is ever disabled by mistake:
REVOKE UPDATE, DELETE ON votes FROM PUBLIC;

-- ── admins ───────────────────────────────────────────────────────────────
-- Admin login and management happen through the application layer, so the DB
-- policies here only need to enforce RLS being enabled while keeping current
-- API behavior intact.
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admins_select_all ON admins;
CREATE POLICY admins_select_all ON admins
  FOR SELECT
  USING (current_setting('app.request_role', true) IN ('admin', 'admin-login'));

DROP POLICY IF EXISTS admins_insert_all ON admins;
CREATE POLICY admins_insert_all ON admins
  FOR INSERT
  WITH CHECK (current_setting('app.request_role', true) = 'admin');

DROP POLICY IF EXISTS admins_delete_all ON admins;
CREATE POLICY admins_delete_all ON admins
  FOR DELETE
  USING (current_setting('app.request_role', true) = 'admin');

REVOKE UPDATE ON admins FROM PUBLIC;

-- ── voters ───────────────────────────────────────────────────────────────
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS voters_select_admin ON voters;
CREATE POLICY voters_select_admin ON voters
  FOR SELECT
  USING (current_setting('app.request_role', true) = 'admin');

DROP POLICY IF EXISTS voters_select_register_window ON voters;
CREATE POLICY voters_select_register_window ON voters
  FOR SELECT
  USING (
    current_setting('app.request_role', true) = 'voter-register'
    AND created_at >= date_trunc('day', now())
  );

DROP POLICY IF EXISTS voters_select_lookup ON voters;
CREATE POLICY voters_select_lookup ON voters
  FOR SELECT
  USING (
    current_setting('app.request_role', true) IN ('public', 'voter', 'voter-register')
    AND (
      matric_number = current_setting('app.matric_number', true)
      OR email = current_setting('app.email', true)
    )
  );

DROP POLICY IF EXISTS voters_insert_register ON voters;
CREATE POLICY voters_insert_register ON voters
  FOR INSERT
  WITH CHECK (current_setting('app.request_role', true) = 'voter-register');

DROP POLICY IF EXISTS voters_update_admin ON voters;
CREATE POLICY voters_update_admin ON voters
  FOR UPDATE
  USING (current_setting('app.request_role', true) = 'admin')
  WITH CHECK (current_setting('app.request_role', true) = 'admin');

DROP POLICY IF EXISTS voters_update_self_vote ON voters;
CREATE POLICY voters_update_self_vote ON voters
  FOR UPDATE
  USING (
    current_setting('app.request_role', true) = 'voter'
    AND matric_number = current_setting('app.matric_number', true)
  )
  WITH CHECK (
    current_setting('app.request_role', true) = 'voter'
    AND matric_number = current_setting('app.matric_number', true)
  );

DROP POLICY IF EXISTS voters_update_register ON voters;
CREATE POLICY voters_update_register ON voters
  FOR UPDATE
  USING (
    current_setting('app.request_role', true) = 'voter-register'
    AND status = 'rejected'
  )
  WITH CHECK (
    current_setting('app.request_role', true) = 'voter-register'
  );

REVOKE UPDATE, DELETE ON voters FROM PUBLIC;

-- ── candidates ───────────────────────────────────────────────────────────
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS candidates_select_all ON candidates;
CREATE POLICY candidates_select_all ON candidates
  FOR SELECT
  USING (current_setting('app.request_role', true) IN ('public', 'voter', 'admin', 'admin-login'));

DROP POLICY IF EXISTS candidates_insert_all ON candidates;
CREATE POLICY candidates_insert_all ON candidates
  FOR INSERT
  WITH CHECK (current_setting('app.request_role', true) = 'admin');

DROP POLICY IF EXISTS candidates_update_all ON candidates;
CREATE POLICY candidates_update_all ON candidates
  FOR UPDATE
  USING (current_setting('app.request_role', true) = 'admin')
  WITH CHECK (current_setting('app.request_role', true) = 'admin');

DROP POLICY IF EXISTS candidates_delete_all ON candidates;
CREATE POLICY candidates_delete_all ON candidates
  FOR DELETE
  USING (current_setting('app.request_role', true) = 'admin');

REVOKE UPDATE, DELETE ON candidates FROM PUBLIC;

-- ── election_config ──────────────────────────────────────────────────────
ALTER TABLE election_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_config FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS election_config_select_all ON election_config;
CREATE POLICY election_config_select_all ON election_config
  FOR SELECT
  USING (current_setting('app.request_role', true) IN ('public', 'voter', 'admin', 'admin-login'));

DROP POLICY IF EXISTS election_config_insert_all ON election_config;
CREATE POLICY election_config_insert_all ON election_config
  FOR INSERT
  WITH CHECK (current_setting('app.request_role', true) = 'admin');

DROP POLICY IF EXISTS election_config_update_all ON election_config;
CREATE POLICY election_config_update_all ON election_config
  FOR UPDATE
  USING (current_setting('app.request_role', true) = 'admin')
  WITH CHECK (current_setting('app.request_role', true) = 'admin');

REVOKE DELETE ON election_config FROM PUBLIC;

-- ── vote_receipts ────────────────────────────────────────────────────────
ALTER TABLE vote_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_receipts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vote_receipts_insert_only ON vote_receipts;
CREATE POLICY vote_receipts_insert_only ON vote_receipts
  FOR INSERT
  WITH CHECK (current_setting('app.request_role', true) = 'voter');

DROP POLICY IF EXISTS vote_receipts_select_all ON vote_receipts;
CREATE POLICY vote_receipts_select_all ON vote_receipts
  FOR SELECT
  USING (current_setting('app.request_role', true) = 'admin');

REVOKE UPDATE, DELETE ON vote_receipts FROM PUBLIC;

-- ── audit_logs ───────────────────────────────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_insert_only ON audit_logs;
CREATE POLICY audit_logs_insert_only ON audit_logs
  FOR INSERT
  WITH CHECK (current_setting('app.request_role', true) = 'admin');

DROP POLICY IF EXISTS audit_logs_select_all ON audit_logs;
CREATE POLICY audit_logs_select_all ON audit_logs
  FOR SELECT
  USING (current_setting('app.request_role', true) = 'admin');

REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;

-- ── vote_chain_state ─────────────────────────────────────────────────────
-- This one DOES need UPDATE (the vote-cast transaction advances the anchor),
-- but never DELETE, and it must always have exactly one row.
ALTER TABLE vote_chain_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_chain_state FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vote_chain_state_select ON vote_chain_state;
CREATE POLICY vote_chain_state_select ON vote_chain_state
  FOR SELECT
  USING (current_setting('app.request_role', true) IN ('admin', 'voter'));

DROP POLICY IF EXISTS vote_chain_state_update ON vote_chain_state;
CREATE POLICY vote_chain_state_update ON vote_chain_state
  FOR UPDATE
  USING (current_setting('app.request_role', true) IN ('admin', 'voter'))
  WITH CHECK (current_setting('app.request_role', true) IN ('admin', 'voter'));

REVOKE DELETE ON vote_chain_state FROM PUBLIC;
