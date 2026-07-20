import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/session";
import { adminCreateSchema } from "@/lib/validation";

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admins = await db.admin.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(admins);
}

export async function POST(req: NextRequest) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get requester info to check if they are a superadmin
  const requester = await db.admin.findUnique({
    where: { id: session.adminId },
  });
  if (!requester || requester.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden: Only superadmins can add administrators" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = adminCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, role } = parsed.data;

  // Check if admin already exists
  const existing = await db.admin.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An administrator with this email already exists." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const newAdmin = await db.admin.create({
    data: {
      email,
      passwordHash,
      role,
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  // Log in AuditLog
  await db.auditLog.create({
    data: {
      adminId: session.adminId,
      action: "admin_create",
      metadata: { targetAdminId: newAdmin.id, targetAdminEmail: newAdmin.email, targetAdminRole: newAdmin.role },
    },
  });

  return NextResponse.json(newAdmin);
}
