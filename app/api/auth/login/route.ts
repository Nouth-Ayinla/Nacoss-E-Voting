import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { withDbRequestContext } from "@/lib/db-context";
import { createVoterSession } from "@/lib/session";
import { voterLoginSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { syncElectionState } from "@/lib/election";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateCheck = await checkRateLimit(`voter-login:${ip}`, 5, 60 * 1000);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: `Too many login attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = voterLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { pin } = parsed.data;

  // Rate limit per PIN to prevent brute force attacks on specific codes
  const pinRateCheck = await checkRateLimit(`voter-login-pin:${pin}`, 5, 15 * 60 * 1000);
  if (!pinRateCheck.success) {
    return NextResponse.json(
      { error: "Too many login attempts with this code. Please try again in 15 minutes." },
      { status: 429 }
    );
  }

  await syncElectionState();

  const config = await withDbRequestContext({ role: "public" }, async (tx) => {
    return tx.electionConfig.findUnique({ where: { id: 1 } });
  });
  const electionState = config?.state ?? "upcoming";
  if (electionState !== "ongoing") {
    return NextResponse.json(
      { error: `Voting is currently unavailable (${electionState} phase).` },
      { status: 403 }
    );
  }

  const hashedPin = crypto.createHash("sha256").update(pin).digest("hex");
  let voter = await withDbRequestContext({ role: "public" }, async (tx) => {
    return tx.voter.findFirst({
      where: { pinHash: hashedPin },
    });
  });

  if (!voter) {
    // Fallback: Check if it matches any legacy bcrypt PINs of verified, eligible voters
    const verifiedVoters = await withDbRequestContext({ role: "public" }, async (tx) => {
      return tx.voter.findMany({
        where: { status: "verified", hasVoted: false },
      });
    });

    for (const candidateVoter of verifiedVoters) {
      if (candidateVoter.pinHash && (candidateVoter.pinHash.startsWith("$2a$") || candidateVoter.pinHash.startsWith("$2b$"))) {
        const pinMatches = await bcrypt.compare(pin, candidateVoter.pinHash);
        if (pinMatches) {
          voter = candidateVoter;
          // Upgrade this voter's pinHash to SHA-256 for future requests
          await withDbRequestContext({ role: "admin" }, async (tx) => {
            await tx.voter.update({
              where: { matricNumber: candidateVoter.matricNumber },
              data: { pinHash: hashedPin },
            });
          });
          break;
        }
      }
    }
  }

  const invalidResponse = NextResponse.json(
    { error: "Invalid voting code." },
    { status: 401 }
  );

  if (!voter) return invalidResponse;

  if (voter.status !== "verified") {
    return NextResponse.json(
      { error: "Your voter registration is pending approval or has been rejected." },
      { status: 403 }
    );
  }

  if (voter.hasVoted) {
    return NextResponse.json(
      { error: "You have already cast your ballot in this election." },
      { status: 403 }
    );
  }

  await createVoterSession(voter.matricNumber);

  return NextResponse.json({ message: "Authenticated." });
}
