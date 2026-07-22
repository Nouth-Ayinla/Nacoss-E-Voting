import { NextRequest, NextResponse } from "next/server";
import { withDbRequestContext } from "@/lib/db-context";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rateCheck = await checkRateLimit(`voter-status:${ip}`, 10, 60 * 1000);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Please wait ${rateCheck.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const matricNumber = searchParams.get("matricNumber");

  if (!matricNumber) {
    return NextResponse.json({ error: "Matric number is required" }, { status: 400 });
  }

  try {
    const voter = await withDbRequestContext({ role: "public", matricNumber: matricNumber.trim() }, async (tx) =>
      tx.voter.findUnique({
        where: { matricNumber: matricNumber.trim() },
        select: {
          status: true,
          rejectionReason: true,
        },
      })
    );

    if (!voter) {
      return NextResponse.json({ status: "not_found" });
    }

    return NextResponse.json({
      status: voter.status,
      // Rejection reason is intentionally omitted from this unauthenticated
      // endpoint to prevent enumeration of sensitive admin decisions.
      // The reason is delivered privately to the voter's registered email.
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
