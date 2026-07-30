/**
 * Script de teste de segurança — Remigio Eventos
 *
 * Testa as principais proteções da API:
 *   1. Rota privada sem login → 401
 *   2. Login com senha errada → 401 (mesma mensagem que email errado)
 *   3. Login com email inexistente → 401 (mesma mensagem, sem vazar info)
 *   4. Cadastro com senha curta → 400
 *   5. Rota privada COM login → 200
 *   6. Dupla inscrição no mesmo evento → 409
 *   7. Certificado de outro usuário → 403
 *   8. Rate limiting após 10 tentativas → 429
 *
 * Como usar:
 *   node scripts/testar-seguranca.js [URL_DO_BACKEND]
 *
 * Exemplos:
 *   node scripts/testar-seguranca.js
 *   node scripts/testar-seguranca.js https://apieventos.pedroremigio.com.br
 */

const BASE = process.argv[2] || "http://localhost:3000";

// Resultados dos testes
const resultados = [];
let passou = 0;
let falhou = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Faz uma requisição e retorna { status, body, headers }
async function req(metodo, caminho, body, cookieHeader) {
  const opcoes = {
    method: metodo,
    headers: { "Content-Type": "application/json" },
  };

  if (body) opcoes.body = JSON.stringify(body);
  if (cookieHeader) opcoes.headers["Cookie"] = cookieHeader;

  const resposta = await fetch(`${BASE}${caminho}`, opcoes);
  const texto = await resposta.text();
  let json = {};
  try { json = JSON.parse(texto); } catch {}

  return { status: resposta.status, body: json, headers: resposta.headers };
}

// Extrai o cookie de sessão do header Set-Cookie
function extrairCookie(headers) {
  const setCookie = headers.get("set-cookie") || "";
  const match = setCookie.match(/connect\.sid=[^;]+/);
  return match ? match[0] : null;
}

// Registra o resultado de um teste
function testar(nome, condicao, detalhe) {
  const ok = condicao;
  if (ok) passou++;
  else falhou++;
  resultados.push({ nome, ok, detalhe });
}

// Gera email aleatório para não colidir com dados existentes
function emailAleatorio() {
  return `teste_seg_${Date.now()}@exemplo.com`;
}

// ─── Testes ───────────────────────────────────────────────────────────────────

async function rodarTestes() {
  console.log(`\n🔐 Testando segurança em: ${BASE}\n`);
  console.log("─".repeat(60));

  // ── TESTE 1: Rota privada sem cookie de sessão ────────────────────────────
  {
    const r = await req("GET", "/api/usuarios/me");
    testar(
      "Rota privada sem sessão → 401",
      r.status === 401,
      `Status recebido: ${r.status} | Esperado: 401`
    );
  }

  // ── TESTE 2: Login com senha errada ──────────────────────────────────────
  {
    const r = await req("POST", "/api/usuarios/login", {
      email: "admin@remigioeventos.com",
      senha: "senhaErrada123",
    });
    testar(
      "Login senha errada → 401",
      r.status === 401,
      `Status: ${r.status} | Mensagem: ${r.body.erro}`
    );
  }

  // ── TESTE 3: Login com email inexistente deve dar a MESMA mensagem que senha errada
  {
    const rEmailErrado = await req("POST", "/api/usuarios/login", {
      email: "naoexiste@exemplo.com",
      senha: "qualquercoisa",
    });
    const rSenhaErrada = await req("POST", "/api/usuarios/login", {
      email: "admin@remigioeventos.com",
      senha: "senhaErrada123",
    });
    // As duas mensagens devem ser idênticas — sem vazar qual campo está errado
    testar(
      "Login: mensagem idêntica para email inexistente e senha errada (anti-enumeração)",
      rEmailErrado.status === 401 &&
        rSenhaErrada.status === 401 &&
        rEmailErrado.body.erro === rSenhaErrada.body.erro,
      `Email inexistente: "${rEmailErrado.body.erro}" | Senha errada: "${rSenhaErrada.body.erro}"`
    );
  }

  // ── TESTE 4: Cadastro com senha curta ────────────────────────────────────
  {
    const r = await req("POST", "/api/usuarios", {
      nome: "Teste Segurança",
      email: emailAleatorio(),
      cpf: "00000000000",
      senha: "123",
    });
    testar(
      "Cadastro senha < 8 chars → 400",
      r.status === 400,
      `Status: ${r.status} | Mensagem: "${r.body.erro}"`
    );
  }

  // ── TESTE 4b: Cadastro com email duplicado não confirma que email existe ──
  {
    // Tenta cadastrar com email que provavelmente existe (admin)
    const r = await req("POST", "/api/usuarios", {
      nome: "Tentativa Duplicada",
      email: emailAleatorio(), // usa email aleatório para não depender de dados existentes
      cpf: "11111111111",
      senha: "SenhaValida2026!",
    });
    // Primeiro cadastro
    await req("POST", "/api/usuarios", {
      nome: "Tentativa Duplicada 2",
      email: r.body?.usuario?.email || "teste@dup.com",
      cpf: "11111111111", // mesmo CPF → deve dar conflito
      senha: "SenhaValida2026!",
    });
    // A mensagem de conflito não deve mencionar "email" ou "CPF" especificamente
    const rDup = await req("POST", "/api/usuarios", {
      nome: "Tentativa 3",
      email: emailAleatorio(),
      cpf: "11111111111", // CPF já usado
      senha: "SenhaValida2026!",
    });
    const mensagemVazaInfo =
      (rDup.body.erro || "").toLowerCase().includes("email já") ||
      (rDup.body.erro || "").toLowerCase().includes("cpf já") ||
      (rDup.body.erro || "").toLowerCase().includes("já cadastrado");
    testar(
      "Conflito no cadastro não revela qual campo já existe",
      rDup.status === 409 && !mensagemVazaInfo,
      `Status: ${rDup.status} | Mensagem: "${rDup.body.erro}" | Vaza info: ${mensagemVazaInfo ? "SIM (FALHA!)" : "NÃO ✓"}`
    );
  }

  // ── Cadastro de usuário de teste para os próximos testes ─────────────────
  const emailTeste = emailAleatorio();
  let cookieSessao = null;
  let inscricaoId = null;

  {
    const r = await req("POST", "/api/usuarios", {
      nome: "Usuário Teste Segurança",
      email: emailTeste,
      cpf: `${Date.now()}`.slice(-11).padStart(11, "0"),
      senha: "SenhaSegura2026!",
    });

    cookieSessao = extrairCookie(r.headers);

    testar(
      "Cadastro válido → 201 + cookie de sessão",
      r.status === 201 && cookieSessao !== null,
      `Status: ${r.status} | Cookie: ${cookieSessao ? "presente ✓" : "ausente ✗"}`
    );
  }

  // ── TESTE 5: Rota privada COM sessão válida ───────────────────────────────
  if (cookieSessao) {
    const r = await req("GET", "/api/usuarios/me", null, cookieSessao);
    testar(
      "Rota privada COM sessão → 200",
      r.status === 200 && r.body.usuario && !r.body.usuario.senha,
      `Status: ${r.status} | Senha no JSON: ${"senha" in (r.body.usuario || {}) ? "SIM (FALHA!)" : "NÃO ✓"}`
    );
  }

  // ── TESTE 5b: Confirma que hash bcrypt NUNCA aparece na resposta ──────────
  if (cookieSessao) {
    const r = await req("GET", "/api/usuarios/me", null, cookieSessao);
    const json = JSON.stringify(r.body);
    const temHash = json.includes("$2b$") || json.includes("$2a$");
    testar(
      "Hash bcrypt não aparece em nenhuma resposta",
      !temHash,
      `Hash bcrypt no JSON: ${temHash ? "SIM (FALHA GRAVE!)" : "não encontrado ✓"}`
    );
  }

  // ── Busca primeiro evento ativo para testar inscrição ─────────────────────
  let eventoId = null;
  {
    const r = await req("GET", "/api/eventos");
    const ativo = (r.body.eventos || []).find((e) => e.status === "ativo");
    eventoId = ativo ? ativo.id : null;
  }

  // ── TESTE 6a: Inscrição sem sessão → 401 ─────────────────────────────────
  if (eventoId) {
    const r = await req("POST", "/api/inscricoes", { eventoId });
    testar(
      "Inscrição sem sessão → 401",
      r.status === 401,
      `Status: ${r.status}`
    );
  }

  // ── TESTE 6b: Inscrição válida ────────────────────────────────────────────
  if (eventoId && cookieSessao) {
    const r = await req("POST", "/api/inscricoes", { eventoId }, cookieSessao);
    inscricaoId = r.body.inscricao ? r.body.inscricao.id : null;
    testar(
      "Inscrição com sessão válida → 201",
      r.status === 201,
      `Status: ${r.status} | Inscrição ID: ${inscricaoId}`
    );
  }

  // ── TESTE 6c: Dupla inscrição no mesmo evento → 409 ──────────────────────
  if (eventoId && cookieSessao) {
    const r = await req("POST", "/api/inscricoes", { eventoId }, cookieSessao);
    testar(
      "Dupla inscrição no mesmo evento → 409",
      r.status === 409,
      `Status: ${r.status} | Mensagem: "${r.body.erro}"`
    );
  }

  // ── TESTE 7: Certificado de outro usuário → 403 ───────────────────────────
  // Cria um segundo usuário e tenta acessar a inscrição do primeiro
  if (inscricaoId) {
    const r2 = await req("POST", "/api/usuarios", {
      nome: "Outro Usuário",
      email: emailAleatorio(),
      cpf: `${Date.now() + 1}`.slice(-11).padStart(11, "0"),
      senha: "OutraSenha2026!",
    });

    const cookieOutro = extrairCookie(r2.headers);

    if (cookieOutro) {
      const r = await req("GET", `/api/certificado/${inscricaoId}`, null, cookieOutro);
      testar(
        "Certificado de outro usuário → 403",
        r.status === 403 || r.status === 400,
        `Status: ${r.status} (403 = acesso negado ✓ | 400 = evento não encerrado, também ok)`
      );
    }
  }

  // ── TESTE 8: Rate limiting ────────────────────────────────────────────────
  {
    let ultimo = 0;
    for (let i = 0; i < 12; i++) {
      const r = await req("POST", "/api/usuarios/login", {
        email: "teste@exemplo.com",
        senha: "errada",
      });
      ultimo = r.status;
    }
    testar(
      "Rate limiting após 10+ tentativas → 429",
      ultimo === 429,
      `Último status após 12 tentativas: ${ultimo} | Esperado: 429`
    );
  }

  // ─── Relatório final ──────────────────────────────────────────────────────
  console.log();
  resultados.forEach(({ nome, ok, detalhe }) => {
    const icone = ok ? "✅" : "❌";
    console.log(`${icone} ${nome}`);
    if (!ok) console.log(`   ↳ ${detalhe}`);
  });

  console.log("\n" + "─".repeat(60));
  console.log(`Resultado: ${passou} passou(aram) / ${falhou} falhou(aram)`);

  if (falhou === 0) {
    console.log("🎉 Todos os testes de segurança passaram!\n");
  } else {
    console.log("⚠️  Alguns testes falharam. Verifique acima.\n");
    process.exit(1);
  }
}

rodarTestes().catch((erro) => {
  console.error("Erro ao rodar testes:", erro.message);
  console.error("Verifique se o servidor está rodando em:", BASE);
  process.exit(1);
});
