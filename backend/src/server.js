require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const session = require("express-session");

const publicRoutes = require("./routes/public");
const adminRoutes = require("./routes/admin");
const ensureAdmin = require("./ensureAdmin");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "segredo-dev",
    resave: false,
    saveUninitialized: false,
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/api", publicRoutes);
app.use("/admin", adminRoutes);

app.get("/", (req, res) => {
  res.redirect("/admin/login");
});

// Middleware de erro: garante que qualquer falha (banco fora do ar, JSON
// inválido no corpo da requisição, etc.) sempre gere uma resposta ao invés de
// deixar a requisição travada ou derrubar o processo inteiro.
app.use((err, req, res, next) => {
  console.error(err);

  if (req.path.startsWith("/api")) {
    return res.status(500).json({ erro: "Erro interno do servidor." });
  }

  res.status(500).send("Ocorreu um erro interno. Tente novamente mais tarde.");
});

// Rede de segurança: loga em vez de derrubar o processo em caso de erro
// assíncrono que escape dos handlers (ex: erro fora do ciclo de requisição).
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
