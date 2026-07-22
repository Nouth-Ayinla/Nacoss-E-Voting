import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

interface DbRequestContext {
  role: string;
  adminId?: string | null;
  matricNumber?: string | null;
  email?: string | null;
}

export async function withDbRequestContext<T>(
  context: DbRequestContext,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number }
): Promise<T> {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.request_role', ${context.role}, true)`;

      if (context.adminId) {
        await tx.$executeRaw`SELECT set_config('app.admin_id', ${context.adminId}, true)`;
      }

      if (context.matricNumber) {
        await tx.$executeRaw`SELECT set_config('app.matric_number', ${context.matricNumber}, true)`;
      }

      if (context.email) {
        await tx.$executeRaw`SELECT set_config('app.email', ${context.email}, true)`;
      }

      return callback(tx);
    },
    {
      maxWait: options?.maxWait ?? 10000,
      timeout: options?.timeout ?? 15000,
    }
  );
}


