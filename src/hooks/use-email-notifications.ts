import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
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
  resendApiKey: 're_5s8gu2qB_AaRSuTA5DWf5RbgyrfwC2oby',
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
    
    const { data, error } = await supabaseClient
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
    const { error } = await supabaseClient
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

    // Limitar dias de atraso a um máximo razoável (10 anos = 3650 dias)
    if (diasAtraso > 3650) {
      console.warn(`⚠️ Dias de atraso muito alto (${diasAtraso}), limitando a 3650 dias (10 anos)`);
      diasAtraso = 3650;
    }

    // Sem limite de percentual de juros - usar o valor configurado pelo usuário
    if (percentualJuros > 100) {
      console.warn(`⚠️ Percentual de juros muito alto: ${percentualJuros}% ao mês`);
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

    // Limitar juros a no máximo 1000% do valor original (proteção contra erros de cálculo extremos)
    const limiteJuros = valorOriginal * 10;
    if (valorJuros > limiteJuros) {
      console.warn(`⚠️ Juros calculados muito altos (R$ ${valorJuros.toFixed(2)}), limitando a 1000% do valor original (R$ ${limiteJuros.toFixed(2)})`);
      valorJuros = limiteJuros;
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
      const supabaseClientUrl = import.meta.env.VITE_SUPABASE_URL || 'https://moojuqphvhrhasxhaahd.supabaseClient.co';
      const edgeFunctionUrl = `${supabaseClientUrl}/functions/v1/send-email`;
      const supabaseClientAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vb2p1cXBodmhyaGFzeGhhYWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDExMzEsImV4cCI6MjA3MjYxNzEzMX0.GR3YIs0QWsZP3Rdvw_-vCOPVtH2KCaoVO2pKeo1-WPs';

      // Email verificado (único que funciona enquanto domínio não é verificado)
      const emailVerificado = 'lireleiloesgestoes@gmail.com';
      const usarModoTeste = destinatario !== emailVerificado;

      let destinatarioFinal = destinatario;
      let assuntoFinal = assunto;
      let htmlFinal = htmlContent;

      // Se destinatário diferente do verificado, preparar para modo teste
      if (usarModoTeste) {
        destinatarioFinal = emailVerificado;
        assuntoFinal = `[PARA: ${destinatario}] ${assunto}`;
        
        // Adicionar banner de teste no email
        htmlFinal = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;">
  <div style="background:#fff3cd;padding:15px;text-align:center;border-bottom:3px solid #ffc107;">
    <p style="margin:0;color:#856404;font-size:14px;font-weight:bold;">
      ⚠️ MODO TESTE - Aguardando Verificação do Domínio
    </p>
    <p style="margin:5px 0 0 0;color:#856404;font-size:13px;">
      📧 Destinatário: <strong>${destinatario}</strong> | 
      Redirecionado para: <strong>${emailVerificado}</strong>
    </p>
  </div>
  ${htmlContent}
</body>
</html>`;
      }

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseClientAnonKey,
          'Authorization': `Bearer ${supabaseClientAnonKey}`,
        },
        body: JSON.stringify({
          to: destinatarioFinal,
          subject: assuntoFinal,
          html: htmlFinal,
          from: `Arthur Lira Leilões <${config.emailRemetente}>`,
          resendApiKey: config.resendApiKey,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Se erro de sandbox/domínio, tentar com email verificado
        if (responseData.error && responseData.error.includes('testing emails')) {
          console.warn('⚠️ Domínio não verificado, enviando para email verificado...');
          
          const retryResponse = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseClientAnonKey,
              'Authorization': `Bearer ${supabaseClientAnonKey}`,
            },
            body: JSON.stringify({
              to: emailVerificado,
              subject: `[PARA: ${destinatario}] ${assunto}`,
              html: htmlFinal,
              from: `Arthur Lira Leilões <${config.emailRemetente}>`,
              resendApiKey: config.resendApiKey,
            }),
          });
          
          const retryData = await retryResponse.json();
          
          if (!retryResponse.ok) {
            throw new Error(retryData.error || 'Erro ao enviar email');
          }
          
          console.log(`✅ Email enviado (modo teste) para: ${emailVerificado} | Original: ${destinatario}`);
          return { success: true };
        }
        
        throw new Error(responseData.error || 'Erro ao enviar email');
      }

      if (usarModoTeste) {
        console.log(`✅ Email enviado (modo teste) para: ${emailVerificado} | Destinatário original: ${destinatario}`);
      } else {
        console.log('✅ Email enviado com sucesso para:', destinatario);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
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
  const enviarConfirmacao = async (auction: Auction, parcelaId?: string): Promise<{ success: boolean; message: string }> => {
    if (!auction.arrematante?.email) {
      return { success: false, message: 'Arrematante não possui email cadastrado' };
    }

    // Determinar informações de parcela
    const lote = auction.lotes?.find(l => l.id === auction.arrematante?.loteId);
    const tipoPagamento = lote?.tipoPagamento || auction.tipoPagamento;
    const parcelaAtual = auction.arrematante.parcelasPagas || 0;
    const totalParcelas = auction.arrematante.quantidadeParcelas || lote?.parcelasPadrao || 0;

    // Calcular valor da parcela (se for parcelamento)
    let valorParcela = auction.arrematante.valorPagar || `R$ ${auction.arrematante.valorPagarNumerico.toFixed(2)}`;
    
    // Se é parcelamento ou entrada+parcelamento, calcular valor da parcela
    if (tipoPagamento === 'parcelamento' && totalParcelas > 0) {
      const valorTotal = auction.arrematante.valorPagarNumerico;
      const valorPorParcela = valorTotal / totalParcelas;
      valorParcela = `R$ ${valorPorParcela.toFixed(2)}`;
    } else if (tipoPagamento === 'entrada_parcelamento' && parcelaAtual > 1) {
      // Para entrada+parcelamento, descontar a entrada das parcelas restantes
      const valorTotal = auction.arrematante.valorPagarNumerico;
      const valorEntrada = auction.arrematante.valorEntrada 
        ? parseFloat(auction.arrematante.valorEntrada.replace(/[^0-9,]/g, '').replace(',', '.'))
        : 0;
      const valorRestante = valorTotal - valorEntrada;
      const valorPorParcela = valorRestante / (totalParcelas || 1);
      valorParcela = `R$ ${valorPorParcela.toFixed(2)}`;
    }

    const templateData = {
      arrematanteNome: auction.arrematante.nome,
      leilaoNome: auction.nome,
      loteNumero: lote?.numero || auction.lotes?.[0]?.numero,
      valorPagar: valorParcela,
      valorEntrada: auction.arrematante.valorEntrada,
      dataVencimento: '', // não é usado no template de confirmação
      tipoPagamento,
      parcelaAtual,
      totalParcelas,
    };

    const { subject, html } = getConfirmacaoPagamentoEmailTemplate(templateData);
    const result = await enviarEmail(auction.arrematante.email, subject, html);

    // Registrar log (usar parcelaId se fornecido, caso contrário usar auction.id)
    const logId = parcelaId || auction.id;
    await registrarLog({
      auction_id: logId,
      arrematante_nome: auction.arrematante.nome,
      tipo_email: 'confirmacao',
      email_destinatario: auction.arrematante.email,
      data_envio: new Date().toISOString(),
      sucesso: result.success,
      erro: result.error,
    });

    const tipoDescricao = tipoPagamento === 'a_vista' 
      ? 'pagamento à vista' 
      : `parcela ${parcelaAtual}/${totalParcelas}`;

    return {
      success: result.success,
      message: result.success
        ? `Confirmação de ${tipoDescricao} enviada com sucesso para ${auction.arrematante.email}`
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
    const { data, error } = await supabaseClient
      .from('email_logs')
      .select('*')
      .eq('sucesso', true) // Filtrar apenas emails enviados com sucesso
      .order('data_envio', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao carregar logs:', error);
      return;
    }

    // @ts-ignore
    setEmailLogs(data || []);
  };

  // Limpar histórico de emails (apenas para admins)
  const limparHistorico = async (): Promise<{ success: boolean; message: string }> => {
    try {
        const { error } = await supabaseClient
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

