import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Auction } from '@/lib/types';
import { getLembreteEmailTemplate, getCobrancaEmailTemplate, getConfirmacaoPagamentoEmailTemplate, getQuitacaoCompletaEmailTemplate } from '@/lib/email-templates';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmailConfig {
  resendApiKey?: string;
  emailRemetente: string;
  diasAntesLembrete: number;
  diasDepoisCobranca: number;
  enviarAutomatico: boolean;
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
  resendApiKey: 're_HVRGMxM1_D2T7xwKk96YKRfH7fczu847P',
  emailRemetente: 'notificacoes@grupoliraleiloes.com',
  diasAntesLembrete: 3,
  diasDepoisCobranca: 1,
  enviarAutomatico: true,
};

export function useEmailNotifications() {
  const [config, setConfig] = useState<EmailConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

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

  const saveConfig = (newConfig: Partial<EmailConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    localStorage.setItem('email_config', JSON.stringify(updated));
  };

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

  const registrarLog = async (log: Omit<EmailLog, 'id'>) => {
    const { error } = await supabase
      .from('email_logs')
      .insert([log]);

    if (error) {
      console.error('Erro ao registrar log de email:', error);
    }
  };

  const calcularValorComJuros = (
    valorOriginal: number,
    diasAtraso: number,
    percentualJuros: number = 0,
    tipoJuros: 'simples' | 'composto' = 'simples'
  ): { valorJuros: number; valorTotal: number } => {
    if (diasAtraso <= 0 || percentualJuros <= 0 || valorOriginal <= 0) {
      return { valorJuros: 0, valorTotal: valorOriginal };
    }

    if (diasAtraso > 1825) {
      console.warn(`⚠️ Dias de atraso muito alto (${diasAtraso}), limitando a 1825 dias (5 anos)`);
      diasAtraso = 1825;
    }

    const taxaMensal = percentualJuros / 100;
    const mesesAtraso = diasAtraso / 30;

    let valorJuros = 0;
    
    if (tipoJuros === 'simples') {
      valorJuros = valorOriginal * taxaMensal * mesesAtraso;
    } else {
      const valorTotal = valorOriginal * Math.pow(1 + taxaMensal, mesesAtraso);
      valorJuros = valorTotal - valorOriginal;
    }

    return {
      valorJuros: Math.round(valorJuros * 100) / 100,
      valorTotal: Math.round((valorOriginal + valorJuros) * 100) / 100,
    };
  };

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

  const enviarLembrete = async (auction: Auction): Promise<{ success: boolean; message: string }> => {
    if (!auction.arrematante?.email) {
      return { success: false, message: 'Arrematante não possui email cadastrado' };
    }

    const jaEnviou = await jaEnviouEmail(auction.id, 'lembrete');
    if (jaEnviou) {
      return { success: false, message: 'Lembrete já foi enviado hoje para este arrematante' };
    }

    const lote = auction.lotes?.find(l => l.id === auction.arrematante?.loteId);
    const tipoPagamento = lote?.tipoPagamento || auction.tipoPagamento;
    const parcelaAtual = (auction.arrematante.parcelasPagas || 0) + 1;
    const totalParcelas = auction.arrematante.quantidadeParcelas || lote?.parcelasPadrao || 0;

    let dataVencimento: Date;
    if (auction.tipoPagamento === 'a_vista' && auction.dataVencimentoVista) {
      dataVencimento = parseISO(auction.dataVencimentoVista);
    } else if (tipoPagamento === 'entrada_parcelamento' && parcelaAtual === 1 && auction.arrematante.dataEntrada) {
      dataVencimento = parseISO(auction.arrematante.dataEntrada);
    } else if (auction.arrematante.mesInicioPagamento && auction.arrematante.diaVencimentoMensal) {
      const [ano, mes] = auction.arrematante.mesInicioPagamento.split('-');
      dataVencimento = new Date(parseInt(ano), parseInt(mes) - 1, auction.arrematante.diaVencimentoMensal);
    } else {
      return { success: false, message: 'Data de vencimento não configurada' };
    }

    const hoje = new Date();
    const diasRestantes = differenceInDays(dataVencimento, hoje);

    // 🔧 CALCULAR VALOR CORRETO DA PARCELA baseado no tipo de pagamento
    const valorTotalLeilao = auction.arrematante.valorPagarNumerico;
    let valorParcela = valorTotalLeilao;

    if (tipoPagamento === 'a_vista') {
      // À vista: valor total
      valorParcela = valorTotalLeilao;
    } else if (tipoPagamento === 'entrada_parcelamento') {
      if (parcelaAtual === 1) {
        // Primeira parcela é a entrada
        const valorEntrada = auction.arrematante.valorEntrada 
          ? (typeof auction.arrematante.valorEntrada === 'string' 
              ? parseFloat(auction.arrematante.valorEntrada.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')) 
              : auction.arrematante.valorEntrada)
          : valorTotalLeilao * 0.3;
        valorParcela = valorEntrada;
      } else {
        // Parcelas após entrada
        const valorEntrada = auction.arrematante.valorEntrada 
          ? (typeof auction.arrematante.valorEntrada === 'string' 
              ? parseFloat(auction.arrematante.valorEntrada.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')) 
              : auction.arrematante.valorEntrada)
          : valorTotalLeilao * 0.3;
        const valorRestante = valorTotalLeilao - valorEntrada;
        valorParcela = valorRestante / totalParcelas;
      }
    } else if (tipoPagamento === 'parcelamento') {
      // Parcelamento simples: dividir valor total pelas parcelas
      valorParcela = valorTotalLeilao / totalParcelas;
    }

    const templateData = {
      arrematanteNome: auction.arrematante.nome,
      leilaoNome: auction.nome,
      loteNumero: lote?.numero || auction.lotes?.[0]?.numero,
      valorPagar: `R$ ${valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      dataVencimento: format(dataVencimento, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      diasRestantes,
      tipoPagamento,
      parcelaAtual,
      totalParcelas,
    };

    const { subject, html } = getLembreteEmailTemplate(templateData);
    const result = await enviarEmail(auction.arrematante.email, subject, html);

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

  const enviarCobranca = async (auction: Auction, ignoreDuplicateCheck: boolean = false): Promise<{ success: boolean; message: string }> => {
    if (!auction.arrematante?.email) {
      return { success: false, message: 'Arrematante não possui email cadastrado' };
    }

    // 🔧 Verificar duplicatas APENAS se não for envio forçado
    if (!ignoreDuplicateCheck) {
      const jaEnviou = await jaEnviouEmail(auction.id, 'cobranca');
      if (jaEnviou) {
        return { success: false, message: 'Cobrança já foi enviada hoje para este arrematante' };
      }
    } else {
      console.log(`🔄 Envio forçado (ignorando verificação de duplicatas)`);
    }

    const lote = auction.lotes?.find(l => l.id === auction.arrematante?.loteId);
    const tipoPagamento = lote?.tipoPagamento || auction.tipoPagamento;
    const parcelaAtual = (auction.arrematante.parcelasPagas || 0) + 1;
    const totalParcelas = auction.arrematante.quantidadeParcelas || lote?.parcelasPadrao || 0;

    let dataVencimento: Date;
    if (auction.tipoPagamento === 'a_vista' && auction.dataVencimentoVista) {
      dataVencimento = parseISO(auction.dataVencimentoVista);
    } else if (tipoPagamento === 'entrada_parcelamento' && parcelaAtual === 1 && auction.arrematante.dataEntrada) {
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

    // 🔧 CALCULAR VALOR CORRETO DA PARCELA baseado no tipo de pagamento
    const valorTotalLeilao = auction.arrematante.valorPagarNumerico;
    let valorParcela = valorTotalLeilao;

    if (tipoPagamento === 'a_vista') {
      // À vista: valor total
      valorParcela = valorTotalLeilao;
    } else if (tipoPagamento === 'entrada_parcelamento') {
      if (parcelaAtual === 1) {
        // Primeira parcela é a entrada
        const valorEntrada = auction.arrematante.valorEntrada 
          ? (typeof auction.arrematante.valorEntrada === 'string' 
              ? parseFloat(auction.arrematante.valorEntrada.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')) 
              : auction.arrematante.valorEntrada)
          : valorTotalLeilao * 0.3;
        valorParcela = valorEntrada;
      } else {
        // Parcelas após entrada
        const valorEntrada = auction.arrematante.valorEntrada 
          ? (typeof auction.arrematante.valorEntrada === 'string' 
              ? parseFloat(auction.arrematante.valorEntrada.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')) 
              : auction.arrematante.valorEntrada)
          : valorTotalLeilao * 0.3;
        const valorRestante = valorTotalLeilao - valorEntrada;
        valorParcela = valorRestante / totalParcelas;
      }
    } else if (tipoPagamento === 'parcelamento') {
      // Parcelamento simples: dividir valor total pelas parcelas
      valorParcela = valorTotalLeilao / totalParcelas;
    }

    console.log(`💰 DEBUG Email Cobrança:`);
    console.log(`   - Valor Total Leilão: R$ ${valorTotalLeilao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   - Tipo Pagamento: ${tipoPagamento}`);
    console.log(`   - Parcela ${parcelaAtual}/${totalParcelas}`);
    console.log(`   - Valor da Parcela: R$ ${valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   - Dias em Atraso: ${diasAtraso}`);

    const percentualJuros = auction.arrematante.percentualJurosAtraso || 0;
    const tipoJuros = auction.arrematante.tipoJurosAtraso || 'simples';
    const { valorJuros, valorTotal } = calcularValorComJuros(
      valorParcela,
      diasAtraso,
      percentualJuros,
      tipoJuros
    );

    console.log(`   - Percentual Juros: ${percentualJuros}% ao mês`);
    console.log(`   - Valor Juros: R$ ${valorJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`   - Valor Total com Juros: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

    const templateData = {
      arrematanteNome: auction.arrematante.nome,
      leilaoNome: auction.nome,
      loteNumero: lote?.numero || auction.lotes?.[0]?.numero,
      valorPagar: `R$ ${valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      dataVencimento: format(dataVencimento, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      diasAtraso,
      valorJuros: valorJuros > 0 ? `R$ ${valorJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined,
      valorTotal: valorJuros > 0 ? `R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined,
      tipoPagamento,
      parcelaAtual,
      totalParcelas,
    };

    const { subject, html } = getCobrancaEmailTemplate(templateData);
    const result = await enviarEmail(auction.arrematante.email, subject, html);

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

  const enviarConfirmacao = async (
    auction: Auction, 
    parcelaEspecifica?: number,
    valorEspecifico?: number
  ): Promise<{ success: boolean; message: string }> => {
    if (!auction.arrematante?.email) {
      return { success: false, message: 'Arrematante não possui email cadastrado' };
    }

    const lote = auction.lotes?.find(l => l.id === auction.arrematante?.loteId);
    const tipoPagamento = lote?.tipoPagamento || auction.tipoPagamento;
    const parcelaAtual = parcelaEspecifica !== undefined ? parcelaEspecifica : (auction.arrematante.parcelasPagas || 0);
    const totalParcelas = auction.arrematante.quantidadeParcelas || lote?.parcelasPadrao || 0;
    
    let valorFinal = valorEspecifico 
      ? `R$ ${valorEspecifico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : (auction.arrematante.valorPagar || `R$ ${auction.arrematante.valorPagarNumerico.toFixed(2)}`);

    const templateData = {
      arrematanteNome: auction.arrematante.nome,
      leilaoNome: auction.nome,
      loteNumero: auction.lotes?.[0]?.numero,
      valorPagar: valorFinal,
      dataVencimento: '',
      tipoPagamento,
      parcelaAtual,
      totalParcelas,
    };

    const { subject, html } = getConfirmacaoPagamentoEmailTemplate(templateData);
    const result = await enviarEmail(auction.arrematante.email, subject, html);

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

  const enviarQuitacao = async (
    auction: Auction,
    valorTotalPago?: number
  ): Promise<{ success: boolean; message: string }> => {
    if (!auction.arrematante?.email) {
      return { success: false, message: 'Arrematante não possui email cadastrado' };
    }

    const lote = auction.lotes?.find(l => l.id === auction.arrematante?.loteId);
    const tipoPagamento = lote?.tipoPagamento || auction.tipoPagamento;
    const totalParcelas = auction.arrematante.quantidadeParcelas || lote?.parcelasPadrao || 0;
    
    let valorTotal = valorTotalPago 
      ? `R$ ${valorTotalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : (auction.arrematante.valorPagar || `R$ ${auction.arrematante.valorPagarNumerico.toFixed(2)}`);

    const templateData = {
      arrematanteNome: auction.arrematante.nome,
      leilaoNome: auction.nome,
      loteNumero: auction.lotes?.[0]?.numero,
      valorTotal: valorTotal,
      valorPagar: '', // Não usado no template de quitação
      dataVencimento: '', // Não usado no template de quitação
      tipoPagamento,
      totalParcelas: tipoPagamento === 'a_vista' ? undefined : totalParcelas,
    };

    const { subject, html } = getQuitacaoCompletaEmailTemplate(templateData);
    const result = await enviarEmail(auction.arrematante.email, subject, html);

    await registrarLog({
      auction_id: auction.id,
      arrematante_nome: auction.arrematante.nome,
      tipo_email: 'confirmacao', // Usar 'confirmacao' para quitação também
      email_destinatario: auction.arrematante.email,
      data_envio: new Date().toISOString(),
      sucesso: result.success,
      erro: result.error,
    });

    console.log(`🎉 Email de quitação completa ${result.success ? 'enviado' : 'falhou'} para ${auction.arrematante.email}`);

    return {
      success: result.success,
      message: result.success
        ? `Email de quitação enviado com sucesso para ${auction.arrematante.email}`
        : `Erro ao enviar email de quitação: ${result.error}`,
    };
  };

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

  const carregarLogs = async (limit: number = 50) => {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('sucesso', true)
      .order('data_envio', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao carregar logs:', error);
      return;
    }

    setEmailLogs(data || []);
  };

  const limparHistorico = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const { error } = await supabase
        .from('email_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.error('Erro ao limpar histórico:', error);
        return {
          success: false,
          message: 'Erro ao limpar histórico de comunicações'
        };
      }

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
    enviarQuitacao,
    verificarEEnviarAutomatico,
    carregarLogs,
    limparHistorico,
    jaEnviouEmail,
  };
}

