-- Tabela para rastrear emails enviados
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id TEXT NOT NULL,
  arrematante_nome TEXT NOT NULL,
  tipo_email TEXT NOT NULL CHECK (tipo_email IN ('lembrete', 'cobranca', 'confirmacao')),
  email_destinatario TEXT NOT NULL,
  data_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sucesso BOOLEAN DEFAULT false,
  erro TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_email_logs_auction_id ON email_logs(auction_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_tipo_email ON email_logs(tipo_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_data_envio ON email_logs(data_envio DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_sucesso ON email_logs(sucesso);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_email_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_logs_updated_at
  BEFORE UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_logs_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção e leitura para usuários autenticados
CREATE POLICY "Permitir inserção para usuários autenticados"
  ON email_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir leitura para usuários autenticados"
  ON email_logs FOR SELECT
  TO authenticated
  USING (true);

-- Comentários da tabela
COMMENT ON TABLE email_logs IS 'Logs de emails enviados pelo sistema de notificações';
COMMENT ON COLUMN email_logs.auction_id IS 'ID do leilão/arrematação relacionada';
COMMENT ON COLUMN email_logs.tipo_email IS 'Tipo de email: lembrete, cobranca ou confirmacao';
COMMENT ON COLUMN email_logs.email_destinatario IS 'Email do destinatário';
COMMENT ON COLUMN email_logs.sucesso IS 'Se o email foi enviado com sucesso';
COMMENT ON COLUMN email_logs.erro IS 'Mensagem de erro caso o envio tenha falhado';

