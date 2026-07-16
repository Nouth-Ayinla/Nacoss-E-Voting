import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createAdminSession } from "@/lib/session";
import { adminLoginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const admin = await db.admin.findUnique({ where: { email } });
  // Deliberately vague error — don't reveal whether the email exists
  const invalidResponse = NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  if (!admin) return invalidResponse;

  const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordMatches) return invalidResponse;



  await createAdminSession(admin.id);

  return NextResponse.json({ message: "Logged in." });
}

