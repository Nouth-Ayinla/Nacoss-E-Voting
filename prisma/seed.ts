import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in your environment before running the seed script."
    );
  }

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists — updating role to superadmin.`);
    await prisma.admin.update({
      where: { email },
      data: { role: "superadmin" },
    });
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.admin.create({
      data: { email, passwordHash, role: "superadmin" },
    });
    console.log(`Created admin account for ${email}.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
