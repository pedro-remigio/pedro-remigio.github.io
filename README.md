# Remigio Eventos e Serviços

Plataforma web full stack para cadastro, listagem e inscrição em eventos.
Desenvolvida como Projeto Final Integrador da Oxetech Academy.

## Links publicados

| Serviço | URL |
|---------|-----|
| Front-end (GitHub Pages) | https://pedro-remigio.github.io |
| Back-end (AWS / Render) | https://remigio-eventos-backend.onrender.com |
| Painel do Admin | https://remigio-eventos-backend.onrender.com/admin/login |

## Funcionalidades

- Listagem de eventos (ativos e encerrados) com filtro por status
- Inscrição em eventos para usuários autenticados
- Área do usuário com inscrições e download de certificado de participação
- Formulário de contato persistido no banco de dados
- Cadastro e login com senha criptografada (bcrypt) e sessão em cookie httpOnly
- Painel administrativo com CRUD de eventos, inscrições e mensagens de contato
- Segurança básica: Helmet, CORS restrito, rate limiting no login, cookie seguro em produção

## Entidades do banco

```
Usuario ─── Inscricao ─── Evento
Lead
Admin
```

- **Usuario**: id, nome, email (único), cpf (único), senha (hash bcrypt), createdAt
- **Evento**: id, titulo, descricao, data, local, capacidade, imagem, status (ativo/encerrado/cancelado), createdAt
- **Inscricao**: id, usuarioId (FK), eventoId (FK), createdAt — unique(usuarioId, eventoId)
- **Lead**: id, nome, email, evento, mensagem, createdAt
- **Admin**: id, email (único), senha (hash bcrypt)

## Endpoints principais da API

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/api/eventos` | Público | Lista todos os eventos |
| GET | `/api/eventos/:id` | Público | Detalhes de um evento |
| POST | `/api/leads` | Público | Envia mensagem de contato |
| POST | `/api/usuarios` | Público | Cadastro de usuário |
| POST | `/api/usuarios/login` | Público | Login (cria sessão em cookie) |
| POST | `/api/usuarios/logout` | Público | Logout (destrói sessão) |
| GET | `/api/usuarios/me` | Privado | Dados do usuário logado |
| GET | `/api/usuarios/me/inscricoes` | Privado | Inscrições do usuário logado |
| POST | `/api/inscricoes` | Privado | Inscreve usuário em evento |
| GET | `/api/certificado/:id` | Privado | Certificado HTML de participação |
| GET | `/admin/login` | Admin | Login do painel administrativo |
| GET | `/admin/dashboard` | Admin | Painel com todos os dados |
| POST | `/admin/eventos` | Admin | Cria evento |
| POST | `/admin/eventos/:id` | Admin | Atualiza evento |
| POST | `/admin/eventos/:id/deletar` | Admin | Remove evento |

## Variáveis de ambiente (backend)

Crie o arquivo `backend/.env` com base em `backend/.env.example`:

```env
DATABASE_URL="postgresql://usuario:senha@host:5432/remigio_eventos?schema=public"
PORT=3000
SESSION_SECRET="string-aleatoria-longa"
ADMIN_EMAIL="admin@remigioeventos.com"
ADMIN_PASSWORD="sua-senha"
FRONTEND_URL="https://pedro-remigio.github.io"
NODE_ENV="production"
```

## Rodando localmente com Docker (ISO offline)

```bash
# 1. Entre na pasta do backend
cd backend

# 2. Copie o arquivo de variáveis
cp .env.docker.example .env
# (edite o .env com suas senhas)

# 3. Suba os containers (backend Node + PostgreSQL)
docker compose up --build

# 4. (Opcional) Populando com dados de exemplo
docker compose exec backend npm run seed
```

Acesse: http://localhost:3000/admin/login

Login padrão: `admin@remigioeventos.com` / definido no `.env`

## Rodando localmente (sem Docker)

```bash
cd backend
npm install
# Configure o .env com DATABASE_URL apontando para um Postgres local ou Neon
npx prisma migrate deploy
npx prisma generate
npm run seed
npm run dev
```

## Deploy na AWS (EC2)

```bash
# Na instância EC2 (Ubuntu 22.04):
git clone https://github.com/pedro-remigio/pedro-remigio.github.io.git
cd pedro-remigio.github.io/backend

# Instala Docker
bash scripts/ec2-setup.sh

# (Reconecte via SSH após o script)
cp .env.docker.example .env
# Edite o .env com NODE_ENV=production e FRONTEND_URL=https://pedro-remigio.github.io
nano .env

docker compose up -d --build
```

## Tecnologias

- HTML5, Tailwind CSS, JavaScript Vanilla
- Node.js, Express, EJS
- Prisma ORM, PostgreSQL (Neon)
- bcryptjs, express-session, Helmet, CORS
- Docker, Docker Compose
- GitHub Pages (front), AWS EC2 (back)

## Limitações conhecidas e próximos passos

- Sem sistema de pagamentos (fora do escopo acadêmico)
- Sessão armazenada em memória (sem persistência entre reinicializações do servidor)
- Certificado gerado em HTML (sem assinatura digital)
- Próximos passos: integração de pagamentos (Stripe/Mercado Pago), upload de imagens, notificações por email, testes automatizados
