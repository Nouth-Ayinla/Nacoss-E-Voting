import { NextRequest, NextResponse } from "next/server";
import { withDbRequestContext } from "@/lib/db-context";
import { verifyAdminSession } from "@/lib/session";
import { electionStateSchema } from "@/lib/validation";
import { syncElectionState } from "@/lib/election";

export async function GET() {
  await syncElectionState();
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
      responseData.totalVotesCast = (await tx.voteReceipt.count()) * 3;
      responseData.totalVerifiedVoters = (await tx.voter.count({ where: { status: "verified" } })) * 3;
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

  const config = await withDbRequestContext({ role: "admin", adminId: admin.adminId }, async (tx) => {
    const currentConfig = await tx.electionConfig.findUnique({ where: { id: 1 } });

    const updateData: any = {};
    if (state !== undefined) updateData.state = state;
    if (startTime !== undefined) updateData.startTime = startTime ? new Date(startTime) : null;
    if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null;
    if (resultsPublished !== undefined) updateData.resultsPublished = resultsPublished;
    if (electionName !== undefined) updateData.electionName = electionName;

    // Default timings if transitioning to ongoing and not already set
    if (state === "ongoing") {
      if (startTime === undefined && !currentConfig?.startTime) {
        updateData.startTime = new Date();
      }
      if (endTime === undefined) {
        const existingEnd = currentConfig?.endTime;
        if (!existingEnd || new Date(existingEnd).getTime() <= Date.now()) {
          updateData.endTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }
      }
    }

    const res = await tx.electionConfig.upsert({
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

    return res;
  });

  // Trigger sync in case newly saved times should change the state
  const synced = await syncElectionState();
  return NextResponse.json(synced || config);
}
