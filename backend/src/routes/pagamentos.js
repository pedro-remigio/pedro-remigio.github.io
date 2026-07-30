const express = require("express");
const crypto  = require("crypto");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");
const prisma = require("../prisma");
const asyncHandler = require("../asyncHandler");
const { requireUser } = require("../middleware/auth");

// ─── Valida assinatura do webhook do Mercado Pago ─────────────────────────────
// O MP envia o header "x-signature" com ts= e v1= para provar que a notificação
// veio de fato deles e não de alguém tentando forjar uma confirmação de pagamento.
function validarAssinaturaMP(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // sem secret configurado: aceita (dev/testes iniciais)

  const xSignature = req.headers["x-signature"];
  const xRequestId = req.headers["x-request-id"];
  if (!xSignature || !xRequestId) return false;

  const partes = {};
  xSignature.split(",").forEach((p) => {
    const [k, v] = p.split("=");
    if (k && v) partes[k.trim()] = v.trim();
  });

  const ts = partes["ts"];
  const v1 = partes["v1"];
  if (!ts || !v1) return false;

  const dataId   = req.body?.data?.id ?? "";
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const hash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return hash === v1;
}

const router = express.Router();

// ─── Inicializa o cliente do Mercado Pago ─────────────────────────────────────
// MP_ACCESS_TOKEN: começa com "TEST-" para testes, "APP_USR-" para produção
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || "",
});

// ─── POST /api/pagamentos/criar-preferencia ───────────────────────────────────
// Rota privada: usuário logado inicia o pagamento de uma inscrição.
//
// Fluxo:
//  1. Verifica se o evento existe, está ativo e tem vagas
//  2. Cria (ou reutiliza) a inscrição com status "pendente"
//  3. Cria a preferência no Mercado Pago
//  4. Retorna a URL do checkout (init_point) para o front redirecionar
//
router.post(
  "/criar-preferencia",
  requireUser,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.body || {};

    if (!eventoId) {
      return res.status(400).json({ erro: "eventoId é obrigatório." });
    }

    // ── Busca o evento e o usuário ────────────────────────────────────────────
    const [evento, usuario] = await Promise.all([
      prisma.evento.findUnique({ where: { id: Number(eventoId) } }),
      prisma.usuario.findUnique({
        where: { id: req.session.userId },
        select: { id: true, nome: true, email: true },
      }),
    ]);

    if (!evento) {
      return res.status(404).json({ erro: "Evento não encontrado." });
    }

    if (evento.status !== "ativo") {
      return res.status(400).json({ erro: "Inscrições encerradas para este evento." });
    }

    if (evento.preco == null) {
      return res.status(400).json({
        erro: "Este evento é gratuito. Use a rota /api/inscricoes para se inscrever.",
      });
    }

    // ── Verifica capacidade ───────────────────────────────────────────────────
    const totalInscritos = await prisma.inscricao.count({
      where: { eventoId: evento.id, status: { not: "cancelada" } },
    });

    if (totalInscritos >= evento.capacidade) {
      return res.status(400).json({ erro: "Evento com capacidade esgotada." });
    }

    // ── Cria ou reutiliza inscrição "pendente" ────────────────────────────────
    // Se já existe uma inscrição confirmada: bloqueia.
    // Se existe pendente: reutiliza (permite nova tentativa de pagamento).
    // Se existe cancelada: recria como pendente.
    let inscricao = await prisma.inscricao.findUnique({
      where: {
        usuarioId_eventoId: { usuarioId: usuario.id, eventoId: evento.id },
      },
    });

    if (inscricao?.status === "confirmada") {
      return res.status(409).json({ erro: "Você já está inscrito e com pagamento confirmado neste evento." });
    }

    if (!inscricao) {
      inscricao = await prisma.inscricao.create({
        data: {
          usuarioId: usuario.id,
          eventoId: evento.id,
          status: "pendente",
        },
      });
    } else if (inscricao.status === "cancelada") {
      inscricao = await prisma.inscricao.update({
        where: { id: inscricao.id },
        data: { status: "pendente", pagamentoId: null },
      });
    }
    // se for "pendente", mantém como está e recria só a preferência

    // ── Cria a preferência no Mercado Pago ────────────────────────────────────
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
    const backendUrl  = process.env.BACKEND_URL  || "https://apieventos.pedroremigio.com.br";

    const preference = new Preference(mpClient);

    const preferenceData = await preference.create({
      body: {
        items: [
          {
            id: String(evento.id),
            title: `Inscrição — ${evento.titulo}`,
            quantity: 1,
            unit_price: Number(evento.preco),
            currency_id: "BRL",
          },
        ],
        payer: {
          email: usuario.email,
        },
        back_urls: {
          success: `${frontendUrl}/pagamento-sucesso.html`,
          failure: `${frontendUrl}/pagamento-falha.html`,
          pending: `${frontendUrl}/pagamento-sucesso.html`,
        },
        auto_return: "approved",
        external_reference: String(inscricao.id),
        notification_url: `${backendUrl}/api/pagamentos/webhook`,
      },
    });

    console.log(`[MP] Preferência criada: ${preferenceData.id} → inscrição ${inscricao.id}`);

    res.json({
      ok: true,
      checkout_url: preferenceData.init_point,
      checkout_url_sandbox: preferenceData.sandbox_init_point,
      inscricao_id: inscricao.id,
    });
  })
);

// ─── POST /api/pagamentos/webhook ─────────────────────────────────────────────
// Rota pública: o Mercado Pago chama esta rota automaticamente quando o
// status de um pagamento muda (aprovado, rejeitado, cancelado, etc.).
//
// Fluxo:
//  1. MP envia { type: "payment", data: { id: "MP_PAYMENT_ID" } }
//  2. Buscamos os detalhes do pagamento na API do MP
//  3. Pegamos o external_reference (= nossa inscricao.id)
//  4. Atualizamos o status da inscrição no banco
//
router.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    // Valida assinatura antes de processar
    if (!validarAssinaturaMP(req)) {
      console.warn("[MP Webhook] Assinatura inválida — requisição ignorada.");
      return res.status(200).send("OK"); // retorna 200 mesmo assim (evita retentativas do MP)
    }

    // Responde 200 imediatamente — o MP espera resposta rápida
    // Se demorar, ele tenta de novo (pode causar duplicatas)
    res.status(200).send("OK");

    const { type, data } = req.body || {};

    // O MP também envia notificações de tipo "test" durante testes
    if (type !== "payment" || !data?.id) return;

    try {
      const payment = new Payment(mpClient);
      const pagamento = await payment.get({ id: data.id });

      const inscricaoId = parseInt(pagamento.external_reference);
      if (isNaN(inscricaoId)) return;

      // Status do MP: approved | pending | in_process | rejected | cancelled | refunded | charged_back
      let novoStatus;
      if (pagamento.status === "approved") {
        novoStatus = "confirmada";
      } else if (pagamento.status === "rejected" || pagamento.status === "cancelled") {
        novoStatus = "cancelada";
      } else {
        // pending / in_process: mantém "pendente"
        novoStatus = "pendente";
      }

      await prisma.inscricao.update({
        where: { id: inscricaoId },
        data: {
          status: novoStatus,
          pagamentoId: String(data.id),
        },
      });

      console.log(`[MP Webhook] Inscrição ${inscricaoId} → ${novoStatus} (pagamento ${data.id})`);
    } catch (erro) {
      // Não deixa o erro subir — o webhook já respondeu 200
      console.error("[MP Webhook] Erro ao processar:", erro.message);
    }
  })
);

// ─── GET /api/pagamentos/status/:inscricaoId ──────────────────────────────────
// Rota privada: o front-end consulta se o pagamento foi confirmado.
// Usada nas páginas de retorno (pagamento-sucesso.html) para mostrar
// o status atualizado sem depender só do redirect do MP.
//
router.get(
  "/status/:inscricaoId",
  requireUser,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.inscricaoId);

    if (isNaN(id)) {
      return res.status(400).json({ erro: "ID inválido." });
    }

    const inscricao = await prisma.inscricao.findUnique({
      where: { id },
      include: { evento: { select: { titulo: true, data: true, local: true } } },
    });

    // Garante que a inscrição pertence ao usuário logado
    if (!inscricao || inscricao.usuarioId !== req.session.userId) {
      return res.status(403).json({ erro: "Inscrição não encontrada." });
    }

    res.json({ ok: true, inscricao });
  })
);

module.exports = router;
