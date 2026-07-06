const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../prisma");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", (req, res) => {
  res.redirect("/admin/dashboard");
});

router.get("/login", (req, res) => {
  if (req.session.adminId) {
    return res.redirect("/admin/dashboard");
  }

  res.render("login", { erro: null });
});

router.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  const admin = await prisma.admin.findUnique({ where: { email } });

  if (!admin || !(await bcrypt.compare(senha, admin.senha))) {
    return res.status(401).render("login", { erro: "Email ou senha inválidos." });
  }

  req.session.adminId = admin.id;
  res.redirect("/admin/dashboard");
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

router.get("/dashboard", requireAdmin, async (req, res) => {
  const [leads, usuarios] = await Promise.all([
    prisma.lead.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.usuario.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, nome: true, email: true, cpf: true, createdAt: true },
    }),
  ]);

  res.render("dashboard", { leads, usuarios });
});

module.exports = router;
