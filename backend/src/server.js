require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");

const publicRoutes    = require("./routes/public");
const adminRoutes     = require("./routes/admin");
const pagamentosRoutes = require("./routes/pagamentos");
const ensureAdmin     = require("./ensureAdmin");

const app = express();

// ─── Proxy reverso (nginx) ────────────────────────────────────────────────────
// Informa ao Express que está atrás de um proxy (nginx).
// Sem isso, req.secure retorna false mesmo com HTTPS e os cookies seguros
// não são enviados — o login do admin e a sessão param de funcionar.
app.set("trust proxy", 1);

// ─── Segurança: cabeçalhos HTTP (OWASP A05 – Security Misconfiguration) ───────
// Helmet adiciona X-Frame-Options, X-Content-Type-Options,
// Strict-Transport-Security, etc., cobrindo vários itens do OWASP Top 10.
// CSP configurado para permitir o Tailwind CDN e imagens do Unsplash na área admin.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://*.unsplash.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  })
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// credentials: true → permite envio de cookies entre origens diferentes
// origin: FRONTEND_URL → só o front-end do projeto acessa a API com cookies
// Sem isso qualquer site poderia chamar a API com os cookies do usuário (CSRF).
const isProd = process.env.NODE_ENV === "production";
const frontendUrl = process.env.FRONTEND_URL;

app.use(
  cors({
    origin: frontendUrl || true, // "true" reflete a origem em dev (sem restrição de domínio)
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Sessão ───────────────────────────────────────────────────────────────────
// httpOnly: true  → JS do browser não lê o cookie (proteção XSS)
// secure: true    → cookie só trafega em HTTPS (produção)
// sameSite: none  → necessário para cookies cross-origin em produção
//                   (GitHub Pages usa domínio diferente do backend na AWS)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "segredo-dev",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 dia
    },
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ─── Rotas ────────────────────────────────────────────────────────────────────
// ⚠️ Pagamentos ANTES de publicRoutes — publicRoutes tem catch-all no final
// que engolaria /api/pagamentos/* se registrado depois.
app.use("/api/pagamentos", pagamentosRoutes);
app.use("/api", publicRoutes);
app.use("/admin", adminRoutes);

app.get("/", (req, res) => {
  res.redirect("/admin/login");
});

// ─── Middleware de erro global ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);

  if (req.path.startsWith("/api")) {
    return res.status(500).json({ erro: "Erro interno do servidor." });
  }

  res.status(500).send("Ocorreu um erro interno. Tente novamente mais tarde.");
});

process.on("unhandledRejection", (motivo) => {
  console.error("Unhandled Rejection:", motivo);
});

process.on("uncaughtException", (erro) => {
  console.error("Uncaught Exception:", erro);
});

const PORT = process.env.PORT || 3000;

ensureAdmin()
  .catch((erro) => console.error("Falha ao garantir admin inicial:", erro))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
      console.log(`Área do admin: http://localhost:${PORT}/admin/login`);
    });
  });
