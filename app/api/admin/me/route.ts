import { NextResponse } from "next/server";
import { withDbRequestContext } from "@/lib/db-context";
import { verifyAdminSession } from "@/lib/session";

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return withDbRequestContext({ role: "admin", adminId: session.adminId }, async (tx) => {
    const admin = await tx.admin.findUnique({
      where: { id: session.adminId },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(admin);
  });
}
