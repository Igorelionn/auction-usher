-- Adicionar coluna para armazenar detalhamento de patrocínios
ALTER TABLE auctions 
ADD COLUMN IF NOT EXISTS detalhe_patrocinios JSONB;

-- Adicionar comentário explicativo
COMMENT ON COLUMN auctions.detalhe_patrocinios IS 'Detalhamento dos patrocinadores e valores recebidos para o leilão';

-- Adicionar coluna para armazenar total de patrocínios
ALTER TABLE auctions 
ADD COLUMN IF NOT EXISTS patrocinios_total NUMERIC(12, 2);

-- Adicionar comentário explicativo
COMMENT ON COLUMN auctions.patrocinios_total IS 'Total de patrocínios recebidos para o leilão';

