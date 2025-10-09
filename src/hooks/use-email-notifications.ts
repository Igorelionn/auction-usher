import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Auction } from '@/lib/types';
import { getLembreteEmailTemplate, getCobrancaEmailTemplate, getConfirmacaoPagamentoEmailTemplate } from '@/lib/email-templates';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmailConfig {
  resendApiKey?: string;
  emailRemetente: string;
  diasAntesLembrete: number; // dias antes do vencimento para enviar lembrete
  diasDepoisCobranca: number; // dias depois do vencimento para enviar cobrança
  enviarAutomatico: boolean; // se deve enviar automaticamente ou apenas manual
}

interface EmailLog {
  id: string;
  auction_id: string;
  arrematante_nome: string;
  tipo_email: 'lembrete' | 'cobranca' | 'confirmacao';
  email_destinatario: string;
  data_envio: string;
  sucesso: boolean;
  erro?: string;
}

const DEFAULT_CONFIG: EmailConfig = {
  resendApiKey: 're_SfWdJiMK_7352YoeoJdgw3mBSe2eArUBH',
  emailRemetente: 'notificacoes@grupoliraleiloes.com',
  diasAntesLembrete: 3,
  diasDepoisCobranca: 1,
  enviarAutomatico: true,
};

export function useEmailNotifications() {
  const [config, setConfig] = useState<EmailConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  // Carregar configurações do localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('email_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      } catch (error) {
        console.error('Erro ao carregar configurações de email:', error);
      }
    }
  }, []);

  // Salvar configurações
  const saveConfig = (newConfig: Partial<EmailConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    localStorage.setItem('email_config', JSON.stringify(updated));
  };

  // Verificar se email já foi enviado
  const jaEnviouEmail = async (
    auctionId: string,
    tipoEmail: 'lembrete' | 'cobranca' | 'confirmacao'
  ): Promise<boolean> => {
    const hoje = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('email_logs')
      .select('id')
      .eq('auction_id', auctionId)
      .eq('tipo_email', tipoEmail)
      .gte('data_envio', hoje)
      .eq('sucesso', true)
      .limit(1);

    if (error) {
      console.error('Erro ao verificar emails enviados:', error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  };

  // Registrar log de email
  const registrarLog = async (log: Omit<EmailLog, 'id'>) => {
    const { error } = await supabase
      .from('email_logs')
      .insert([log]);

    if (error) {
      console.error('Erro ao registrar log de email:', error);
    }
  };

  // Calcular valor com juros
  const calcularValorComJuros = (
    valorOriginal: number,
    diasAtraso: number,
    percentualJuros: number = 0,
    tipoJuros: 'simples' | 'composto' = 'simples'
  ): { valorJuros: number; valorTotal: number } => {
    // Validações de segurança
    if (diasAtraso <= 0 || percentualJuros <= 0 || valorOriginal <= 0) {
      return { valorJuros: 0, valorTotal: valorOriginal };
    }

    // Limitar dias de atraso a um máximo razoável (5 anos = 1825 dias)
    if (diasAtraso > 1825) {
      console.warn(`⚠️ Dias de atraso muito alto (${diasAtraso}), limitando a 1825 dias (5 anos)`);
      diasAtraso = 1825;
    }

    // Limitar juros a um máximo razoável (20% ao mês)
    if (percentualJuros > 20) {
      console.warn(`⚠️ Percentual de juros muito alto (${percentualJuros}%), limitando a 20%`);
      percentualJuros = 20;
    }

    const taxaMensal = percentualJuros / 100;
    const mesesAtraso = diasAtraso / 30;

    let valorJuros = 0;
    
    if (tipoJuros === 'simples') {
      valorJuros = valorOriginal * taxaMensal * mesesAtraso;
    } else {
      // Juros compostos
      const valorTotal = valorOriginal * Math.pow(1 + taxaMensal, mesesAtraso);
      valorJuros = valorTotal - valorOriginal;
    }

    // Limitar juros a no máximo 500% do valor original (proteção adicional)
    if (valorJuros > valorOriginal * 5) {
      console.warn(`⚠️ Juros calculados muito altos (${valorJuros.toFixed(2)}), limitando a 500% do valor original`);
      valorJuros = valorOriginal * 5;
    }

    return {
      valorJuros: Math.round(valorJuros * 100) / 100,
      valorTotal: Math.round((valorOriginal + valorJuros) * 100) / 100,
    };
  };

  // Enviar email usando Supabase Edge Function (intermediário seguro)
  const enviarEmail = async (
    destinatario: string,
    assunto: string,
    htmlContent: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!config.resendApiKey) {
      return {
        success: false,
        error: 'Chave API do Resend não configurada. Configure em Configurações > Notificações por Email.',
      };
    }

    try {
      // URL da Edge Function do Supabase
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://moojuqphvhrhasxhaahd.supabase.co';
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-email`;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vb2p1cXBodmhyaGFzeGhhYWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDExMzEsImV4cCI6MjA3MjYxNzEzMX0.GR3YIs0QWsZP3Rdvw_-vCOPVtH2KCaoVO2pKeo1-WPs';

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          to: destinatario,
          subject: assunto,
          html: htmlContent,
          from: `Arthur Lira Leilões <${config.emailRemetente}>`,
          resendApiKey: config.resendApiKey,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao enviar email');
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  };

  // Enviar lembrete de pagamento
  const enviarLembrete = async (auction: Auction): Promise<{ success: boolean; message: string }> => {
    if (!auction.arrematante?.email) {
      return { success: false, message: 'Arrematante não possui email cadastrado' };
    }

    // Verificar se já enviou hoje
    const jaEnviou = await jaEnviouEmail(auction.id, 'lembrete');
    if (jaEnviou) {
      return { success: false, message: 'Lembrete já foi enviado hoje para este arrematante' };
    }

    // Determinar data de vencimento
    let dataVencimento: Date;
    if (auction.tipoPagamento === 'a_vista' && auction.dataVencimentoVista) {
      dataVencimento = parseISO(auction.dataVencimentoVista);
    } else if (auction.arrematante.dataEntrada) {
      dataVencimento = parseISO(auction.arrematante.dataEntrada);
    } else if (auction.arrematante.mesInicioPagamento && auction.arrematante.diaVencimentoMensal) {
      const [ano, mes] = auction.arrematante.mesInicioPagamento.split('-');
      dataVencimento = new Date(parseInt(ano), parseInt(mes) - 1, auction.arrematante.diaVencimentoMensal);
    } else {
      return { success: false, message: 'Data de vencimento não configurada' };
    }

    const hoje = new Date();
    const diasRestantes = differenceInDays(dataVencimento, hoje);

    // Determinar informações de parcela
    const lote = auction.lotes?.find(l => l.id === auction.arrematante?.loteId);
    const tipoPagamento = lote?.tipoPagamento || auction.tipoPagamento;
    const parcelaAtual = (auction.arrematante.parcelasPagas || 0) + 1;
    const totalParcelas = auction.arrematante.quantidadeParcelas || lote?.parcelasPadrao || 0;

    const templateData = {
      arrematanteNome: auction.arrematante.nome,
      leilaoNome: auction.nome,
      loteNumero: auction.lotes?.[0]?.numero,
      valorPagar: auction.arrematante.valorPagar || `R$ ${auction.arrematante.valorPagarNumerico.toFixed(2)}`,
      dataVencimento: format(dataVencimento, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      diasRestantes,
      tipoPagamento,
      parcelaAtual,
      totalParcelas,
    };

    const { subject, html } = getLembreteEmailTemplate(templateData);
    const result = await enviarEmail(auction.arrematante.email, subject, html);

    // Registrar log
    await registrarLog({
      auction_id: auction.id,
      arrematante_nome: auction.arrematante.nome,
      tipo_email: 'lembrete',
      email_destinatario: auction.arrematante.email,
      data_envio: new Date().toISOString(),
      sucesso: result.success,
      erro: result.error,
    });

    return {
      success: result.success,
      message: result.success
        ? `Lembrete enviado com sucesso para ${auction.arrematante.email}`
        : `Erro ao enviar lembrete: ${result.error}`,
    };
  };

  // Enviar cobrança de atraso
  const enviarCobranca = async (auction: Auction): Promise<{ success: boolean; message: string }> => {
    if (!auction.arrematante?.email) {
      return { success: false, message: 'Arrematante não possui email cadastrado' };
    }

    // Verificar se já enviou hoje
    const jaEnviou = await jaEnviouEmail(auction.id, 'cobranca');
    if (jaEnviou) {
      return { success: false, message: 'Cobrança já foi enviada hoje para este arrematante' };
    }

    // Determinar data de vencimento
    let dataVencimento: Date;
    if (auction.tipoPagamento === 'a_vista' && auction.dataVencimentoVista) {
      dataVencimento = parseISO(auction.dataVencimentoVista);
    } else if (auction.arrematante.dataEntrada) {
      dataVencimento = parseISO(auction.arrematante.dataEntrada);
    } else if (auction.arrematante.mesInicioPagamento && auction.arrematante.diaVencimentoMensal) {
      const [ano, mes] = auction.arrematante.mesInicioPagamento.split('-');
      dataVencimento = new Date(parseInt(ano), parseInt(mes) - 1, auction.arrematante.diaVencimentoMensal);
    } else {
      return { success: false, message: 'Data de vencimento não configurada' };
    }

    const hoje = new Date();
    const diasAtraso = differenceInDays(hoje, dataVencimento);

    if (diasAtraso <= 0) {
      return { success: false, message: 'Pagamento ainda não está em atraso' };
    }

    // Calcular juros se configurado
    const valorOriginal = auction.arrematante.valorPagarNumerico;
    const percentualJuros = auction.arrematante.percentualJurosAtraso || 0;
    const tipoJuros = auction.arrematante.tipoJurosAtraso || 'simples';
    const { valorJuros, valorTotal } = calcularValorComJuros(
      valorOriginal,
      diasAtraso,
      percentualJuros,
      tipoJuros
    );

    // Determinar informações de parcela
    const lote = auction.lotes?.find(l => l.id === auction.arrematante?.loteId);
    const tipoPagamento = lote?.tipoPagamento || auction.tipoPagamento;
    const parcelaAtual = (auction.arrematante.parcelasPagas || 0) + 1;
    const totalParcelas = auction.arrematante.quantidadeParcelas || lote?.parcelasPadrao || 0;

    const templateData = {
      arrematanteNome: auction.arrematante.nome,
      leilaoNome: auction.nome,
      loteNumero: auction.lotes?.[0]?.numero,
      valorPagar: auction.arrematante.valorPagar || `R$ ${valorOriginal.toFixed(2)}`,
      dataVencimento: format(dataVencimento, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      diasAtraso,
      valorJuros: valorJuros > 0 ? `R$ ${valorJuros.toFixed(2)}` : undefined,
      valorTotal: valorJuros > 0 ? `R$ ${valorTotal.toFixed(2)}` : undefined,
      tipoPagamento,
      parcelaAtual,
      totalParcelas,
    };

    const { subject, html } = getCobrancaEmailTemplate(templateData);
    const result = await enviarEmail(auction.arrematante.email, subject, html);

    // Registrar log
    await registrarLog({
      auction_id: auction.id,
      arrematante_nome: auction.arrematante.nome,
      tipo_email: 'cobranca',
      email_destinatario: auction.arrematante.email,
      data_envio: new Date().toISOString(),
      sucesso: result.success,
      erro: result.error,
    });

    return {
      success: result.success,
      message: result.success
        ? `Cobrança enviada com sucesso para ${auction.arrematante.email}`
        : `Erro ao enviar cobrança: ${result.error}`,
    };
  };

  // Enviar confirmação de pagamento
  const enviarConfirmacao = async (auction: Auction): Promise<{ success: boolean; message: string }> => {
    if (!auction.arrematante?.email) {
      return { success: false, message: 'Arrematante não possui email cadastrado' };
    }

    // Determinar informações de parcela
    const lote = auction.lotes?.find(l => l.id === auction.arrematante?.loteId);
    const tipoPagamento = lote?.tipoPagamento || auction.tipoPagamento;
    const parcelaAtual = auction.arrematante.parcelasPagas || 0;
    const totalParcelas = auction.arrematante.quantidadeParcelas || lote?.parcelasPadrao || 0;

    const templateData = {
      arrematanteNome: auction.arrematante.nome,
      leilaoNome: auction.nome,
      loteNumero: auction.lotes?.[0]?.numero,
      valorPagar: auction.arrematante.valorPagar || `R$ ${auction.arrematante.valorPagarNumerico.toFixed(2)}`,
      dataVencimento: '', // não é usado no template de confirmação
      tipoPagamento,
      parcelaAtual,
      totalParcelas,
    };

    const { subject, html } = getConfirmacaoPagamentoEmailTemplate(templateData);
    const result = await enviarEmail(auction.arrematante.email, subject, html);

    // Registrar log
    await registrarLog({
      auction_id: auction.id,
      arrematante_nome: auction.arrematante.nome,
      tipo_email: 'confirmacao',
      email_destinatario: auction.arrematante.email,
      data_envio: new Date().toISOString(),
      sucesso: result.success,
      erro: result.error,
    });

    return {
      success: result.success,
      message: result.success
        ? `Confirmação enviada com sucesso para ${auction.arrematante.email}`
        : `Erro ao enviar confirmação: ${result.error}`,
    };
  };

  // Verificar e enviar automaticamente (chamado periodicamente)
  const verificarEEnviarAutomatico = async (auctions: Auction[]) => {
    if (!config.enviarAutomatico) return;

    setLoading(true);
    
    const hoje = new Date();
    const resultados = {
      lembretes: 0,
      cobrancas: 0,
      erros: 0,
    };

    for (const auction of auctions) {
      if (!auction.arrematante?.email || auction.arrematante.pago || auction.arquivado) {
        continue;
      }

      // Determinar data de vencimento
      let dataVencimento: Date | null = null;
      if (auction.tipoPagamento === 'a_vista' && auction.dataVencimentoVista) {
        dataVencimento = parseISO(auction.dataVencimentoVista);
      } else if (auction.arrematante.dataEntrada) {
        dataVencimento = parseISO(auction.arrematante.dataEntrada);
      } else if (auction.arrematante.mesInicioPagamento && auction.arrematante.diaVencimentoMensal) {
        const [ano, mes] = auction.arrematante.mesInicioPagamento.split('-');
        dataVencimento = new Date(parseInt(ano), parseInt(mes) - 1, auction.arrematante.diaVencimentoMensal);
      }

      if (!dataVencimento) continue;

      const diasDiferenca = differenceInDays(dataVencimento, hoje);

      // Enviar lembrete se estiver próximo do vencimento
      if (diasDiferenca > 0 && diasDiferenca <= config.diasAntesLembrete) {
        const jaEnviou = await jaEnviouEmail(auction.id, 'lembrete');
        if (!jaEnviou) {
          const result = await enviarLembrete(auction);
          if (result.success) {
            resultados.lembretes++;
          } else {
            resultados.erros++;
          }
        }
      }

      // Enviar cobrança se estiver atrasado
      if (diasDiferenca < 0 && Math.abs(diasDiferenca) >= config.diasDepoisCobranca) {
        const jaEnviou = await jaEnviouEmail(auction.id, 'cobranca');
        if (!jaEnviou) {
          const result = await enviarCobranca(auction);
          if (result.success) {
            resultados.cobrancas++;
          } else {
            resultados.erros++;
          }
        }
      }
    }

    setLoading(false);
    return resultados;
  };

  // Carregar logs de email (apenas os enviados com sucesso)
  const carregarLogs = async (limit: number = 50) => {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('sucesso', true) // Filtrar apenas emails enviados com sucesso
      .order('data_envio', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao carregar logs:', error);
      return;
    }

    setEmailLogs(data || []);
  };

  // Limpar histórico de emails (apenas para admins)
  const limparHistorico = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const { error } = await supabase
        .from('email_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletar todos os registros

      if (error) {
        console.error('Erro ao limpar histórico:', error);
        return {
          success: false,
          message: 'Erro ao limpar histórico de comunicações'
        };
      }

      // Atualizar estado local
      setEmailLogs([]);

      return {
        success: true,
        message: 'Histórico de comunicações limpo com sucesso'
      };
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
      return {
        success: false,
        message: 'Erro inesperado ao limpar histórico'
      };
    }
  };

  return {
    config,
    loading,
    emailLogs,
    saveConfig,
    enviarLembrete,
    enviarCobranca,
    enviarConfirmacao,
    verificarEEnviarAutomatico,
    carregarLogs,
    limparHistorico,
    jaEnviouEmail, // Exportar para uso externo
  };
}

