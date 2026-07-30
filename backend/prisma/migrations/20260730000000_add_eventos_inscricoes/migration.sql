-- AlterTable: adiciona relação de inscrições ao usuário (coluna virtual via FK)

-- CreateTable: Evento
CREATE TABLE "Evento" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "local" TEXT NOT NULL,
    "capacidade" INTEGER NOT NULL DEFAULT 100,
    "imagem" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Inscricao
CREATE TABLE "Inscricao" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "eventoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inscricao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: impede inscrição duplicada no mesmo evento
CREATE UNIQUE INDEX "Inscricao_usuarioId_eventoId_key" ON "Inscricao"("usuarioId", "eventoId");

-- AddForeignKey
ALTER TABLE "Inscricao" ADD CONSTRAINT "Inscricao_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscricao" ADD CONSTRAINT "Inscricao_eventoId_fkey"
    FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
