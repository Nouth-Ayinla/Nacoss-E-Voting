import { PrismaClient } from "@prisma/client";

// Prevents exhausting DB connections during Next.js hot-reload in dev,
// and keeps a single pooled client per serverless instance in prod.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
