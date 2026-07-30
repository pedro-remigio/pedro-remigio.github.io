# Remigio Eventos e Serviços

Plataforma web full stack para cadastro, listagem e inscrição em eventos.
Desenvolvida como Projeto Final Integrador da Oxetech Academy.

## Links publicados

| Serviço | URL |
|---------|-----|
| Front-end | https://eventos.pedroremigio.com.br |
| Back-end (API) | https://apieventos.pedroremigio.com.br |
| Painel do Admin | https://apieventos.pedroremigio.com.br/admin/login |

## Credenciais do Admin

| Campo | Valor |
|-------|-------|
| Email | admin@remigioeventos.com |
| Senha | definida no `.env` do servidor |

## Funcionalidades

- Listagem de eventos (ativos e encerrados) com filtro por status
- Inscrição em eventos para usuários autenticados
- Área do usuário com edição de perfil e solicitação de alteração de dados sensíveis
- Formulário de contato persistido no banco de dados
- Cadastro e login com senha criptografada (bcrypt custo 12) e sessão em cookie httpOnly
- Redefinição de senha via token
- Painel administrativo com CRUD de eventos, relatório por evento, inscrições e mensagens
- Segurança: Helmet, CORS restrito, rate limiting, anti-enumeração, cookie seguro em produção

## Entidades do banco

```
Usuario ─── Inscricao ─── Evento
TokenRedefinicaoSenha
Lead
Admin
```

- **Usuario**: id, nome, email (único), cpf (único), tipoDocumento, telefone, senha (bcrypt), createdAt
- **Evento**: id, titulo, descricao, data, local, capacidade, imagem, preco, status, createdAt
- **Inscricao**: id, usuarioId (FK), eventoId (FK), status (confirmada/pendente/cancelada), pagamentoId, createdAt
- **Lead**: id, nome, email, telefone, evento, mensagem, createdAt
- **Admin**: id, email (único), senha (bcrypt)

## Endpoints principais da API

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/api/eventos` | Público | Lista todos os eventos |
| GET | `/api/eventos/:id` | Público | Detalhes de um evento |
| POST | `/api/leads` | Público | Envia mensagem de contato |
| POST | `/api/usuarios` | Público | Cadastro de usuário |
| POST | `/api/usuarios/login` | Público | Login |
| POST | `/api/usuarios/logout` | Público | Logout |
| GET | `/api/usuarios/me` | Privado | Dados do usuário logado |
| PATCH | `/api/usuarios/me` | Privado | Atualiza nome e telefone |
| GET | `/api/usuarios/me/inscricoes` | Privado | Inscrições do usuário |
| POST | `/api/inscricoes` | Privado | Inscreve usuário em evento |
| POST | `/api/usuarios/esqueci-senha` | Público | Solicita reset de senha |
| POST | `/api/usuarios/redefinir-senha` | Público | Redefine senha via token |
| GET | `/admin/dashboard` | Admin | Painel administrativo |
| GET | `/admin/eventos/:id/relatorio` | Admin | Relatório do evento |

## Variáveis de ambiente (backend)

Crie o arquivo `backend/.env` com base em `backend/.env.docker.example`:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=senha-forte
POSTGRES_DB=remigio_eventos
SESSION_SECRET=string-aleatoria-longa
ADMIN_EMAIL=admin@remigioeventos.com
ADMIN_PASSWORD=senha-forte
FRONTEND_URL=https://eventos.pedroremigio.com.br
NODE_ENV=production
```

## Infraestrutura de produção

| Componente | Serviço |
|------------|---------|
| Frontend | GitHub Pages + domínio próprio |
| Backend | AWS EC2 t3.micro (Amazon Linux 2023) |
| Banco de dados | PostgreSQL via Docker no EC2 |
| SSL | Let's Encrypt (Certbot) |
| Domínio | pedroremigio.com.br (Registro.br) |

## Deploy na AWS (EC2)

```bash
# Na instância EC2 (Amazon Linux 2023), após conectar via SSH:
git clone https://github.com/pedro-remigio/pedro-remigio.github.io.git
cd pedro-remigio.github.io/backend

# Instala Docker (só na primeira vez)
bash scripts/ec2-setup.sh

# Reconecte via SSH após o script, depois:
cp .env.docker.example .env
nano .env   # preencha com os valores reais de produção

docker compose up -d --build
```

## Rodando localmente com Docker

```bash
# Da pasta raiz do projeto:
docker compose up --build

# Acesse:
# Site:  http://localhost
# Admin: http://localhost/admin
```

## Rodando localmente sem Docker

```bash
cd backend
npm install
cp .env.example .env   # configure DATABASE_URL com um Postgres local
npx prisma migrate deploy
node prisma/seed.js
npm run dev

# Frontend: na pasta raiz, rode:
npx serve -l 8080
```

## Tecnologias

- HTML5, Tailwind CSS (CDN), JavaScript Vanilla
- Node.js 20, Express, EJS
- Prisma ORM, PostgreSQL 17
- bcryptjs, express-session, Helmet, CORS
- Docker, Docker Compose, nginx
- GitHub Pages (frontend), AWS EC2 (backend)
- Domínio próprio + Let's Encrypt (SSL)

## Próximos passos

- Integração com Mercado Pago (inscrição paga no Campeonato de LoL)
- Upload de imagens para eventos
- Notificações por e-mail (confirmação de inscrição)
