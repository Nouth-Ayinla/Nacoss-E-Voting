import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/session";
import { getSignedIdCardUrl } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const matricNumber = searchParams.get("matricNumber");
  if (!matricNumber) {
    return NextResponse.json({ error: "Missing matricNumber parameter" }, { status: 400 });
  }

  const voter = await db.voter.findUnique({ where: { matricNumber } });
  if (!voter) return NextResponse.json({ error: "Voter not found" }, { status: 404 });

  const signedUrl = await getSignedIdCardUrl(voter.idCardUrl);

  return NextResponse.redirect(signedUrl);
}
