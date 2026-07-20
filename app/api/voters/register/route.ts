import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { voterRegistrationSchema } from "@/lib/validation";
import { uploadIdCard } from "@/lib/storage";
import { sendRegistrationReceivedEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DAILY_REGISTRATION_LIMIT = 120;

export async function GET() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayCount = await db.voter.count({
    where: {
      createdAt: { gte: startOfDay },
    },
  });

  return NextResponse.json({
    dailyCount: todayCount,
    dailyLimit: DAILY_REGISTRATION_LIMIT,
    remaining: Math.max(0, DAILY_REGISTRATION_LIMIT - todayCount),
    isFull: todayCount >= DAILY_REGISTRATION_LIMIT,
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`voter-register:${ip}`, 5, 60 * 1000);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: `Too many registration attempts. Please wait ${rateCheck.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  // Daily registration limit check (capped at 120 per day, resets at 00:00 AM)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayCount = await db.voter.count({
    where: {
      createdAt: { gte: startOfDay },
    },
  });

  if (todayCount >= DAILY_REGISTRATION_LIMIT) {
    return NextResponse.json(
      { error: `Daily registration limit reached (120/120). Registration resets tomorrow at 00:00 AM.` },
      { status: 429 }
    );
  }

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

  const idCardUrl = await uploadIdCard(file, matricNumber);

  try {
    const voter = await db.$transaction(async (tx) => {
      const createdVoter = await tx.voter.create({
        data: { matricNumber, name, email, idCardUrl, documentType, status: "pending" },
      });

      await sendRegistrationReceivedEmail(createdVoter.email, createdVoter.name);
      return createdVoter;
    });

    return NextResponse.json({
      message: "Registration submitted. Await admin verification.",
      matricNumber: voter.matricNumber,
    });
  } catch (error: any) {
    console.error("Voter registration transaction failed:", error);
    return NextResponse.json(
      { error: "Failed to register voter. Please verify details and try again." },
      { status: 500 }
    );
  }
}
