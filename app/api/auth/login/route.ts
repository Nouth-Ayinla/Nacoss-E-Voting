import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withDbRequestContext } from "@/lib/db-context";
import { createVoterSession } from "@/lib/session";
import { voterLoginSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

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

  // Per-matric rate limit: caps distributed attacks targeting one specific voter
  // across many IP addresses. 10 attempts per 15 minutes per matric number.
  const matricRateCheck = await checkRateLimit(`voter-login-matric:${parsed.data.matricNumber}`, 10, 15 * 60 * 1000);
  if (!matricRateCheck.success) {
    return NextResponse.json(
      { error: `Too many login attempts for this account. Please try again in ${matricRateCheck.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  const { matricNumber, pin } = parsed.data;

  return withDbRequestContext({ role: "public" }, async (tx) => {
    // Verify election state is ongoing
    const config = await tx.electionConfig.findUnique({ where: { id: 1 } });
    const electionState = config?.state ?? "upcoming";
    if (electionState !== "ongoing") {
      return NextResponse.json(
        { error: `Voting is currently unavailable (${electionState} phase).` },
        { status: 403 }
      );
    }

    const voter = await tx.voter.findUnique({
      where: { matricNumber },
    });

    const invalidResponse = NextResponse.json(
      { error: "Invalid matric number or PIN." },
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

    if (!voter.pinHash) {
      return invalidResponse;
    }

    const pinMatches = await bcrypt.compare(pin, voter.pinHash);
    if (!pinMatches) return invalidResponse;

    await createVoterSession(voter.matricNumber);

    return NextResponse.json({ message: "Authenticated." });
  });
}
