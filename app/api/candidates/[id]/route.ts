import { NextRequest, NextResponse } from "next/server";
import { withDbRequestContext } from "@/lib/db-context";
import { verifyAdminSession } from "@/lib/session";
import { candidateSchema, verifyBase64ImageMagic } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = candidateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify magic bytes if a base64 data URI is provided
  if (parsed.data.imageUrl?.startsWith("data:")) {
    if (!verifyBase64ImageMagic(parsed.data.imageUrl)) {
      return NextResponse.json(
        { error: "Image file is corrupt or does not match its declared type." },
        { status: 400 }
      );
    }
  }

  return withDbRequestContext({ role: "admin", adminId: admin.adminId }, async (tx) => {
    const candidate = await tx.candidate.update({ where: { id }, data: parsed.data });

    await tx.auditLog.create({
      data: { adminId: admin.adminId, action: "candidate_update", metadata: { candidateId: id } },
    });

    return NextResponse.json(candidate);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  return withDbRequestContext({ role: "admin", adminId: admin.adminId }, async (tx) => {
    await tx.candidate.delete({ where: { id } });

    await tx.auditLog.create({
      data: { adminId: admin.adminId, action: "candidate_delete", metadata: { candidateId: id } },
    });

    return NextResponse.json({ message: "Candidate deleted." });
  });
}
