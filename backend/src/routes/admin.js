const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../prisma");
const { requireAdmin } = require("../middleware/auth");
const asyncHandler = require("../asyncHandler");

const router = express.Router();

router.get("/", (req, res) => {
  res.redirect("/admin/dashboard");
});

// ─── LOGIN / LOGOUT ───────────────────────────────────────────────────────────

router.get("/login", (req, res) => {
  if (req.session.adminId) return res.redirect("/admin/dashboard");
  res.render("login", { erro: null });
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, senha } = req.body || {};

    if (!email || !senha) {
      return res.status(400).render("login", { erro: "Email e senha são obrigatórios." });
    }

    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin || !(await bcrypt.compare(senha, admin.senha))) {
      return res.status(401).render("login", { erro: "Email ou senha inválidos." });
    }

    req.session.adminId = admin.id;
    res.redirect("/admin/dashboard");
  })
);

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

router.get(
  "/dashboard",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [leads, usuarios, eventos, inscricoes] = await Promise.all([
      prisma.lead.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.usuario.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, nome: true, email: true, cpf: true, createdAt: true },
      }),
      prisma.evento.findMany({ orderBy: { data: "asc" } }),
      prisma.inscricao.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          usuario: { select: { nome: true, email: true } },
          evento:  { select: { titulo: true } },
        },
      }),
    ]);

    res.render("dashboard", { leads, usuarios, eventos, inscricoes });
  })
);

// ─── RELATÓRIO DE EVENTO ──────────────────────────────────────────────────────

router.get(
  "/eventos/:id/relatorio",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);

    const evento = await prisma.evento.findUnique({
      where: { id },
      include: {
        inscricoes: {
          include: {
            usuario: { select: { nome: true, email: true, cpf: true, telefone: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!evento) return res.redirect("/admin/dashboard");

    const total       = evento.inscricoes.length;
    const confirmadas = evento.inscricoes.filter((i) => i.status === "confirmada").length;
    const pendentes   = evento.inscricoes.filter((i) => i.status === "pendente").length;
    const canceladas  = evento.inscricoes.filter((i) => i.status === "cancelada").length;
    const valorArrecadado = evento.preco != null ? confirmadas * evento.preco : null;

    res.render("evento-relatorio", {
      evento,
      total,
      confirmadas,
      pendentes,
      canceladas,
      valorArrecadado,
    });
  })
);

// ─── CRUD DE EVENTOS ──────────────────────────────────────────────────────────

router.get("/eventos/novo", requireAdmin, (req, res) => {
  res.render("evento-form", { evento: null, erro: null });
});

router.post(
  "/eventos",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { titulo, descricao, data, local, capacidade, imagem, preco, status } = req.body || {};

    if (!titulo || !descricao || !data || !local) {
      return res.render("evento-form", {
        evento: req.body,
        erro: "Título, descrição, data e local são obrigatórios.",
      });
    }

    await prisma.evento.create({
      data: {
        titulo,
        descricao,
        data: new Date(data),
        local,
        capacidade: parseInt(capacidade) || 100,
        imagem: imagem || null,
        preco: preco !== "" && preco != null ? parseFloat(preco) : null,
        status: status || "ativo",
      },
    });

    res.redirect("/admin/dashboard");
  })
);

router.get(
  "/eventos/:id/editar",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const evento = await prisma.evento.findUnique({ where: { id } });
    if (!evento) return res.redirect("/admin/dashboard");
    res.render("evento-form", { evento, erro: null });
  })
);

// Atualização via POST (formulários HTML não suportam PUT)
router.post(
  "/eventos/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const { titulo, descricao, data, local, capacidade, imagem, preco, status } = req.body || {};

    if (!titulo || !descricao || !data || !local) {
      return res.render("evento-form", {
        evento: { id, ...req.body },
        erro: "Título, descrição, data e local são obrigatórios.",
      });
    }

    await prisma.evento.update({
      where: { id },
      data: {
        titulo,
        descricao,
        data: new Date(data),
        local,
        capacidade: parseInt(capacidade) || 100,
        imagem: imagem || null,
        preco: preco !== "" && preco != null ? parseFloat(preco) : null,
        status: status || "ativo",
      },
    });

    res.redirect("/admin/dashboard");
  })
);

router.post(
  "/eventos/:id/deletar",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    // Remove inscrições primeiro (integridade referencial)
    await prisma.inscricao.deleteMany({ where: { eventoId: id } });
    await prisma.evento.delete({ where: { id } });
    res.redirect("/admin/dashboard");
  })
);

module.exports = router;
