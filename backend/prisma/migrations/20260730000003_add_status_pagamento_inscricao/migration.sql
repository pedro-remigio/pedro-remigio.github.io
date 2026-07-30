-- Prepara Inscricao para integração com Mercado Pago
-- status: confirmada (gratuito/já pago) | pendente (aguardando pagamento) | cancelada
-- pagamentoId: ID da transação no MP (nulo até integração ativa)

ALTER TABLE "Inscricao" ADD COLUMN "status"      TEXT NOT NULL DEFAULT 'confirmada';
ALTER TABLE "Inscricao" ADD COLUMN "pagamentoId" TEXT;
