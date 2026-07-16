import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createVoterSession } from "@/lib/session";
import { voterLoginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = voterLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { matricNumber, pin } = parsed.data;

  const voter = await db.voter.findUnique({
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
}
