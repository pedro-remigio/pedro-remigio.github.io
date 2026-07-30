require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("Oxetech2026", 12);
  await prisma.admin.update({
    where: { email: "admin@remigioeventos.com" },
    data: { senha: hash },
  });
  console.log("Senha atualizada para: Oxetech2026");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
