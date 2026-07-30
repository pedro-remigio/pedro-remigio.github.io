#!/bin/sh
# Entrypoint do container backend — executa na ordem correta:
#   1. Aguarda o Postgres estar pronto (evita falha de conexão na subida)
#   2. Roda as migrations do Prisma
#   3. Roda o seed (cria admin e eventos iniciais se não existirem)
#   4. Inicia o servidor Node.js

set -e

echo "======================================="
echo "  Remigio Eventos — iniciando backend"
echo "======================================="

# ─── 1. Aguarda Postgres ─────────────────────────────────────────────────────
echo "Aguardando banco de dados (postgres:5432)..."
until nc -z db 5432; do
  echo "  Postgres ainda não disponível — aguardando 2s..."
  sleep 2
done
echo "✓ Banco de dados disponível!"

# ─── 2. Migrations ────────────────────────────────────────────────────────────
echo ""
echo "Executando migrações do Prisma..."
npx prisma migrate deploy
echo "✓ Migrações concluídas!"

# ─── 3. Seed ─────────────────────────────────────────────────────────────────
echo ""
echo "Populando banco de dados (seed)..."
node prisma/seed.js
echo "✓ Seed concluído!"

# ─── 4. Inicia servidor ──────────────────────────────────────────────────────
echo ""
echo "Iniciando servidor Node.js..."
exec node src/server.js
