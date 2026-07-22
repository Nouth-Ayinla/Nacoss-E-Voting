import { NextRequest, NextResponse } from "next/server";
import { withDbRequestContext } from "@/lib/db-context";
import { verifyAdminSession } from "@/lib/session";
import { z } from "zod";
import { capitalizeName } from "@/lib/matching";

const classRosterSchema = z.object({
  matricNumber: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  level: z.number().int().min(100).max(500),
  department: z.string().default("Computer Science"),
});

const bulkRosterSchema = z.array(classRosterSchema);

export async function GET(req: NextRequest) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const levelParam = searchParams.get("level");
  const searchParam = searchParams.get("search")?.trim().toLowerCase();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "25", 10);
  const skip = (page - 1) * limit;

  const levelFilter = levelParam && levelParam !== "all" ? parseInt(levelParam, 10) : undefined;

  return withDbRequestContext({ role: "admin", adminId: admin.adminId }, async (tx) => {
    let roster: any[] = [];
    let counts: any[] = [];
    let totalCount = 0;

    try {
      if ((tx as any).classRoster) {
        const whereClause = {
          ...(levelFilter ? { level: levelFilter } : {}),
          ...(searchParam
            ? {
                OR: [
                  { name: { contains: searchParam, mode: "insensitive" } },
                  { matricNumber: { contains: searchParam, mode: "insensitive" } },
                ],
              }
            : {}),
        };

        roster = await (tx as any).classRoster.findMany({
          where: whereClause,
          orderBy: [{ level: "asc" }, { matricNumber: "asc" }],
          skip,
          take: limit,
        });

        totalCount = await (tx as any).classRoster.count({
          where: whereClause,
        });

        counts = await (tx as any).classRoster.groupBy({
          by: ["level"],
          _count: { id: true },
        });
      } else {
        // Raw SQL fallback
        let whereSql = "";
        let values: any[] = [];
        let index = 1;

        if (levelFilter) {
          whereSql += `level = $${index}`;
          values.push(levelFilter);
          index++;
        }

        if (searchParam) {
          if (whereSql) whereSql += " AND ";
          const searchPattern = `%${searchParam}%`;
          whereSql += `(LOWER(name) LIKE $${index} OR LOWER(matric_number) LIKE $${index})`;
          values.push(searchPattern);
          index++;
        }

        const whereSegment = whereSql ? `WHERE ${whereSql}` : "";

        // Query roster with limit and offset
        const rosterQuery = `
          SELECT id, matric_number as "matricNumber", name, level, department, status, created_at as "createdAt"
          FROM class_roster
          ${whereSegment}
          ORDER BY level ASC, matric_number ASC
          LIMIT $${index} OFFSET $${index + 1}
        `;
        roster = await tx.$queryRawUnsafe(rosterQuery, ...values, limit, skip);

        // Query total count
        const countQuery = `
          SELECT COUNT(*)::int as count
          FROM class_roster
          ${whereSegment}
        `;
        const countResult: any = await tx.$queryRawUnsafe(countQuery, ...values);
        totalCount = countResult[0]?.count ?? 0;

        // Query counts per level
        counts = await tx.$queryRaw`SELECT level, COUNT(id)::int as "_count" FROM class_roster GROUP BY level`;
      }

      // Cross-reference voters to map voter registration status (verified, pending, rejected) to class roster items
      const voters = await tx.voter.findMany({
        select: { matricNumber: true, status: true }
      });

      roster = roster.map((item) => {
        const voter = voters.find(v => v.matricNumber.trim().toUpperCase() === item.matricNumber.trim().toUpperCase());
        return {
          ...item,
          status: voter ? voter.status : "unverified",
        };
      });
    } catch (e) {
      roster = [];
      counts = [];
      totalCount = 0;
    }

    return NextResponse.json({
      roster,
      counts,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      }
    });
  });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const isArray = Array.isArray(body);

    const items = isArray
      ? bulkRosterSchema.parse(body)
      : [classRosterSchema.parse(body)];

    if (items.length === 0) {
      return NextResponse.json({ error: "No class list items provided" }, { status: 400 });
    }

    if (items.length > 2000) {
      return NextResponse.json({ error: "Bulk upload is limited to a maximum of 2000 students at a time." }, { status: 400 });
    }

    // Deduplicate items by matric number to prevent PostgreSQL "ON CONFLICT DO UPDATE command cannot affect row a second time" error
    const uniqueItemsMap = new Map<string, typeof items[number]>();
    items.forEach((item) => {
      uniqueItemsMap.set(item.matricNumber.trim().toUpperCase(), item);
    });
    const uniqueItems = Array.from(uniqueItemsMap.values());

    return withDbRequestContext({ role: "admin", adminId: admin.adminId }, async (tx) => {
      const values: any[] = [];
      const sqlParts: string[] = [];

      uniqueItems.forEach((item, index) => {
        const cleanMatric = item.matricNumber.trim().toUpperCase();
        const cleanName = capitalizeName(item.name.trim());
        const dept = item.department || "Computer Science";
        const lvl = item.level;

        const base = index * 4;
        sqlParts.push(`(gen_random_uuid(), $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, 'active', NOW(), NOW())`);
        values.push(cleanMatric, cleanName, lvl, dept);
      });

      const query = `
        INSERT INTO class_roster (id, matric_number, name, level, department, status, created_at, updated_at)
        VALUES ${sqlParts.join(", ")}
        ON CONFLICT (matric_number) DO UPDATE
        SET 
          name = EXCLUDED.name, 
          level = EXCLUDED.level, 
          department = EXCLUDED.department, 
          updated_at = NOW()
      `;

      await tx.$executeRawUnsafe(query, ...values);

      await tx.auditLog.create({
        data: {
          adminId: admin.adminId,
          action: "class_list_upload",
          metadata: { totalUploaded: items.length, uniqueProcessed: uniqueItems.length },
        },
      });

      return NextResponse.json({
        success: true,
        message: items.length === uniqueItems.length
          ? `Successfully processed all ${items.length} records.`
          : `Successfully processed ${uniqueItems.length} unique records (ignored ${items.length - uniqueItems.length} duplicates).`,
      });
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Failed to save class list" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const levelParam = searchParams.get("level");
  const levelFilter = levelParam && levelParam !== "all" ? parseInt(levelParam, 10) : undefined;

  return withDbRequestContext({ role: "admin", adminId: admin.adminId }, async (tx) => {
    if ((tx as any).classRoster) {
      if (levelFilter) {
        await (tx as any).classRoster.deleteMany({ where: { level: levelFilter } });
      } else {
        await (tx as any).classRoster.deleteMany();
      }
    } else {
      if (levelFilter) {
        await tx.$executeRaw`DELETE FROM class_roster WHERE level = ${levelFilter}`;
      } else {
        await tx.$executeRaw`DELETE FROM class_roster`;
      }
    }

    await tx.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: "class_list_clear",
        metadata: { clearedLevel: levelFilter || "all" },
      },
    });

    return NextResponse.json({
      success: true,
      message: levelFilter
        ? `Successfully cleared all ${levelFilter}L roster entries.`
        : "Successfully cleared the entire class list roster.",
    });
  });
}
