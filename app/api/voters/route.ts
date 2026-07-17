import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");
  const validStatuses = ["pending", "verified", "rejected"];

  const voters = await db.voter.findMany({
    where: status && validStatuses.includes(status) ? { status: status as "pending" | "verified" | "rejected" } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      matricNumber: true,
      name: true,
      email: true,
      idCardUrl: true,
      documentType: true,
      status: true,
      rejectionReason: true,
      hasVoted: true,
      createdAt: true,
    },
  });

  const counts = await db.voter.groupBy({ by: ["status"], _count: true });

  return NextResponse.json({ voters, counts });
}
