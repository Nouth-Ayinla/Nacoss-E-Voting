const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.admin.findFirst()
  .then(admin => console.log("Success connecting to DB. First admin:", admin?.email))
  .catch(err => console.error("Failed connecting to DB:", err))
  .finally(() => prisma.$disconnect());
