FROM node:20-alpine

# netcat-openbsd: usado no entrypoint.sh para aguardar o Postgres subir
RUN apk add --no-cache netcat-openbsd

WORKDIR /app

# Copia manifests primeiro para aproveitar o cache de camadas do Docker
# (se package.json não mudar, npm ci não roda de novo no rebuild)
COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

# Copia o restante do código-fonte
COPY . .

# Gera o Prisma Client (necessário para o código funcionar)
RUN npx prisma generate

# Permissão de execução para o script de entrada
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

# entrypoint.sh aguarda o banco, roda migrate + seed, e inicia o servidor
ENTRYPOINT ["/app/entrypoint.sh"]
