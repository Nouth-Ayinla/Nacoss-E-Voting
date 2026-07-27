import { NextRequest, NextResponse } from "next/server";
import { withDbRequestContext } from "@/lib/db-context";
import { verifyAdminSession } from "@/lib/session";
import { candidateSchema, verifyBase64ImageMagic } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminSession();
  console.log("GET /api/candidates - admin session verified:", !!admin);

  return withDbRequestContext({ role: "public" }, async (tx) => {
    const candidates = await tx.candidate.findMany({ orderBy: { position: "asc" } });

    return NextResponse.json(candidates);
  });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = candidateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // N4: Verify magic bytes if a base64 data URI is provided
  if (parsed.data.imageUrl?.startsWith("data:")) {
    if (!verifyBase64ImageMagic(parsed.data.imageUrl)) {
      return NextResponse.json(
        { error: "Image file is corrupt or does not match its declared type." },
        { status: 400 }
      );
    }
  }

  return withDbRequestContext({ role: "admin", adminId: admin.adminId }, async (tx) => {
    const candidate = await tx.candidate.create({ data: parsed.data });

    await tx.auditLog.create({
      data: { adminId: admin.adminId, action: "candidate_create", metadata: { candidateId: candidate.id } },
    });

    return NextResponse.json(candidate, { status: 201 });
  });
}
