import { NextRequest, NextResponse } from "next/server";
import { withDbRequestContext } from "@/lib/db-context";
import { verifyAdminSession } from "@/lib/session";
import { compareWithClassList, ClassRosterItem } from "@/lib/matching";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const levelParam = searchParams.get("level");

  const levelFilter = levelParam && levelParam !== "all" ? parseInt(levelParam, 10) : undefined;

  return withDbRequestContext({ role: "admin", adminId: admin.adminId }, async (tx) => {
    // 1. Fetch all voters
    const voters = await tx.voter.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch full class roster entries safely to determine levels
    let fullRoster: ClassRosterItem[] = [];
    try {
      if ((tx as any).classRoster) {
        fullRoster = await (tx as any).classRoster.findMany();
      } else {
        fullRoster = await tx.$queryRaw`SELECT id, matric_number as "matricNumber", name, level, department FROM class_roster`;
      }
    } catch {
      fullRoster = [];
    }

    // Index roster by matric number for O(1) matching performance
    const rosterMap = new Map<string, ClassRosterItem>();
    for (const r of fullRoster) {
      rosterMap.set(r.matricNumber.trim().toUpperCase(), r);
    }

    // 3. Cross-reference and count registered voters per level
    let matchCount = 0;
    let mismatchCount = 0;
    let notFoundCount = 0;

    const registeredByLevel = {
      100: { total: 0, verified: 0, pending: 0 },
      200: { total: 0, verified: 0, pending: 0 },
      300: { total: 0, verified: 0, pending: 0 },
      400: { total: 0, verified: 0, pending: 0 },
      500: { total: 0, verified: 0, pending: 0 },
      unknown: { total: 0, verified: 0, pending: 0 },
    };

    const items = voters.map((voter) => {
      // Find level from the full roster Map in O(1)
      const rosterEntry = rosterMap.get(voter.matricNumber.trim().toUpperCase());
      
      const level = rosterEntry ? rosterEntry.level : null;
      const target = level === 100 ? registeredByLevel[100]
                   : level === 200 ? registeredByLevel[200]
                   : level === 300 ? registeredByLevel[300]
                   : level === 400 ? registeredByLevel[400]
                   : level === 500 ? registeredByLevel[500]
                   : registeredByLevel.unknown;

      target.total++;
      if (voter.status === "verified") {
        target.verified++;
      } else if (voter.status === "pending") {
        target.pending++;
      }

      // Compute verification status against the relevant list
      const result = compareWithClassList(voter.matricNumber, voter.name, rosterMap);

      if (result.status === "MATCH") matchCount++;
      else if (result.status === "MISMATCH") mismatchCount++;
      else notFoundCount++;

      return {
        voter: {
          matricNumber: voter.matricNumber,
          name: voter.name,
          email: voter.email,
          documentType: voter.documentType,
          status: voter.status,
          rejectionReason: voter.rejectionReason,
          createdAt: voter.createdAt,
          level: level,
        },
        verificationResult: result,
      };
    });

    // If level filter is applied, filter the returned verifications list
    const filteredItems = levelFilter
      ? items.filter((item) => item.voter.level === levelFilter)
      : items;

    return NextResponse.json({
      summary: {
        totalVoters: voters.length,
        matchCount,
        mismatchCount,
        notFoundCount,
        totalRosterEntries: levelFilter
          ? fullRoster.filter((r) => r.level === levelFilter).length
          : fullRoster.length,
        registeredByLevel,
      },
      verifications: filteredItems,
    });
  }, { timeout: 30000 });
}
