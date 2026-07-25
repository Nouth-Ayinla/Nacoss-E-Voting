import { NextRequest, NextResponse } from "next/server";
import { withDbRequestContext } from "@/lib/db-context";
import { candidateSchema, verifyBase64ImageMagic } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = candidateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Verify magic bytes if a base64 data URI is provided
    if (parsed.data.imageUrl?.startsWith("data:")) {
      if (!verifyBase64ImageMagic(parsed.data.imageUrl)) {
        return NextResponse.json(
          { error: "Image file is corrupt or does not match its declared type." },
          { status: 400 }
        );
      }
    }

    return await withDbRequestContext({ role: "public" }, async (tx) => {
      const existing = await tx.candidate.findFirst({
        where: {
          name: {
            equals: parsed.data.name,
            mode: "insensitive",
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "A candidate profile has already been registered with this name." },
          { status: 400 }
        );
      }

      const candidate = await tx.candidate.create({
        data: {
          name: parsed.data.name,
          position: parsed.data.position,
          level: parsed.data.level,
          imageUrl: parsed.data.imageUrl || null,
          manifesto: parsed.data.manifesto || null,
        },
      });

      return NextResponse.json(candidate, { status: 201 });
    });
  } catch (error) {
    console.error("Candidate application error:", error);
    return NextResponse.json({ error: "Failed to submit candidate profile." }, { status: 500 });
  }
}
