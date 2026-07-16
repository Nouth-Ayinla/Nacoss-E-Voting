import { NextResponse } from "next/server";
import { verifyVoterSession } from "@/lib/session";

export async function GET() {
  const session = await verifyVoterSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({ authenticated: true, matricNumber: session.matricNumber });
}
