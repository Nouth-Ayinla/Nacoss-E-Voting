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
