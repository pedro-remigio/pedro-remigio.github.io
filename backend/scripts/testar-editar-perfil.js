/**
 * testar-editar-perfil.js
 * Testa o fluxo completo de edição de perfil (PATCH /api/usuarios/me)
 *
 * Pré-requisito: backend rodando em http://localhost:3000
 *
 * Como rodar (dentro da pasta backend):
 *   node scripts/testar-editar-perfil.js
 */

const BASE = "http://localhost:3000";

let passou = 0;
let falhou = 0;

function ok(nome) {
  console.log(`  ✅ ${nome}`);
  passou++;
}

function falha(nome, detalhe) {
  console.log(`  ❌ ${nome}`);
  if (detalhe) console.log(`     → ${detalhe}`);
  falhou++;
}

async function post(url, body, cookie) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(`${BASE}${url}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, headers: res.headers };
}

async function patch(url, body, cookie) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(`${BASE}${url}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function get(url, cookie) {
  const headers = {};
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(`${BASE}${url}`, { headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function deletar(url, cookie) {
  const headers = {};
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(`${BASE}${url}`, { method: "DELETE", headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extrairCookie(headers) {
  const raw = headers.get("set-cookie") || "";
  // Pega o connect.sid=...
  const match = raw.match(/(connect\.sid=[^;]+)/);
  return match ? match[1] : null;
}

async function criarContaTeste() {
  // Usa email único por timestamp para evitar conflito
  const ts    = Date.now();
  const email = `teste.perfil.${ts}@exemplo.com`;
  const cpf   = String(ts).slice(-11).padStart(11, "0");

  const res = await post("/api/usuarios", {
    nome:          "Usuário Teste Perfil",
    email,
    cpf,
    telefone:      "+55 82 9 0000-0001",
    tipoDocumento: "cpf",
    senha:         "Senha@123",
  });

  if (res.status !== 201) {
    throw new Error(`Falha ao criar conta de teste: ${JSON.stringify(res.data)}`);
  }

  // Faz login para obter o cookie de sessão
  const login = await post("/api/usuarios/login", { email, senha: "Senha@123" });
  const cookie = extrairCookie(login.headers);

  if (!cookie) throw new Error("Não foi possível obter cookie de sessão.");

  return { email, cookie, id: res.data.usuario.id };
}

async function excluirContaTeste(cookie) {
  // Apenas faz logout — o banco ficará com a conta de teste
  // Em produção, um admin deveria excluí-la
  await post("/api/usuarios/logout", {}, cookie);
}

// ─── Testes ──────────────────────────────────────────────────────────────────

async function rodar() {
  console.log("\n🔧 Testando edição de perfil (PATCH /api/usuarios/me)\n");

  // Setup: cria conta e faz login
  let cookie;
  try {
    const conta = await criarContaTeste();
    cookie = conta.cookie;
    console.log("  🔑 Conta de teste criada e sessão iniciada.\n");
  } catch (e) {
    console.error("  💀 Erro no setup:", e.message);
    process.exit(1);
  }

  // ── 1. Sem autenticação ──────────────────────────────────────────────────
  console.log("1. Segurança — sem autenticação");

  const semAuth = await patch("/api/usuarios/me", { nome: "Hacker", telefone: "+1 000" });
  semAuth.status === 401
    ? ok("PATCH sem cookie retorna 401")
    : falha("PATCH sem cookie deveria retornar 401", `recebeu ${semAuth.status}`);

  // ── 2. Atualização válida ────────────────────────────────────────────────
  console.log("\n2. Atualização válida");

  const res1 = await patch("/api/usuarios/me", {
    nome: "Maria Silva Santos",
    telefone: "+55 82 9 8888-7777",
  }, cookie);

  res1.status === 200
    ? ok("PATCH retorna 200")
    : falha("PATCH deveria retornar 200", `recebeu ${res1.status} — ${JSON.stringify(res1.data)}`);

  res1.data?.usuario?.nome === "Maria Silva Santos"
    ? ok("Nome atualizado corretamente")
    : falha("Nome não foi atualizado", `recebeu: ${res1.data?.usuario?.nome}`);

  res1.data?.usuario?.telefone === "+55 82 9 8888-7777"
    ? ok("Telefone atualizado corretamente")
    : falha("Telefone não foi atualizado", `recebeu: ${res1.data?.usuario?.telefone}`);

  // Confirma no GET /me que os dados foram persistidos
  const me = await get("/api/usuarios/me", cookie);
  me.data?.usuario?.nome === "Maria Silva Santos"
    ? ok("Dados persistidos no banco (confirmado via GET /me)")
    : falha("Dados NÃO persistidos no banco", `GET /me retornou: ${me.data?.usuario?.nome}`);

  // ── 3. Validações ────────────────────────────────────────────────────────
  console.log("\n3. Validações");

  const semNome = await patch("/api/usuarios/me", { nome: "", telefone: "+55 82 9" }, cookie);
  semNome.status === 400
    ? ok("Nome vazio retorna 400")
    : falha("Nome vazio deveria retornar 400", `recebeu ${semNome.status}`);

  const nomeUmaLetra = await patch("/api/usuarios/me", { nome: "A", telefone: "+55 82 9" }, cookie);
  nomeUmaLetra.status === 400
    ? ok("Nome com 1 caractere retorna 400")
    : falha("Nome com 1 caractere deveria retornar 400", `recebeu ${nomeUmaLetra.status}`);

  const semTelefone = await patch("/api/usuarios/me", { nome: "João Silva" }, cookie);
  semTelefone.status === 400
    ? ok("Telefone ausente retorna 400")
    : falha("Telefone ausente deveria retornar 400", `recebeu ${semTelefone.status}`);

  const telefoneVazio = await patch("/api/usuarios/me", { nome: "João Silva", telefone: "  " }, cookie);
  telefoneVazio.status === 400
    ? ok("Telefone só com espaços retorna 400")
    : falha("Telefone só com espaços deveria retornar 400", `recebeu ${telefoneVazio.status}`);

  // ── 4. Campos sensíveis protegidos ──────────────────────────────────────
  console.log("\n4. Proteção de campos sensíveis");

  const tentarMudarEmail = await patch("/api/usuarios/me", {
    nome:     "João",
    telefone: "+55 82 9 9999-0000",
    email:    "hacker@outro.com", // deve ser ignorado
  }, cookie);

  // Verifica que o email não mudou
  const meDepois = await get("/api/usuarios/me", cookie);
  const emailNaoMudou = meDepois.data?.usuario?.email !== "hacker@outro.com";
  emailNaoMudou
    ? ok("Campo email ignorado na atualização (não pode ser trocado via PATCH /me)")
    : falha("VULNERABILIDADE: email foi alterado via PATCH /me!");

  const tentarMudarCpf = await patch("/api/usuarios/me", {
    nome:     "João",
    telefone: "+55 82 9 9999-0000",
    cpf:      "99999999999", // deve ser ignorado
  }, cookie);

  const meDepois2 = await get("/api/usuarios/me", cookie);
  const cpfNaoMudou = meDepois2.data?.usuario?.cpf !== "99999999999";
  cpfNaoMudou
    ? ok("Campo cpf ignorado na atualização (não pode ser trocado via PATCH /me)")
    : falha("VULNERABILIDADE: CPF foi alterado via PATCH /me!");

  // ── 5. Logout e sessão inválida ──────────────────────────────────────────
  console.log("\n5. Pós-logout");

  await post("/api/usuarios/logout", {}, cookie);
  const aposLogout = await patch("/api/usuarios/me", { nome: "Teste", telefone: "+1" }, cookie);
  aposLogout.status === 401
    ? ok("PATCH após logout retorna 401")
    : falha("PATCH após logout deveria retornar 401", `recebeu ${aposLogout.status}`);

  // ── Resultado ────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log(`  Total: ${passou + falhou} | ✅ ${passou} passou | ❌ ${falhou} falhou`);
  console.log("─".repeat(50) + "\n");

  if (falhou > 0) process.exit(1);
}

rodar().catch((e) => {
  console.error("\n💀 Erro inesperado:", e.message);
  process.exit(1);
});
