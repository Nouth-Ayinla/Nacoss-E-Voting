import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/session";
import { candidateSchema } from "@/lib/validation";

export async function GET() {
  const candidates = await db.candidate.findMany({ orderBy: { position: "asc" } });
  return NextResponse.json(candidates);
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = candidateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const candidate = await db.candidate.create({ data: parsed.data });

  await db.auditLog.create({
    data: { adminId: admin.adminId, action: "candidate_create", metadata: { candidateId: candidate.id } },
  });

  return NextResponse.json(candidate, { status: 201 });
}
