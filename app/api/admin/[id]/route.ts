import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/session";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get requester info to check if they are a superadmin
  const requester = await db.admin.findUnique({
    where: { id: session.adminId },
  });
  if (!requester || requester.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden: Only superadmins can delete administrators" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent self deletion
  if (id === session.adminId) {
    return NextResponse.json({ error: "Bad Request: You cannot delete your own account" }, { status: 400 });
  }

  const targetAdmin = await db.admin.findUnique({ where: { id } });
  if (!targetAdmin) {
    return NextResponse.json({ error: "Administrator not found" }, { status: 404 });
  }

  // Prevent deletion of primary superadmin if configured in environment variables
  const primarySuperadminEmail = process.env.SUPERADMIN_PRIMARY_EMAIL;
  if (primarySuperadminEmail && targetAdmin.email.toLowerCase() === primarySuperadminEmail.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden: The primary superadmin account cannot be deleted" }, { status: 403 });
  }

  // Check if they are deleting the last superadmin
  if (targetAdmin.role === "superadmin") {
    const superadminCount = await db.admin.count({ where: { role: "superadmin" } });
    if (superadminCount <= 1) {
      return NextResponse.json({ error: "Bad Request: You cannot delete the last remaining superadmin" }, { status: 400 });
    }
  }

  await db.admin.delete({ where: { id } });

  // Log in AuditLog
  await db.auditLog.create({
    data: {
      adminId: session.adminId,
      action: "admin_delete",
      metadata: { targetAdminId: id, targetAdminEmail: targetAdmin.email },
    },
  });

  return NextResponse.json({ message: "Administrator successfully deleted." });
}
