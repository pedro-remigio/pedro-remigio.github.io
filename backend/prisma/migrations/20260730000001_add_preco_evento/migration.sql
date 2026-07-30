-- AlterTable: adiciona coluna preco na tabela Evento
-- NULL = evento gratuito; valor em reais para exibição no front-end
ALTER TABLE "Evento" ADD COLUMN "preco" DOUBLE PRECISION;
