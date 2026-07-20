import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify superadmin privilege
  const requester = await db.admin.findUnique({ where: { id: session.adminId } });
  if (!requester || requester.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden: Only superadmins can view audit logs" }, { status: 403 });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 200);

  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { admin: { select: { email: true } } },
  });

  return NextResponse.json({ logs });
}
