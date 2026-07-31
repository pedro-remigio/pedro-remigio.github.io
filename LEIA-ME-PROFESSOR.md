# Remigio Eventos — Instruções para Execução com Docker

## Pré-requisitos

Instale o **Docker Desktop** antes de começar:
- Windows/Mac: https://www.docker.com/products/docker-desktop
- Linux: https://docs.docker.com/engine/install/

Verifique a instalação:
```
docker --version
docker compose version
```

---

## Rodando o projeto (comando único)

1. Abra o terminal na **pasta raiz do projeto** (onde está este arquivo).

2. Execute:
   ```
   docker compose up --build
   ```

   O que acontece automaticamente:
   - Sobe o banco de dados PostgreSQL
   - Instala as dependências do backend (`npm ci`)
   - Aguarda o banco estar pronto
   - Roda as migrations do banco
   - Popula o banco com dados iniciais (eventos + conta admin)
   - Sobe o servidor Node.js
   - Sobe o nginx servindo o frontend

   Na primeira execução leva ~2 minutos para baixar as imagens e compilar.
   Nas próximas execuções leva ~15 segundos.

3. Quando aparecer `Servidor rodando em http://localhost:3000` no terminal, o projeto está pronto.

---

## Acessando o projeto

| O que acessar | URL |
|---|---|
| Site (frontend) | http://localhost |
| Painel do Administrador | http://localhost/admin |

---

## Credenciais do Administrador

| Campo | Valor |
|---|---|
| Email | admin@remigioeventos.com |
| Senha | Oxetech2026 |

---

## Conta de usuário para teste

Crie uma conta normalmente pelo site em:
http://localhost/cadastro.html

Ou use estas credenciais se o banco já tiver sido populado com um usuário de teste:
- Email: teste@teste.com
- Senha: Teste@123

---

## Encerrando o projeto

```
Ctrl + C
```

Para remover os containers e o volume do banco (dados apagados):
```
docker compose down -v
```

Para remover apenas os containers (mantendo os dados):
```
docker compose down
```

---

## Estrutura do projeto

```
Oxetech/                    ← raiz do projeto
├── *.html                  ← páginas do site
├── js/                     ← JavaScript do frontend (api.js, header.js, main.js)
├── assets/                 ← imagens
├── nginx.conf              ← configuração do servidor web
├── Dockerfile.nginx        ← imagem Docker do frontend
├── docker-compose.yml      ← orquestração de todos os serviços
├── LEIA-ME-PROFESSOR.md    ← este arquivo
└── backend/                ← API Node.js + Express
    ├── src/
    │   ├── server.js       ← entrada do servidor
    │   └── routes/
    │       ├── public.js   ← rotas da API pública (/api/*)
    │       ├── admin.js    ← rotas do painel admin (/admin/*)
    │       └── pagamentos.js ← integração Mercado Pago (/api/pagamentos/*)
    ├── prisma/
    │   ├── schema.prisma   ← modelos do banco de dados
    │   ├── seed.js         ← dados iniciais (admin + eventos)
    │   └── migrations/     ← histórico de migrações SQL
    ├── Dockerfile          ← imagem Docker do backend
    └── entrypoint.sh       ← script de inicialização do container
```

---

## Tecnologias utilizadas

- **Frontend:** HTML5, CSS (Tailwind CDN), JavaScript puro
- **Backend:** Node.js 20, Express, Prisma ORM
- **Banco de dados:** PostgreSQL 17
- **Servidor web:** nginx (proxy reverso + arquivos estáticos)
- **Segurança:** bcrypt (custo 12), express-session, helmet, rate limiting
- **Pagamentos:** Mercado Pago Checkout Pro + webhook HMAC-SHA256
- **Containerização:** Docker + Docker Compose

---

## Problemas comuns

**Porta 80 em uso:**
Outro serviço está usando a porta 80. Edite `docker-compose.yml` e troque `"80:80"` por `"8080:80"`, depois acesse http://localhost:8080.

**"Cannot connect to the Docker daemon":**
O Docker Desktop não está rodando. Abra o aplicativo Docker Desktop e tente novamente.

**Banco de dados com dados antigos:**
Execute `docker compose down -v` para limpar tudo e depois `docker compose up --build` para recomeçar do zero.
