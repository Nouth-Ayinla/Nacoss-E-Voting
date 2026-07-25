import { NextRequest, NextResponse } from "next/server";
import { withDbRequestContext } from "@/lib/db-context";
import { verifyAdminSession } from "@/lib/session";
import { electionStateSchema } from "@/lib/validation";

export async function GET() {
  return withDbRequestContext({ role: "public" }, async (tx) => {
    const config = await tx.electionConfig.findUnique({ where: { id: 1 } });
    const responseData: any = {
      state: config?.state ?? "upcoming",
      startTime: config?.startTime ?? null,
      endTime: config?.endTime ?? null,
      resultsPublished: config?.resultsPublished ?? false,
      electionName: config?.electionName ?? "NACOSS FUTA CHAPTER 2026 ELECTIONS",
    };

    // If an admin requests this state, append administrative statistics
    const admin = await verifyAdminSession();
    if (admin) {
      responseData.totalVotesCast = await tx.voteReceipt.count();
      responseData.totalVerifiedVoters = await tx.voter.count({ where: { status: "verified" } });
      responseData.totalCandidates = await tx.candidate.count();
      responseData.candidates = await tx.candidate.findMany({
        select: { id: true, name: true, position: true, imageUrl: true },
        orderBy: { position: "asc" },
      });
    }

    return NextResponse.json(responseData);
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = electionStateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { state, startTime, endTime, resultsPublished, electionName } = parsed.data;

  const updateData: any = {};
  if (state !== undefined) updateData.state = state;
  if (startTime !== undefined) updateData.startTime = startTime ? new Date(startTime) : null;
  if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null;
  if (resultsPublished !== undefined) updateData.resultsPublished = resultsPublished;
  if (electionName !== undefined) updateData.electionName = electionName;

  return withDbRequestContext({ role: "admin", adminId: admin.adminId }, async (tx) => {
    const config = await tx.electionConfig.upsert({
      where: { id: 1 },
      update: updateData,
      create: { id: 1, ...updateData },
    });

    await tx.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: "election_config_change",
        metadata: { state, startTime, endTime, resultsPublished, electionName },
      },
    });

    return NextResponse.json(config);
  });
}
