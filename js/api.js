// ─── Configuração central da API ──────────────────────────────────────────────
// Detecta o ambiente automaticamente:
//   • porta 8080 → desenvolvimento local com "npx serve -l 8080"
//                  (API rodando separada em localhost:3000)
//   • porta vazia / 80 / 443 → Docker (nginx faz proxy de /api/)
//                               ou produção (GitHub Pages + AWS)
//                               → usa URL relativa: nginx/CDN roteia corretamente
//
// Para produção real (GitHub Pages → AWS), substitua "" pela URL do backend:
// const API_URL = "https://SUA-URL-AWS.amazonaws.com";
const API_URL = window.location.port === "8080"
  ? "http://localhost:3000"                      // desenvolvimento local (npx serve)
  : window.location.hostname === "localhost"
  ? ""                                            // Docker local (nginx faz proxy)
  : "https://apieventos.pedroremigio.com.br";    // produção (GitHub Pages → AWS)

// ─── Fetch com credentials ────────────────────────────────────────────────────
// credentials: "include" envia e recebe o cookie de sessão em todas as
// requisições cross-origin (necessário para rotas privadas funcionarem
// entre GitHub Pages e o backend na AWS/Render).
async function apiFetch(caminho, opcoes = {}) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    headers: { "Content-Type": "application/json", ...(opcoes.headers || {}) },
    credentials: "include",
    ...opcoes,
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || "Erro na requisição.");
  }

  return dados;
}

// ─── Verificação de sessão ────────────────────────────────────────────────────
// Verifica com o servidor se o usuário está logado.
// Retorna o objeto { usuario } ou null.
async function verificarSessao() {
  try {
    return await apiFetch("/api/usuarios/me");
  } catch {
    return null;
  }
}
