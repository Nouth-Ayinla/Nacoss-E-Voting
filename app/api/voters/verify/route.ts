import { NextRequest, NextResponse } from "next/server";
import { withDbRequestContext } from "@/lib/db-context";
import { verifyAdminSession } from "@/lib/session";
import { voterVerifyActionSchema } from "@/lib/validation";
import { sendVerificationResultEmail } from "@/lib/email";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const admin = await verifyAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = voterVerifyActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { matricNumber, action, rejectionReason } = parsed.data;

  if (action === "reject" && !rejectionReason) {
    return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
  }

  let pin: string | undefined;
  let pinHash: string | null = null;
  if (action === "approve") {
    pin = crypto.randomInt(100000, 999999).toString();
    pinHash = await bcrypt.hash(pin, 12);
  }

  try {
    await withDbRequestContext({ role: "admin", adminId: admin.adminId }, async (tx) => {
      const voter = await tx.voter.update({
        where: { matricNumber },
        data: {
          status: action === "approve" ? "verified" : "rejected",
          rejectionReason: action === "reject" ? rejectionReason : null,
          pinHash: action === "approve" ? pinHash : undefined,
        },
      });

      // Insert-only audit trail — never updated or deleted at the DB permission level
      await tx.auditLog.create({
        data: {
          adminId: admin.adminId,
          action: `voter_${action}`,
          metadata: { matricNumber, rejectionReason },
        },
      });

      await sendVerificationResultEmail(
        voter.email,
        action === "approve" ? "verified" : "rejected",
        action === "approve" ? pin : rejectionReason
      );
    });

    return NextResponse.json({ message: `Voter ${action}d successfully.` });
  } catch (error: any) {
    console.error("Voter verification transaction failed:", error);
    return NextResponse.json(
      { error: "Failed to verify voter and send notification email." },
      { status: 500 }
    );
  }
}
