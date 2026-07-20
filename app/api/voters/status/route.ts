import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const matricNumber = searchParams.get("matricNumber");

  if (!matricNumber) {
    return NextResponse.json({ error: "Matric number is required" }, { status: 400 });
  }

  try {
    const voter = await db.voter.findUnique({
      where: { matricNumber: matricNumber.trim() },
      select: {
        status: true,
        rejectionReason: true,
      },
    });

    if (!voter) {
      return NextResponse.json({ status: "not_found" });
    }

    return NextResponse.json({
      status: voter.status,
      rejectionReason: voter.rejectionReason,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
