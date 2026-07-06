const bcrypt = require("bcryptjs");
const prisma = require("./prisma");

// Garante que o admin definido no .env exista no banco, sem sobrescrever
// a senha se ele já tiver sido criado (evita depender de acesso a shell
// no servidor de produção pra rodar o seed manualmente).
async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const senha = process.env.ADMIN_PASSWORD;

  if (!email || !senha) return;

  const existente = await prisma.admin.findUnique({ where: { email } });

  if (existente) return;

  const senhaHash = await bcrypt.hash(senha, 10);

  await prisma.admin.create({ data: { email, senha: senhaHash } });
}

module.exports = ensureAdmin;
