# Remigio Eventos e Serviços

Projeto desenvolvido para os Check-points de conhecimento da Oxetech Academy (front-end e back-end).

## Objetivo

Demonstrar conhecimentos em:

- HTML semântico;
- Tailwind CSS;
- Responsividade;
- JavaScript;
- DOM e eventos;
- Validação de formulário;
- Publicação estática;
- Express, Prisma e PostgreSQL;
- Área administrativa com login.

## Funcionalidades

- Menu responsivo mobile;
- Renderização dinâmica de eventos;
- Filtro de eventos;
- Formulário de contato com feedback visual;
- Cadastro e login de usuário;
- Área de administrador pra visualizar quem se cadastrou no site;
- Layout responsivo;
- Navegação entre páginas.

## Tecnologias utilizadas

- HTML5
- Tailwind CSS
- JavaScript Vanilla
- Node.js e Express
- Prisma ORM
- PostgreSQL

## Backend

O backend fica na pasta `/backend`. Ele recebe os dados do formulário de contato e os cadastros de usuário (nome, email, CPF e senha), salva tudo num banco PostgreSQL via Prisma, e tem uma área de admin (`/admin/login`) pra consultar esses dados.

## Publicação

Front-end publicado via GitHub Pages. Backend publicado no Render, com banco PostgreSQL no Neon.