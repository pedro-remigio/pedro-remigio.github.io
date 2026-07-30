// ─── EVENTOS DA HOME ──────────────────────────────────────────────────────────
// Menu mobile e link "Área do Usuário" são gerenciados por js/header.js

const eventosContainer = document.getElementById("eventos-container");

function formatarData(dataStr) {
  return new Date(dataStr).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function renderizarEventos(lista) {
  if (!eventosContainer) return;
  eventosContainer.innerHTML = "";

  if (lista.length === 0) {
    eventosContainer.innerHTML = `<p class="text-gray-500 col-span-full text-center py-8">Nenhum evento encontrado.</p>`;
    return;
  }

  lista.forEach((evento) => {
    const imagem = evento.imagem ||
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop";

    const badgeClass = evento.status === "ativo"
      ? "bg-green-100 text-green-700"
      : "bg-gray-200 text-gray-600";
    const badgeTexto = evento.status === "ativo" ? "Inscrições abertas" : "Encerrado";

    const precoHtml = evento.preco != null
      ? `<span class="text-blue-700 font-semibold">R$ ${evento.preco.toFixed(2).replace(".", ",")}</span>`
      : `<span class="text-green-700 font-semibold">Gratuito</span>`;

    eventosContainer.innerHTML += `
      <article class="bg-white rounded-xl shadow-lg overflow-hidden hover:scale-105 transition duration-300 flex flex-col">
        <a href="evento.html?id=${evento.id}">
          <img src="${imagem}" alt="${evento.titulo}" class="w-full h-56 object-cover hover:opacity-90 transition">
        </a>
        <div class="p-6 flex flex-col flex-1">
          <div class="flex items-start justify-between gap-2 mb-2">
            <a href="evento.html?id=${evento.id}" class="hover:text-blue-600 transition">
              <h3 class="text-xl font-bold">${evento.titulo}</h3>
            </a>
            <span class="px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${badgeClass}">${badgeTexto}</span>
          </div>
          <p class="text-gray-500 text-sm mb-3 line-clamp-2">${evento.descricao}</p>
          <p class="text-gray-600 text-sm mb-1">📍 ${evento.local}</p>
          <p class="text-gray-600 text-sm mb-1">📅 ${formatarData(evento.data)}</p>
          <p class="text-sm mb-4">💰 ${precoHtml}</p>
          <div class="mt-auto">
            <a href="evento.html?id=${evento.id}" class="inline-block bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-lg font-semibold text-sm">
              Ver detalhes →
            </a>
          </div>
        </div>
      </article>
    `;
  });
}

async function carregarEventos() {
  if (!eventosContainer) return;

  try {
    const resposta = await fetch(`${API_URL}/api/eventos`);
    const dados = await resposta.json();

    // Mostra os 3 mais próximos eventos ativos primeiro, depois encerrados
    const ativos     = (dados.eventos || []).filter(e => e.status === "ativo");
    const encerrados = (dados.eventos || []).filter(e => e.status !== "ativo");
    renderizarEventos([...ativos, ...encerrados]);

    // Filtro por status
    const filtro = document.getElementById("filtro");
    if (filtro) {
      filtro.addEventListener("change", (e) => {
        const v = e.target.value;
        if (v === "todos")       renderizarEventos([...ativos, ...encerrados]);
        else if (v === "ativo")  renderizarEventos(ativos);
        else                     renderizarEventos(encerrados);
      });
    }
  } catch {
    eventosContainer.innerHTML = `<p class="text-red-500 col-span-full text-center py-8">Não foi possível carregar os eventos.</p>`;
  }
}

carregarEventos();
