const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto"); // nativo do Node — gera tokens seguros
const prisma = require("../prisma");
const asyncHandler = require("../asyncHandler");
const { requireUser } = require("../middleware/auth");

const router = express.Router();

// ─── Rate limiter simples (proteção brute-force no login) ─────────────────────
// OWASP A07 – Identification and Authentication Failures
// Limita a 10 tentativas por IP em janelas de 15 minutos
const tentativas = new Map();

function rateLimit(max, janelaMs) {
  return (req, res, next) => {
    const ip = req.ip;
    const agora = Date.now();
    const registro = tentativas.get(ip) || { count: 0, inicio: agora };

    if (agora - registro.inicio > janelaMs) {
      registro.count = 1;
      registro.inicio = agora;
    } else {
      registro.count++;
    }

    tentativas.set(ip, registro);

    if (registro.count > max) {
      return res.status(429).json({
        erro: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      });
    }

    next();
  };
}

// ─── FORMULÁRIO DE CONTATO ────────────────────────────────────────────────────

// POST /api/leads — envia mensagem de contato
router.post(
  "/leads",
  rateLimit(10, 15 * 60 * 1000), // max 10 mensagens por IP a cada 15 min
  asyncHandler(async (req, res) => {
    const { nome, email, telefone, evento, mensagem } = req.body || {};

    if (!nome || !email || !telefone || !evento || !mensagem) {
      return res.status(400).json({ erro: "Nome, email, telefone, evento e mensagem são obrigatórios." });
    }

    const lead = await prisma.lead.create({
      data: { nome, email, telefone, evento, mensagem },
    });

    res.status(201).json({ ok: true, lead });
  })
);

// ─── AUTENTICAÇÃO DE USUÁRIO ──────────────────────────────────────────────────

// POST /api/usuarios — cadastro de novo usuário
router.post(
  "/usuarios",
  asyncHandler(async (req, res) => {
    const { nome, email, cpf, senha, telefone, tipoDocumento } = req.body || {};

    if (!nome || !email || !cpf || !senha || !telefone) {
      return res.status(400).json({ erro: "Nome, email, telefone, documento e senha são obrigatórios." });
    }

    // Validação de senha mínima (OWASP A07 – Authentication Failures)
    // Senha curta demais é fácil de adivinhar por força bruta
    if (senha.length < 8) {
      return res.status(400).json({ erro: "A senha deve ter pelo menos 8 caracteres." });
    }

    // Validação de formato de email básica
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ erro: "Formato de email inválido." });
    }

    const existente = await prisma.usuario.findFirst({
      where: { OR: [{ email }, { cpf }] },
    });

    if (existente) {
      // Mensagem genérica: não confirma se o email ou o CPF já existe no banco.
      // Dizer "email já cadastrado" permitiria enumerar quais emails estão registrados
      // (OWASP A07 — Identification and Authentication Failures).
      return res.status(409).json({ erro: "Não foi possível criar a conta com esses dados. Verifique as informações e tente novamente." });
    }

    // bcrypt.hash com custo 12:
    // - Custo 10 = ~100ms por hash (padrão mínimo)
    // - Custo 12 = ~400ms — mais lento para o atacante em brute-force,
    //   mas imperceptível para o usuário no cadastro (acontece uma vez só)
    // O bcryptjs já inclui um salt aleatório automaticamente.
    // NUNCA armazenamos a senha em texto puro — apenas o hash.
    const senhaHash = await bcrypt.hash(senha, 12);

    try {
      const usuario = await prisma.usuario.create({
        data: {
          nome,
          email,
          cpf,
          senha: senhaHash,
          telefone: telefone,
          tipoDocumento: tipoDocumento || "cpf",
        },
        select: { id: true, nome: true, email: true, cpf: true, telefone: true, tipoDocumento: true, createdAt: true },
      });

      // Login automático após cadastro
      req.session.userId = usuario.id;

      res.status(201).json({ ok: true, usuario });
    } catch (erro) {
      if (erro.code === "P2002") {
        // Violação de índice único (race condition): mesma mensagem genérica
        return res.status(409).json({ erro: "Não foi possível criar a conta com esses dados. Verifique as informações e tente novamente." });
      }
      throw erro;
    }
  })
);

// POST /api/usuarios/login — login de usuário (cria sessão em cookie)
router.post(
  "/usuarios/login",
  rateLimit(10, 15 * 60 * 1000), // max 10 tentativas por IP a cada 15 min
  asyncHandler(async (req, res) => {
    const { email, senha } = req.body || {};

    if (!email || !senha) {
      return res.status(400).json({ erro: "Email e senha são obrigatórios." });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });

    // IMPORTANTE — Segurança contra timing attack e enumeração de usuários:
    //
    // 1. bcrypt.compare() é uma comparação de tempo constante: leva o mesmo
    //    tempo seja a senha certa ou errada, impedindo que um atacante descubra
    //    se o email existe medindo o tempo de resposta.
    //
    // 2. Sempre retornamos a MESMA mensagem ("Email ou senha inválidos") tanto
    //    para email inexistente quanto para senha errada. Se disséssemos "email
    //    não encontrado" ou "senha incorreta" separadamente, estaríamos
    //    confirmando quais emails estão cadastrados (enumeração de usuários —
    //    OWASP A07).
    //
    // 3. Quando o usuário não existe, fazemos um bcrypt.compare() com um hash
    //    falso para que o tempo de resposta seja idêntico ao caso em que o
    //    usuário existe mas a senha está errada. Sem isso, o atacante notaria
    //    que emails inexistentes respondem mais rápido.
    const HASH_FALSO = "$2b$12$invalido.invalido.invalido.invalido.invalido.invalido.inval";
    const hashParaComparar = usuario ? usuario.senha : HASH_FALSO;
    const senhaCorreta = await bcrypt.compare(senha, hashParaComparar);

    if (!usuario || !senhaCorreta) {
      return res.status(401).json({ erro: "Email ou senha inválidos." });
    }

    // Sessão server-side: cookie httpOnly — JS do browser não consegue ler o ID
    req.session.userId = usuario.id;

    res.json({
      ok: true,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
    });
  })
);

// POST /api/usuarios/logout — encerra sessão do usuário
router.post("/usuarios/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

// GET /api/usuarios/me — retorna dados do usuário logado
router.get(
  "/usuarios/me",
  requireUser,
  asyncHandler(async (req, res) => {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.session.userId },
      select: { id: true, nome: true, email: true, cpf: true, telefone: true, tipoDocumento: true, createdAt: true },
    });

    if (!usuario) {
      // Usuário da sessão foi deletado do banco: encerra a sessão
      // sem revelar se o usuário existia ou não
      req.session.destroy(() => {});
      return res.status(401).json({ erro: "Credenciais inválidas. Faça login novamente." });
    }

    res.json({ ok: true, usuario });
  })
);

// PATCH /api/usuarios/me — atualiza nome e telefone do usuário logado
router.patch(
  "/usuarios/me",
  requireUser,
  asyncHandler(async (req, res) => {
    const { nome, telefone } = req.body || {};

    // Só permite alterar nome e telefone — email e CPF são dados sensíveis
    // que exigem verificação manual pelo administrador
    if (!nome || nome.trim().length < 2) {
      return res.status(400).json({ erro: "Nome inválido. Mínimo 2 caracteres." });
    }

    if (!telefone || !telefone.trim()) {
      return res.status(400).json({ erro: "Telefone é obrigatório." });
    }

    const usuario = await prisma.usuario.update({
      where: { id: req.session.userId },
      data: {
        nome:     nome.trim(),
        telefone: telefone.trim(),
      },
      select: { id: true, nome: true, email: true, cpf: true, telefone: true, tipoDocumento: true, createdAt: true },
    });

    res.json({ ok: true, usuario });
  })
);

// ─── EVENTOS ──────────────────────────────────────────────────────────────────

// GET /api/eventos — lista todos os eventos
router.get(
  "/eventos",
  asyncHandler(async (req, res) => {
    const eventos = await prisma.evento.findMany({
      orderBy: { data: "asc" },
    });
    res.json({ ok: true, eventos });
  })
);

// GET /api/eventos/:id — detalhes de um evento
router.get(
  "/eventos/:id",
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ erro: "ID inválido." });
    }

    const evento = await prisma.evento.findUnique({
      where: { id },
      include: { _count: { select: { inscricoes: true } } },
    });

    if (!evento) {
      return res.status(404).json({ erro: "Evento não encontrado." });
    }

    res.json({ ok: true, evento });
  })
);

// ─── INSCRIÇÕES ───────────────────────────────────────────────────────────────

// POST /api/inscricoes — inscreve usuário logado em um evento (rota privada)
router.post(
  "/inscricoes",
  requireUser,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.body || {};

    if (!eventoId) {
      return res.status(400).json({ erro: "eventoId é obrigatório." });
    }

    const evento = await prisma.evento.findUnique({ where: { id: Number(eventoId) } });

    if (!evento) {
      return res.status(404).json({ erro: "Evento não encontrado." });
    }

    if (evento.status !== "ativo") {
      return res.status(400).json({ erro: "Inscrições encerradas para este evento." });
    }

    const totalInscritos = await prisma.inscricao.count({ where: { eventoId: evento.id } });
    if (totalInscritos >= evento.capacidade) {
      return res.status(400).json({ erro: "Evento com capacidade esgotada." });
    }

    try {
      // Eventos pagos entram como "pendente" — o usuário paga pela área do usuário
      const statusInicial = evento.preco != null ? "pendente" : "confirmada";

      const inscricao = await prisma.inscricao.create({
        data: { usuarioId: req.session.userId, eventoId: evento.id, status: statusInicial },
        include: { evento: { select: { titulo: true, data: true, local: true, preco: true } } },
      });

      res.status(201).json({ ok: true, inscricao });
    } catch (erro) {
      if (erro.code === "P2002") {
        return res.status(409).json({ erro: "Você já está inscrito neste evento." });
      }
      throw erro;
    }
  })
);

// GET /api/usuarios/me/inscricoes — lista inscrições do usuário logado (rota privada)
router.get(
  "/usuarios/me/inscricoes",
  requireUser,
  asyncHandler(async (req, res) => {
    const inscricoes = await prisma.inscricao.findMany({
      where: { usuarioId: req.session.userId },
      include: {
        evento: {
          select: {
            id: true,
            titulo: true,
            data: true,
            local: true,
            status: true,
            imagem: true,
            preco: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ ok: true, inscricoes });
  })
);

// GET /api/certificado/:inscricaoId — gera certificado HTML (rota privada)
router.get(
  "/certificado/:inscricaoId",
  requireUser,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.inscricaoId);

    if (isNaN(id)) {
      return res.status(400).json({ erro: "ID inválido." });
    }

    const inscricao = await prisma.inscricao.findUnique({
      where: { id },
      include: {
        usuario: { select: { nome: true } },
        evento: { select: { titulo: true, data: true, local: true, status: true } },
      },
    });

    // Garante que o certificado pertence ao usuário logado (OWASP A01)
    if (!inscricao || inscricao.usuarioId !== req.session.userId) {
      return res.status(403).json({ erro: "Certificado não encontrado." });
    }

    if (inscricao.evento.status !== "encerrado") {
      return res.status(400).json({
        erro: "O certificado só está disponível após o encerramento do evento.",
      });
    }

    const dataEvento = new Date(inscricao.evento.data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const dataEmissao = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Certificado - ${inscricao.evento.titulo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Georgia, serif;
      background: #f5f5f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .certificado {
      background: white;
      border: 8px solid #1e3a5f;
      border-radius: 4px;
      padding: 60px;
      max-width: 800px;
      width: 100%;
      text-align: center;
      position: relative;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    }
    .certificado::before {
      content: "";
      position: absolute;
      inset: 10px;
      border: 2px solid #c9a84c;
      pointer-events: none;
    }
    .logo { font-size: 14px; color: #666; margin-bottom: 8px; letter-spacing: 3px; text-transform: uppercase; }
    h1 { font-size: 42px; color: #1e3a5f; margin-bottom: 6px; letter-spacing: 2px; }
    .subtitulo { font-size: 14px; color: #888; margin-bottom: 40px; letter-spacing: 2px; text-transform: uppercase; }
    .texto { font-size: 16px; color: #444; margin-bottom: 8px; }
    .nome { font-size: 36px; color: #1e3a5f; font-style: italic; margin: 20px 0; border-bottom: 2px solid #c9a84c; padding-bottom: 12px; }
    .evento { font-size: 22px; color: #333; font-weight: bold; margin: 16px 0 8px; }
    .detalhes { font-size: 14px; color: #666; margin-bottom: 40px; }
    .rodape { font-size: 12px; color: #999; margin-top: 40px; }
    .btn-imprimir {
      display: inline-block;
      margin-top: 30px;
      padding: 12px 32px;
      background: #1e3a5f;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      font-family: sans-serif;
    }
    @media print { .btn-imprimir { display: none; } body { background: white; } }
  </style>
</head>
<body>
  <div class="certificado">
    <div class="logo">Remigio Eventos</div>
    <h1>Certificado</h1>
    <div class="subtitulo">de participação</div>
    <p class="texto">Certificamos que</p>
    <div class="nome">${inscricao.usuario.nome}</div>
    <p class="texto">participou do evento</p>
    <div class="evento">${inscricao.evento.titulo}</div>
    <div class="detalhes">
      realizado em ${dataEvento}<br>
      ${inscricao.evento.local}
    </div>
    <div class="rodape">
      Certificado emitido em ${dataEmissao} · Remigio Eventos e Serviços<br>
      Código de verificação: INS-${String(inscricao.id).padStart(6, "0")}
    </div>
    <br>
    <button class="btn-imprimir" id="btn-imprimir">🖨️ Imprimir / Salvar PDF</button>
    <p style="font-size:12px;color:#aaa;margin-top:8px;font-family:sans-serif;">
      Na janela de impressão, selecione <strong>"Salvar como PDF"</strong> como destino.
    </p>
    <script>document.getElementById('btn-imprimir').addEventListener('click',function(){window.print();});</script>
  </div>
</body>
</html>`);
  })
);

// DELETE /api/inscricoes/:id — cancela inscrição (só eventos futuros, rota privada)
router.delete(
  "/inscricoes/:id",
  requireUser,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ erro: "ID inválido." });
    }

    const inscricao = await prisma.inscricao.findUnique({
      where: { id },
      include: { evento: { select: { data: true, status: true, titulo: true } } },
    });

    // Verifica propriedade (OWASP A01 — Broken Access Control)
    if (!inscricao || inscricao.usuarioId !== req.session.userId) {
      return res.status(403).json({ erro: "Inscrição não encontrada." });
    }

    // Não permite cancelar eventos que já ocorreram
    if (new Date(inscricao.evento.data) < new Date()) {
      return res.status(400).json({
        erro: "Não é possível cancelar a inscrição de um evento que já ocorreu.",
      });
    }

    await prisma.inscricao.delete({ where: { id } });

    res.json({ ok: true, mensagem: `Inscrição em "${inscricao.evento.titulo}" cancelada.` });
  })
);

// ─── REDEFINIÇÃO DE SENHA ─────────────────────────────────────────────────────

// POST /api/auth/esqueci-senha — gera token de redefinição
router.post(
  "/auth/esqueci-senha",
  rateLimit(5, 15 * 60 * 1000), // max 5 tentativas por IP a cada 15 min
  asyncHandler(async (req, res) => {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ erro: "Email é obrigatório." });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (usuario) {
      // Invalida tokens anteriores não usados
      await prisma.tokenRedefinicaoSenha.updateMany({
        where: { usuarioId: usuario.id, usado: false },
        data: { usado: true },
      });

      const token = crypto.randomBytes(32).toString("hex");
      const expiraEm = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await prisma.tokenRedefinicaoSenha.create({
        data: { usuarioId: usuario.id, token, expiraEm },
      });

      const frontUrl = process.env.FRONTEND_URL || "http://localhost:8080";
      const link = `${frontUrl}/redefinir-senha.html?token=${token}`;

      // TODO produção: enviar por email (nodemailer + SMTP)
      // Por ora o link aparece no log do servidor para teste
      console.log(`[RESET SENHA] ${email} → ${link}`);
    }

    // Sempre retorna 200 — não confirma se email está cadastrado (anti-enumeração)
    res.json({
      ok: true,
      mensagem: "Se esse email estiver cadastrado, você receberá um link de redefinição em breve.",
    });
  })
);

// POST /api/auth/redefinir-senha — valida token e salva nova senha
router.post(
  "/auth/redefinir-senha",
  asyncHandler(async (req, res) => {
    const { token, novaSenha } = req.body || {};

    if (!token || !novaSenha) {
      return res.status(400).json({ erro: "Token e nova senha são obrigatórios." });
    }

    if (novaSenha.length < 8) {
      return res.status(400).json({ erro: "A senha deve ter pelo menos 8 caracteres." });
    }

    const registro = await prisma.tokenRedefinicaoSenha.findUnique({
      where: { token },
    });

    if (!registro || registro.usado || new Date() > registro.expiraEm) {
      return res.status(400).json({
        erro: "Link de redefinição inválido ou expirado. Solicite um novo.",
      });
    }

    const senhaHash = await bcrypt.hash(novaSenha, 12);

    await prisma.usuario.update({
      where: { id: registro.usuarioId },
      data: { senha: senhaHash },
    });

    await prisma.tokenRedefinicaoSenha.update({
      where: { id: registro.id },
      data: { usado: true },
    });

    res.json({ ok: true, mensagem: "Senha redefinida com sucesso! Faça login com a nova senha." });
  })
);

// Qualquer rota /api/* não mapeada
router.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

module.exports = router;
