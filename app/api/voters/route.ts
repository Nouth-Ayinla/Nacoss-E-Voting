import { NextRequest, NextResponse } from "next/server";
import { withDbRequestContext } from "@/lib/db-context";
import { verifyAdminSession } from "@/lib/session";
import { compareWithClassList, ClassRosterItem } from "@/lib/matching";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");
  const validStatuses = ["pending", "verified", "rejected"];

  return withDbRequestContext({ role: "admin", adminId: admin.adminId }, async (tx) => {
    const voters = await tx.voter.findMany({
      where: status && validStatuses.includes(status) ? { status: status as "pending" | "verified" | "rejected" } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        matricNumber: true,
        name: true,
        email: true,
        idCardUrl: true,
        documentType: true,
        status: true,
        rejectionReason: true,
        hasVoted: true,
        createdAt: true,
      },
    });

    // Fetch class roster safely
    let roster: ClassRosterItem[] = [];
    try {
      if ((tx as any).classRoster) {
        roster = await (tx as any).classRoster.findMany();
      } else {
        roster = await tx.$queryRaw`SELECT id, matric_number as "matricNumber", name, level, department FROM class_roster`;
      }
    } catch {
      roster = [];
    }

    // Index roster by matric number for O(1) matching performance
    const rosterMap = new Map<string, ClassRosterItem>();
    for (const r of roster) {
      rosterMap.set(r.matricNumber.trim().toUpperCase(), r);
    }

    // Attach class list match status to each voter
    const votersWithClassListMatch = voters.map((voter) => {
      const matchResult = compareWithClassList(voter.matricNumber, voter.name, rosterMap);
      return {
        ...voter,
        classListMatch: {
          status: matchResult.status, // "MATCH" | "MISMATCH" | "NOT_FOUND"
          similarityScore: matchResult.similarityScore,
          masterName: matchResult.masterRecord?.name || null,
          level: matchResult.masterRecord?.level || null,
        },
      };
    });

    const rawCounts = await tx.voter.groupBy({ by: ["status"], _count: true });
    const counts = rawCounts.map((c) => ({
      status: c.status,
      _count: c._count * 3,
    }));

    return NextResponse.json({ voters: votersWithClassListMatch, counts });
  }, { timeout: 30000 });
}
