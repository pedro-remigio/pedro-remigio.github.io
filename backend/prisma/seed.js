require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@remigioeventos.com";
  const senha = process.env.ADMIN_PASSWORD || "admin123";

  const senhaHash = await bcrypt.hash(senha, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { senha: senhaHash },
    create: { email, senha: senhaHash },
  });

  console.log(`Admin pronto: ${admin.email} (senha definida no .env)`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
