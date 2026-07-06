const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../prisma");

const router = express.Router();

// Formulário de contato/inscrição do site
router.post("/leads", async (req, res) => {
  const { nome, email, evento, mensagem } = req.body;

  if (!nome || !email || !mensagem) {
    return res.status(400).json({ erro: "Nome, email e mensagem são obrigatórios." });
  }

  const lead = await prisma.lead.create({
    data: { nome, email, evento, mensagem },
  });

  res.status(201).json({ ok: true, lead });
});

// Cadastro de usuário (área do usuário)
router.post("/usuarios", async (req, res) => {
  const { nome, email, cpf, senha } = req.body;

  if (!nome || !email || !cpf || !senha) {
    return res.status(400).json({ erro: "Nome, email, CPF e senha são obrigatórios." });
  }

  const existente = await prisma.usuario.findFirst({
    where: { OR: [{ email }, { cpf }] },
  });

  if (existente) {
    return res.status(409).json({ erro: "Já existe um usuário com esse email ou CPF." });
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const usuario = await prisma.usuario.create({
    data: { nome, email, cpf, senha: senhaHash },
    select: { id: true, nome: true, email: true, cpf: true, createdAt: true },
  });

  res.status(201).json({ ok: true, usuario });
});

// Login de usuário
router.post("/usuarios/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: "Email e senha são obrigatórios." });
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
    return res.status(401).json({ erro: "Email ou senha inválidos." });
  }

  res.json({ ok: true, nome: usuario.nome, email: usuario.email });
});

module.exports = router;
