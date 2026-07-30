/**
 * header.js — Header compartilhado do Remigio Eventos
 *
 * Como usar em qualquer página HTML:
 *   1. Adicione no <head>: <script src="./js/header.js"></script>
 *   2. Coloque no <body>, onde o header deve aparecer:
 *        <div id="header-root"></div>
 *
 * Para mostrar o botão "← Voltar", use data-attributes:
 *   <div id="header-root" data-voltar="index.html" data-voltar-texto="← Voltar"></div>
 */

(function () {
  // Aguarda o DOM estar pronto
  document.addEventListener("DOMContentLoaded", function () {

    const placeholder = document.getElementById("header-root");
    if (!placeholder) return;

    // Lê configurações do data-attribute da div
    const voltarHref  = placeholder.dataset.voltar    || null;
    const voltarTexto = placeholder.dataset.voltarTexto || "← Voltar";

    // Detecta página atual para marcar o link ativo
    const pagina = window.location.pathname.split("/").pop() || "index.html";

    function navClass(href) {
      return pagina === href
        ? "text-blue-400 font-semibold"
        : "hover:text-blue-400 transition";
    }

    // Barra de voltar (opcional)
    const voltarBar = voltarHref
      ? `<div class="bg-gray-900 px-6 py-3 flex justify-end">
           <a href="${voltarHref}" class="bg-black hover:bg-blue-600 transition px-4 py-2 rounded-lg shadow-lg text-sm">
             ${voltarTexto}
           </a>
         </div>`
      : "";

    // Monta o HTML do header
    const header = document.createElement("header");
    header.className = "bg-black text-white fixed top-0 w-full z-50 shadow-lg";
    header.innerHTML = `

      <!-- MENU DESKTOP -->
      <nav class="container mx-auto flex items-center justify-between p-4">

        <!-- LOGO -->
        <div class="flex items-center gap-3">
          <img src="./assets/images/logo.png" alt="Logo Remigio Eventos"
            class="w-12 h-12 rounded-full object-cover">
          <span class="font-bold text-xl">Remigio Eventos</span>
        </div>

        <!-- LINKS DESKTOP -->
        <ul class="hidden md:flex gap-6">
          <li><a href="index.html"        class="${navClass("index.html")}">Home</a></li>
          <li><a href="quem-somos.html"   class="${navClass("quem-somos.html")}">Quem Somos</a></li>
          <li><a href="eventos.html"      class="${navClass("eventos.html")}">Eventos</a></li>
          <li><a href="contato.html"      class="${navClass("contato.html")}">Contato</a></li>
          <li id="nav-usuario">
            <a href="area-usuario.html" class="${navClass("area-usuario.html")}">Área do Usuário</a>
          </li>
        </ul>

        <!-- BOTÃO HAMBURGUER (mobile) -->
        <button id="menu-button"
          class="md:hidden bg-gray-900 hover:bg-blue-600 transition px-4 py-2 rounded-lg text-2xl shadow-lg">
          ☰
        </button>

      </nav>

      <!-- MENU MOBILE -->
      <div id="mobile-menu" class="hidden md:hidden bg-black px-5 pb-6 pt-2 shadow-2xl">
        <div class="flex flex-col gap-4">
          <a href="index.html"
            class="bg-gray-900 hover:bg-blue-600 transition duration-300 rounded-xl px-5 py-4 text-lg font-semibold shadow-lg">
            🏠 Home
          </a>
          <a href="quem-somos.html"
            class="bg-gray-900 hover:bg-blue-600 transition duration-300 rounded-xl px-5 py-4 text-lg font-semibold shadow-lg">
            👥 Quem Somos
          </a>
          <a href="eventos.html"
            class="bg-gray-900 hover:bg-blue-600 transition duration-300 rounded-xl px-5 py-4 text-lg font-semibold shadow-lg">
            🎟️ Eventos
          </a>
          <a href="contato.html"
            class="bg-gray-900 hover:bg-blue-600 transition duration-300 rounded-xl px-5 py-4 text-lg font-semibold shadow-lg">
            📞 Contato
          </a>
          <a href="area-usuario.html" id="mobile-nav-usuario"
            class="bg-gray-900 hover:bg-blue-600 transition duration-300 rounded-xl px-5 py-4 text-lg font-semibold shadow-lg">
            👤 Área do Usuário
          </a>
        </div>
      </div>

      <!-- BARRA DE VOLTAR (opcional) -->
      ${voltarBar}
    `;

    // Substitui o placeholder pelo header real
    placeholder.replaceWith(header);

    // Toggle menu mobile
    document.getElementById("menu-button").addEventListener("click", function () {
      document.getElementById("mobile-menu").classList.toggle("hidden");
    });

    // Se o usuário estiver logado, exibe "Olá, Nome" no lugar de "Área do Usuário"
    const usuarioLocal = sessionStorage.getItem("usuario");
    if (usuarioLocal) {
      try {
        const u    = JSON.parse(usuarioLocal);
        const nome = u.nome.split(" ")[0];

        const navUsuario = document.getElementById("nav-usuario");
        if (navUsuario) {
          navUsuario.innerHTML =
            `<a href="area-usuario.html" class="hover:text-blue-400 transition">Olá, ${nome}</a>`;
        }

        const mobileNav = document.getElementById("mobile-nav-usuario");
        if (mobileNav) {
          mobileNav.textContent = `👤 Olá, ${nome}`;
          mobileNav.href = "area-usuario.html";
        }
      } catch {}
    }

  });
})();
