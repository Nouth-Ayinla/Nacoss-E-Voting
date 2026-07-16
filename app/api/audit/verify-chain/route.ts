import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/session";

function computeVoteHash(prevHash: string, candidateId: string, position: string, castAt: Date): string {
  return crypto
    .createHash("sha256")
    .update(`${prevHash}:${candidateId}:${position}:${castAt.toISOString()}`)
    .digest("hex");
}

export async function GET() {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const votes = await db.vote.findMany({ orderBy: { castAt: "asc" } });
  const anchor = await db.voteChainState.findUnique({ where: { id: 1 } });

  let runningHash = "GENESIS";
  for (const vote of votes) {
    if (vote.prevHash !== runningHash) {
      return NextResponse.json({
        valid: false,
        checkedCount: votes.length,
        brokenAt: vote.id,
        reason: "prevHash does not match the running chain — a vote may have been inserted, edited, or deleted out of order.",
      });
    }
    const expectedHash = computeVoteHash(vote.prevHash, vote.candidateId, vote.position, vote.castAt);
    if (expectedHash !== vote.hash) {
      return NextResponse.json({
        valid: false,
        checkedCount: votes.length,
        brokenAt: vote.id,
        reason: "Stored hash does not match the recomputed hash — this vote's data has been altered.",
      });
    }
    runningHash = vote.hash;
  }

  const anchorMatches = anchor?.latestHash === runningHash;

  return NextResponse.json({
    valid: anchorMatches,
    checkedCount: votes.length,
    reason: anchorMatches
      ? null
      : "Chain anchor does not match the last vote — possible tampering or a missed update.",
  });
}
