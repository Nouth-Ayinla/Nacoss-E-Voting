import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/session";

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await db.admin.findUnique({
    where: { id: session.adminId },
    select: { email: true },
  });
  if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 });

  return NextResponse.json({ email: admin.email });
}
