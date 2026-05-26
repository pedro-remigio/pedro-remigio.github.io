const menuButton = document.getElementById("menu-button");
const mobileMenu = document.getElementById("mobile-menu");

if (menuButton) {
  menuButton.addEventListener("click", () => {
    mobileMenu.classList.toggle("hidden");
  });
}

const eventos = [
  {
    nome: "SuperCon Maceió",
    categoria: "anime",
    local: "Centro de Convenções de Maceió",
    data: "23, 24 e 25 de Junho de 2023",
    imagem:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop",
    pagina: "supercon.html"
  },

  {
    nome: "Game Experience",
    categoria: "games",
    local: "Centro de Convenções de Maceió",
    data: "24, 25 e 26 de Abril de 2025",
    imagem:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop",
    pagina: "game-experience.html"
  }
];

const eventosContainer = document.getElementById("eventos-container");

const filtro = document.getElementById("filtro");

function renderizarEventos(lista) {

  if (!eventosContainer) return;

  eventosContainer.innerHTML = "";

  lista.forEach((evento) => {

    eventosContainer.innerHTML += `
      <article class="bg-white rounded-xl shadow-lg overflow-hidden hover:scale-105 transition duration-300">

        <img
          src="${evento.imagem}"
          alt="${evento.nome}"
          class="w-full h-56 object-cover"
        >

        <div class="p-6">

          <h3 class="text-2xl font-bold mb-2">
            ${evento.nome}
          </h3>

          <p class="mb-2 text-gray-600">
            📍 ${evento.local}
          </p>

          <p class="mb-6 text-gray-600">
            📅 ${evento.data}
          </p>

          <a
            href="${evento.pagina}"
            class="inline-block bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-lg font-semibold"
          >
            Saiba Mais
          </a>

        </div>

      </article>
    `;
  });
}

if (eventosContainer) {
  renderizarEventos(eventos);
}

if (filtro) {

  filtro.addEventListener("change", (event) => {

    const categoriaSelecionada = event.target.value;

    if (categoriaSelecionada === "todos") {
      renderizarEventos(eventos);

      return;
    }

    const eventosFiltrados = eventos.filter((evento) => {
      return evento.categoria === categoriaSelecionada;
    });

    renderizarEventos(eventosFiltrados);

  });

}

const formulario = document.getElementById("form-contato");

const mensagemSucesso = document.getElementById("mensagem-sucesso");

if (formulario) {

  formulario.addEventListener("submit", (event) => {

    event.preventDefault();

    mensagemSucesso.classList.remove("hidden");

    formulario.reset();

  });

}