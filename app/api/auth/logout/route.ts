import { NextResponse } from "next/server";
import { destroyVoterSession } from "@/lib/session";

export async function POST() {
  await destroyVoterSession();
  return NextResponse.json({ success: true });
}
