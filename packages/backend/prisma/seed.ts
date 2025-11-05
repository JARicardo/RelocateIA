import { PrismaClient } from './generated/prisma'
import { env } from "prisma/config";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const password = env["ADMIN_PASSWORD"] || "admin123"; //
  const hashed = await bcrypt.hash(password, 12); // 12 rounds recomendado

  const existing = await prisma.user.findUnique({ where: { email: "admin@local" } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email: "admin@local",
        password: hashed,
        name: "Admin",
        role: "ADMIN",
      },
    });
    console.log("Admin creado: admin@local /", password);
  } else {
    console.log("Admin ya existe");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
