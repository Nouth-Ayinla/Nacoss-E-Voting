import { NextResponse } from "next/server";
import { withDbRequestContext } from "@/lib/db-context";
import { verifyAdminSession } from "@/lib/session";

export async function GET() {
  const admin = await verifyAdminSession();

  if (!admin) {
    return withDbRequestContext({ role: "public" }, async (tx) => {
      const config = await tx.electionConfig.findUnique({ where: { id: 1 } });
      if (!config || !config.resultsPublished) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const candidates = await tx.candidate.findMany();
      const voteCounts = await tx.vote.groupBy({
        by: ["candidateId", "position"],
        _count: { id: true },
      });

      const totalVotesCast = await tx.voteReceipt.count();
      const totalVerifiedVoters = await tx.voter.count({ where: { status: "verified" } });

      const resultsByPosition: Record<
        string,
        { candidateId: string; name: string; imageUrl: string | null; votes: number }[]
      > = {};

      for (const candidate of candidates) {
        const match = voteCounts.find((v) => v.candidateId === candidate.id);
        const count = match?._count.id ?? 0;
        if (!resultsByPosition[candidate.position]) resultsByPosition[candidate.position] = [];
        resultsByPosition[candidate.position].push({
          candidateId: candidate.id,
          name: candidate.name,
          imageUrl: candidate.imageUrl?.startsWith("data:") ? null : (candidate.imageUrl ?? null),
          votes: count,
        });
      }

      for (const position in resultsByPosition) {
        resultsByPosition[position].sort((a, b) => b.votes - a.votes);
      }

      return NextResponse.json({
        resultsByPosition,
        totalVotesCast,
        totalVerifiedVoters,
        turnoutPercent: totalVerifiedVoters > 0 ? Math.round((totalVotesCast / totalVerifiedVoters) * 1000) / 10 : 0,
        resultsPublished: config?.resultsPublished ?? false,
      });
    });
  }

  return withDbRequestContext({ role: "admin", adminId: admin.adminId }, async (tx) => {
    const candidates = await tx.candidate.findMany();

    const voteCounts = await tx.vote.groupBy({
      by: ["candidateId", "position"],
      _count: { id: true },
    });

    const totalVotesCast = await tx.voteReceipt.count();
    const totalVerifiedVoters = await tx.voter.count({ where: { status: "verified" } });

    const resultsByPosition: Record<
      string,
      { candidateId: string; name: string; imageUrl: string | null; votes: number }[]
    > = {};

    for (const candidate of candidates) {
      const match = voteCounts.find((v) => v.candidateId === candidate.id);
      const count = match?._count.id ?? 0;
      if (!resultsByPosition[candidate.position]) resultsByPosition[candidate.position] = [];
      resultsByPosition[candidate.position].push({
        candidateId: candidate.id,
        name: candidate.name,
        imageUrl: candidate.imageUrl,
        votes: count,
      });
    }

    for (const position in resultsByPosition) {
      resultsByPosition[position].sort((a, b) => b.votes - a.votes);
    }

    const config = await tx.electionConfig.findUnique({ where: { id: 1 } });

    return NextResponse.json({
      resultsByPosition,
      totalVotesCast,
      totalVerifiedVoters,
      turnoutPercent: totalVerifiedVoters > 0 ? Math.round((totalVotesCast / totalVerifiedVoters) * 1000) / 10 : 0,
      resultsPublished: config?.resultsPublished ?? false,
    });
  });
}
