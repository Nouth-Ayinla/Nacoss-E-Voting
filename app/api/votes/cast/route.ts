import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { withDbRequestContext } from "@/lib/db-context";
import { verifyVoterSession, destroyVoterSession } from "@/lib/session";
import { voteCastSchema } from "@/lib/validation";
import { syncElectionState } from "@/lib/election";

function computeVoteHash(prevHash: string, candidateId: string, position: string, choice: string, castAt: Date): string {
  return crypto
    .createHash("sha256")
    .update(`${prevHash}:${candidateId}:${position}:${choice}:${castAt.toISOString()}`)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  await syncElectionState();
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
    const receiptHash = await withDbRequestContext({ role: "voter", matricNumber }, async (tx) => {
      // 1. Verify election state is ongoing
      const config = await tx.electionConfig.findUnique({ where: { id: 1 } });
      if (config?.state !== "ongoing") {
        throw new Error("ELECTION_NOT_ONGOING");
      }

      // 2. Validate candidate position integrity
      for (const vote of votes) {
        const candidate = await tx.candidate.findUnique({
          where: { id: vote.candidateId },
          select: { id: true, position: true },
        });

        if (!candidate || candidate.position !== vote.position) {
          throw new Error("INVALID_CANDIDATE_POSITION");
        }
      }

      // 3. Atomic check-and-set: UPDATE ... WHERE has_voted = FALSE is a single
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
      const anchor = await tx.$queryRaw<{ latest_hash: string }[]>`
        SELECT latest_hash FROM vote_chain_state WHERE id = 1 FOR UPDATE
      `;
      let runningHash = anchor[0]?.latest_hash ?? "GENESIS";

      // Insert anonymous ballots, chaining each one to the hash before it.
      for (const vote of votes) {
        const castAt = new Date();
        const hash = computeVoteHash(runningHash, vote.candidateId, vote.position, vote.choice, castAt);

        await tx.vote.create({
          data: {
            candidateId: vote.candidateId,
            position: vote.position,
            choice: vote.choice,
            castAt,
            prevHash: runningHash,
            hash,
          },
        });

        runningHash = hash;
      }

      // Advance the anchor so the next transaction chains from here.
      await tx.$executeRaw`
        UPDATE vote_chain_state SET latest_hash = ${runningHash} WHERE id = 1
      `;

      const electionSalt = process.env.ELECTION_SALT;
      if (!electionSalt) throw new Error("ELECTION_SALT environment variable is not set.");
      const receipt = crypto
        .createHash("sha256")
        .update(`${matricNumber}:${electionSalt}:${crypto.randomBytes(16).toString("hex")}`)
        .digest("hex");

      await tx.voteReceipt.create({ data: { receiptHash: receipt } });

      return receipt;
    });

    await destroyVoterSession();

    return NextResponse.json({
      message: "Vote cast successfully.",
      receipt: receiptHash,
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "ALREADY_VOTED_OR_INELIGIBLE") {
        await destroyVoterSession();
        return NextResponse.json(
          { error: "This voter has already cast a ballot or is not eligible." },
          { status: 403 }
        );
      }
      if (err.message === "ELECTION_NOT_ONGOING") {
        await destroyVoterSession();
        return NextResponse.json(
          { error: "Election is not currently active for voting." },
          { status: 403 }
        );
      }
      if (err.message === "INVALID_CANDIDATE_POSITION") {
        return NextResponse.json(
          { error: "Ballot validation failed: candidate does not match position." },
          { status: 400 }
        );
      }
    }
    console.error("Vote transaction failed:", err);
    return NextResponse.json({ error: "Vote could not be recorded. Try again." }, { status: 500 });
  }
}
