import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { voterRegistrationSchema } from "@/lib/validation";
import { uploadIdCard } from "@/lib/storage";
import { sendRegistrationReceivedEmail } from "@/lib/email";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const parsed = voterRegistrationSchema.safeParse({
    matricNumber: formData.get("matricNumber"),
    name: formData.get("name"),
    email: formData.get("email"),
    documentType: formData.get("documentType") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { matricNumber, name, email, documentType } = parsed.data;

  const file = formData.get("idCard") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: documentType === "courseform" ? "Course form document is required" : "ID card photo is required" },
      { status: 400 }
    );
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "File must be JPEG, PNG, WebP, or PDF" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
  }

  const existing = await db.voter.findFirst({
    where: { OR: [{ matricNumber }, { email }] },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A registration with this matric number or email already exists." },
      { status: 409 }
    );
  }

  // Upload to private object storage — idCardUrl stores the storage KEY,
  // never a public URL. Admins view it via a short-lived signed URL only.
  const idCardUrl = await uploadIdCard(file, matricNumber);

  const voter = await db.voter.create({
    data: { matricNumber, name, email, idCardUrl, documentType, status: "pending" },
  });

  await sendRegistrationReceivedEmail(voter.email, voter.name);

  return NextResponse.json({
    message: "Registration submitted. Await admin verification.",
    matricNumber: voter.matricNumber,
  });
}
