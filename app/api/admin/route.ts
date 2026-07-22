import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withDbRequestContext } from "@/lib/db-context";
import { verifyAdminSession } from "@/lib/session";
import { adminCreateSchema } from "@/lib/validation";

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return withDbRequestContext({ role: "admin", adminId: session.adminId }, async (tx) => {
    const admins = await tx.admin.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(admins);
  });
}

export async function POST(req: NextRequest) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = adminCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, role } = parsed.data;

  return withDbRequestContext({ role: "admin", adminId: session.adminId }, async (tx) => {
    // Get requester info to check if they are a superadmin
    const requester = await tx.admin.findUnique({
      where: { id: session.adminId },
    });
    if (!requester || requester.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: Only superadmins can add administrators" }, { status: 403 });
    }

    // Check if admin already exists
    const existing = await tx.admin.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An administrator with this email already exists." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newAdmin = await tx.admin.create({
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
    await tx.auditLog.create({
      data: {
        adminId: session.adminId,
        action: "admin_create",
        metadata: { targetAdminId: newAdmin.id, targetAdminEmail: newAdmin.email, targetAdminRole: newAdmin.role },
      },
    });

    return NextResponse.json(newAdmin);
  });
}
