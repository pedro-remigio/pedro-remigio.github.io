-- AlterTable: Lead — adiciona telefone/WhatsApp do visitante
ALTER TABLE "Lead" ADD COLUMN "telefone" TEXT;

-- AlterTable: Usuario — adiciona telefone e tipo de documento
ALTER TABLE "Usuario" ADD COLUMN "telefone" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "tipoDocumento" TEXT NOT NULL DEFAULT 'cpf';

-- CreateTable: tokens para redefinição de senha (1 hora de validade)
CREATE TABLE "TokenRedefinicaoSenha" (
    "id"        SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "token"     TEXT NOT NULL,
    "expiraEm"  TIMESTAMP(3) NOT NULL,
    "usado"     BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenRedefinicaoSenha_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TokenRedefinicaoSenha_token_key" ON "TokenRedefinicaoSenha"("token");

ALTER TABLE "TokenRedefinicaoSenha"
    ADD CONSTRAINT "TokenRedefinicaoSenha_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
