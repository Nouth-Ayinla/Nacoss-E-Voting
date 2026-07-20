import { z } from "zod";

export const matricNumberSchema = z
  .string()
  .trim()
  .regex(/^[A-Z0-9\/]{6,20}$/i, "Invalid matric number format");

export const voterRegistrationSchema = z.object({
  matricNumber: matricNumberSchema,
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  documentType: z.enum(["idcard", "courseform"]).default("idcard"),
  // idCardUrl is set server-side after upload — never trust a client-supplied URL
});

export const voterLoginSchema = z.object({
  matricNumber: matricNumberSchema,
  pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
});

export const voteCastSchema = z.object({
  votes: z
    .array(
      z.object({
        candidateId: z.string().uuid(),
        position: z.string().min(1).max(50),
      })
    )
    .min(1)
    .superRefine((votes, ctx) => {
      const positions = votes.map((v) => v.position);
      const uniquePositions = new Set(positions);
      if (uniquePositions.size !== positions.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each position may only appear once in a ballot submission.",
        });
      }
    }),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export const adminCreateSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "superadmin"]).default("admin"),
});

export const voterVerifyActionSchema = z.object({
  matricNumber: matricNumberSchema,
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(500).optional(),
});

export const candidateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  position: z.string().trim().min(2).max(50),
  imageUrl: z
    .string()
    .max(3000000, "Image payload is too large (max ~2MB)")
    .refine(
      (val) => !val || val.startsWith("http://") || val.startsWith("https://") || /^data:image\/(jpeg|jpg|png|webp|gif|svg\+xml);base64,/.test(val),
      "Image must be a valid HTTP(S) URL or base64 image data URI"
    )
    .optional(),
  manifesto: z.string().max(2000).optional(),
});

export const electionStateSchema = z.object({
  state: z.enum(["upcoming", "ongoing", "ended"]).optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
});

// --- Image magic-bytes verification ---
// Maps declared MIME type to expected file magic bytes
const IMAGE_MAGIC_BYTES: Record<string, { magic: number[][]; offset: number }> = {
  "image/jpeg": { magic: [[0xff, 0xd8, 0xff]], offset: 0 },
  "image/jpg":  { magic: [[0xff, 0xd8, 0xff]], offset: 0 },
  "image/png":  { magic: [[0x89, 0x50, 0x4e, 0x47]], offset: 0 },
  "image/webp": { magic: [[0x52, 0x49, 0x46, 0x46]], offset: 0 }, // RIFF
  "image/gif":  { magic: [[0x47, 0x49, 0x46, 0x38]], offset: 0 }, // GIF8
};

/**
 * Decodes the first bytes of a base64 data URI and verifies actual file
 * magic bytes match the declared MIME type. Rejects MIME-spoofed uploads.
 */
export function verifyBase64ImageMagic(dataUri: string): boolean {
  const match = dataUri.match(/^data:(image\/[a-z+]+);base64,/);
  if (!match) return false;

  const mimeType = match[1].toLowerCase();
  const check = IMAGE_MAGIC_BYTES[mimeType];
  if (!check) return true; // svg+xml — skip binary magic check

  try {
    const base64Data = dataUri.slice(dataUri.indexOf(",") + 1, dataUri.indexOf(",") + 17);
    const bytes = Array.from(Buffer.from(base64Data, "base64"));
    return check.magic.some((sig) =>
      sig.every((byte, i) => bytes[check.offset + i] === byte)
    );
  } catch {
    return false;
  }
}
