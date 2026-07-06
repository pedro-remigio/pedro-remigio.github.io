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

const PORT = process.env.PORT || 3000;

ensureAdmin()
  .catch((erro) => console.error("Falha ao garantir admin inicial:", erro))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
      console.log(`Área do admin: http://localhost:${PORT}/admin/login`);
    });
  });
