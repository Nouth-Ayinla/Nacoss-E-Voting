-- CreateEnum
CREATE TYPE "VoterStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "ElectionState" AS ENUM ('upcoming', 'ongoing', 'ended');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voters" (
    "matric_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "id_card_url" TEXT NOT NULL,
    "status" "VoterStatus" NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "has_voted" BOOLEAN NOT NULL DEFAULT false,
    "pin_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voters_pkey" PRIMARY KEY ("matric_number")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "image_url" TEXT,
    "manifesto" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "cast_at" TIMESTAMP(3) NOT NULL,
    "prev_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vote_chain_state" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "latest_hash" TEXT NOT NULL DEFAULT 'GENESIS',

    CONSTRAINT "vote_chain_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vote_receipts" (
    "id" TEXT NOT NULL,
    "receipt_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vote_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "state" "ElectionState" NOT NULL DEFAULT 'upcoming',

    CONSTRAINT "election_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "voters_email_key" ON "voters"("email");

-- CreateIndex
CREATE UNIQUE INDEX "votes_hash_key" ON "votes"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "vote_receipts_receipt_hash_key" ON "vote_receipts"("receipt_hash");

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row-level security for voters
ALTER TABLE "voters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "voters" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS voters_select_admin ON "voters";
CREATE POLICY voters_select_admin ON "voters"
    FOR SELECT
    USING (current_setting('app.request_role', true) = 'admin');

DROP POLICY IF EXISTS voters_select_register_window ON "voters";
CREATE POLICY voters_select_register_window ON "voters"
    FOR SELECT
    USING (
        current_setting('app.request_role', true) = 'voter-register'
        AND created_at >= date_trunc('day', now())
    );

DROP POLICY IF EXISTS voters_select_lookup ON "voters";
CREATE POLICY voters_select_lookup ON "voters"
    FOR SELECT
    USING (
        current_setting('app.request_role', true) IN ('public', 'voter', 'voter-register')
        AND (
            matric_number = current_setting('app.matric_number', true)
            OR email = current_setting('app.email', true)
        )
    );

DROP POLICY IF EXISTS voters_insert_register ON "voters";
CREATE POLICY voters_insert_register ON "voters"
    FOR INSERT
    WITH CHECK (current_setting('app.request_role', true) = 'voter-register');

DROP POLICY IF EXISTS voters_update_admin ON "voters";
CREATE POLICY voters_update_admin ON "voters"
    FOR UPDATE
    USING (current_setting('app.request_role', true) = 'admin')
    WITH CHECK (current_setting('app.request_role', true) = 'admin');

DROP POLICY IF EXISTS voters_update_self_vote ON "voters";
CREATE POLICY voters_update_self_vote ON "voters"
    FOR UPDATE
    USING (
        current_setting('app.request_role', true) = 'voter'
        AND matric_number = current_setting('app.matric_number', true)
    )
    WITH CHECK (
        current_setting('app.request_role', true) = 'voter'
        AND matric_number = current_setting('app.matric_number', true)
    );

REVOKE UPDATE, DELETE ON "voters" FROM PUBLIC;
