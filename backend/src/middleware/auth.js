// Middleware de autenticação para rotas da área administrativa
function requireAdmin(req, res, next) {
  if (!req.session.adminId) {
    return res.redirect("/admin/login");
  }
  next();
}

// Middleware de autenticação para rotas privadas de usuário
// Retorna 401 se não houver sessão de usuário ativa
function requireUser(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ erro: "Acesso não autorizado. Faça login para continuar." });
  }
  next();
}

module.exports = { requireAdmin, requireUser };
