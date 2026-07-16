import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { verifyVoterSession, destroyVoterSession } from "@/lib/session";
import { voteCastSchema } from "@/lib/validation";

function computeVoteHash(prevHash: string, candidateId: string, position: string, castAt: Date): string {
  return crypto
    .createHash("sha256")
    .update(`${prevHash}:${candidateId}:${position}:${castAt.toISOString()}`)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  const session = await verifyVoterSession();
  if (!session) {
    return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
  }

  const body = await req.json();
  const parsed = voteCastSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ballot" }, { status: 400 });
  }

  const { matricNumber } = session;
  const { votes } = parsed.data;

  try {
    const receiptHash = await db.$transaction(async (tx) => {
      // Atomic check-and-set: UPDATE ... WHERE has_voted = FALSE is a single
      // row-locked operation. If 0 rows are affected, this voter already
      // voted (or was never eligible) — no separate SELECT-then-UPDATE race.
      const updateResult = await tx.$executeRaw`
        UPDATE voters
        SET has_voted = TRUE
        WHERE matric_number = ${matricNumber} AND has_voted = FALSE AND status = 'verified'
      `;

      if (updateResult === 0) {
        throw new Error("ALREADY_VOTED_OR_INELIGIBLE");
      }

      // Lock the chain anchor row for the duration of this transaction.
      // This is what prevents two concurrent vote-casts from both reading
      // the same "latest hash" and forking the chain — the second
      // transaction blocks here until the first commits or rolls back.
      const anchor = await tx.$queryRaw<{ latest_hash: string }[]>`
        SELECT latest_hash FROM vote_chain_state WHERE id = 1 FOR UPDATE
      `;
      let runningHash = anchor[0]?.latest_hash ?? "GENESIS";

      // Insert anonymous ballots, chaining each one to the hash before it.
      // No link to matricNumber anywhere in this table.
      for (const vote of votes) {
        const castAt = new Date();
        const hash = computeVoteHash(runningHash, vote.candidateId, vote.position, castAt);

        await tx.vote.create({
          data: {
            candidateId: vote.candidateId,
            position: vote.position,
            castAt,
            prevHash: runningHash,
            hash,
          },
        });

        runningHash = hash;
      }

      // Advance the anchor so the next transaction (once it acquires the lock)
      // chains from here.
      await tx.$executeRaw`
        UPDATE vote_chain_state SET latest_hash = ${runningHash} WHERE id = 1
      `;

      // Separate, unlinked receipt proving "this student voted" without
      // revealing what they voted for.
      const receipt = crypto
        .createHash("sha256")
        .update(`${matricNumber}:${process.env.ELECTION_SALT}:${Date.now()}`)
        .digest("hex");

      await tx.voteReceipt.create({ data: { receiptHash: receipt } });

      return receipt;
    });

    destroyVoterSession();

    return NextResponse.json({
      message: "Vote cast successfully.",
      receipt: receiptHash,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_VOTED_OR_INELIGIBLE") {
      destroyVoterSession();
      return NextResponse.json(
        { error: "This voter has already cast a ballot or is not eligible." },
        { status: 403 }
      );
    }
    console.error("Vote transaction failed:", err);
    return NextResponse.json({ error: "Vote could not be recorded. Try again." }, { status: 500 });
  }
}

