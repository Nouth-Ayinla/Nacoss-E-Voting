import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 200);

  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { admin: { select: { email: true } } },
  });

  return NextResponse.json({ logs });
}
