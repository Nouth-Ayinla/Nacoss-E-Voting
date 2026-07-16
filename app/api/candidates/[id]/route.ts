import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/session";
import { candidateSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = candidateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const candidate = await db.candidate.update({ where: { id }, data: parsed.data });

  await db.auditLog.create({
    data: { adminId: admin.adminId, action: "candidate_update", metadata: { candidateId: id } },
  });

  return NextResponse.json(candidate);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.candidate.delete({ where: { id } });

  await db.auditLog.create({
    data: { adminId: admin.adminId, action: "candidate_delete", metadata: { candidateId: id } },
  });

  return NextResponse.json({ message: "Candidate deleted." });
}
