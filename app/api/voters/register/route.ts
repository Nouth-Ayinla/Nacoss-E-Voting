import { NextRequest, NextResponse } from "next/server";
import { withDbRequestContext } from "@/lib/db-context";
import { voterRegistrationSchema } from "@/lib/validation";
import { uploadIdCard } from "@/lib/storage";
import { sendRegistrationReceivedEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { syncElectionState } from "@/lib/election";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DAILY_REGISTRATION_LIMIT = 120;

export async function GET() {
  await syncElectionState();
  return withDbRequestContext({ role: "voter-register" }, async (tx) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayCount = await tx.voter.count({
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
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateCheck = await checkRateLimit(`voter-register:${ip}`, 5, 60 * 1000);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: `Too many registration attempts. Please wait ${rateCheck.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  await syncElectionState();
  const config = await withDbRequestContext({ role: "public" }, async (tx) =>
    tx.electionConfig.findUnique({ where: { id: 1 } })
  );

  if (config && config.state === "ended") {
    return NextResponse.json(
      { error: "Registration is closed. The election has ended." },
      { status: 403 }
    );
  }

  // Daily registration limit check (capped at 120 per day, resets at 00:00 AM)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

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

  const todayCount = await withDbRequestContext(
    { role: "voter-register", matricNumber, email },
    async (tx) => tx.voter.count({ where: { createdAt: { gte: startOfDay } } })
  );

  if (todayCount >= DAILY_REGISTRATION_LIMIT) {
    return NextResponse.json(
      { error: `Daily registration limit reached (120/120). Registration resets tomorrow at 00:00 AM.` },
      { status: 429 }
    );
  }

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

  // Check if a voter with this matric number already exists
  const existingByMatric = await withDbRequestContext({ role: "voter-register", matricNumber }, async (tx) =>
    tx.voter.findUnique({ where: { matricNumber } })
  );

  if (existingByMatric && existingByMatric.hasVoted) {
    return NextResponse.json(
      { error: "This account has already cast a ballot and cannot register again." },
      { status: 403 }
    );
  }

  if (existingByMatric && existingByMatric.status !== "rejected") {
    return NextResponse.json(
      { error: "A registration with this matric number already exists." },
      { status: 409 }
    );
  }

  // Check if a voter with this email already exists
  const existingByEmail = await withDbRequestContext({ role: "voter-register", email }, async (tx) =>
    tx.voter.findUnique({ where: { email } })
  );

  if (existingByEmail) {
    if (existingByEmail.matricNumber !== matricNumber) {
      return NextResponse.json(
        { error: "A registration with this email already exists." },
        { status: 409 }
      );
    }
  }

  const idCardUrl = await uploadIdCard(file, matricNumber);

  try {
    const voter = await withDbRequestContext({ role: "voter-register", matricNumber, email }, async (tx) => {
      let resultVoter;

      if (existingByMatric) {
        // Allow rejected voters to update/re-submit their registration details
        resultVoter = await tx.voter.update({
          where: { matricNumber },
          data: {
            name,
            email,
            idCardUrl,
            documentType,
            status: "pending",
            rejectionReason: null,
            pinHash: null,
            hasVoted: false,
            createdAt: new Date(),
          },
        });
      } else {
        resultVoter = await tx.voter.create({
          data: { matricNumber, name, email, idCardUrl, documentType, status: "pending" },
        });
      }

      await sendRegistrationReceivedEmail(resultVoter.email, resultVoter.name);
      return resultVoter;
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
