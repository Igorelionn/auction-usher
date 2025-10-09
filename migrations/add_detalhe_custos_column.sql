-- Adicionar coluna detalhe_custos para armazenar a composição detalhada dos custos
ALTER TABLE auctions 
ADD COLUMN IF NOT EXISTS detalhe_custos JSONB;

-- Adicionar comentário descritivo
COMMENT ON COLUMN auctions.detalhe_custos IS 'Detalhamento dos itens que compõem os custos totais do leilão (array de objetos com id, descricao, valor e valorNumerico)';

