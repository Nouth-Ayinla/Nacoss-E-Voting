import { NextRequest, NextResponse } from "next/server";
import { withDbRequestContext } from "@/lib/db-context";
import { verifyAdminSession } from "@/lib/session";
import { z } from "zod";
import { capitalizeName } from "@/lib/matching";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  matricNumber: z.string().min(3).optional(),
  level: z.number().int().min(100).max(500).optional(),
  department: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const formattedName = data.name ? capitalizeName(data.name.trim()) : undefined;

    return withDbRequestContext({ role: "admin", adminId: admin.adminId }, async (tx) => {
      if ((tx as any).classRoster) {
        const existing = await (tx as any).classRoster.findUnique({ where: { id } });
        if (!existing) {
          return NextResponse.json({ error: "Class list entry not found" }, { status: 404 });
        }

        const updated = await (tx as any).classRoster.update({
          where: { id },
          data: {
            ...(formattedName ? { name: formattedName } : {}),
            ...(data.matricNumber ? { matricNumber: data.matricNumber.trim().toUpperCase() } : {}),
            ...(data.level ? { level: data.level } : {}),
            ...(data.department ? { department: data.department.trim() } : {}),
            ...(data.status ? { status: data.status } : {}),
          },
        });

        await tx.auditLog.create({
          data: {
            adminId: admin.adminId,
            action: "class_list_update",
            metadata: { id, changes: data },
          },
        });

        return NextResponse.json({ success: true, record: updated });
      } else {
        // Raw SQL fallback
        if (formattedName) {
          await tx.$executeRaw`UPDATE class_roster SET name = ${formattedName}, updated_at = NOW() WHERE id = ${id}`;
        }
        if (data.matricNumber) {
          await tx.$executeRaw`UPDATE class_roster SET matric_number = ${data.matricNumber.trim().toUpperCase()}, updated_at = NOW() WHERE id = ${id}`;
        }
        if (data.level) {
          await tx.$executeRaw`UPDATE class_roster SET level = ${data.level}, updated_at = NOW() WHERE id = ${id}`;
        }

        await tx.auditLog.create({
          data: {
            adminId: admin.adminId,
            action: "class_list_update",
            metadata: { id, changes: data },
          },
        });

        return NextResponse.json({ success: true });
      }
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  return withDbRequestContext({ role: "admin", adminId: admin.adminId }, async (tx) => {
    if ((tx as any).classRoster) {
      const existing = await (tx as any).classRoster.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Class list entry not found" }, { status: 404 });
      }

      await (tx as any).classRoster.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          adminId: admin.adminId,
          action: "class_list_delete",
          metadata: { id, matricNumber: existing.matricNumber },
        },
      });
    } else {
      await tx.$executeRaw`DELETE FROM class_roster WHERE id = ${id}`;
      await tx.auditLog.create({
        data: {
          adminId: admin.adminId,
          action: "class_list_delete",
          metadata: { id },
        },
      });
    }

    return NextResponse.json({ success: true, message: "Record deleted successfully" });
  });
}
