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
    .min(1),
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
  imageUrl: z.string().optional(),
  manifesto: z.string().max(2000).optional(),
});

export const electionStateSchema = z.object({
  state: z.enum(["upcoming", "ongoing", "ended"]).optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
});
