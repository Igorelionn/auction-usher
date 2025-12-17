import { useEffect, useRef } from 'react';
import { useEmailNotifications } from './use-email-notifications';
import { useSupabaseAuctions } from './use-supabase-auctions';
import { parseISO, differenceInDays, isAfter, isBefore } from 'date-fns';

/**
 * Hook para envio automático de emails de lembretes e cobranças
 * 
 * Funcionalidades:
 * - Envia lembretes X dias antes do vencimento (configurável)
 * - Envia cobranças X dias após o vencimento (configurável)
 * - Só envia para arrematantes que NÃO pagaram
 * - Respeita configurações da aba Configurações
 * - Previne envios duplicados no mesmo dia
 * - Executa verificação a cada 5 minutos
 */
export function useAutoEmailNotifications() {
  const { auctions } = useSupabaseAuctions();
  const { config, enviarLembrete, enviarCobranca, jaEnviouEmail } = useEmailNotifications();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const ultimaVerificacaoRef = useRef<string>('');

  // Função para verificar e enviar emails automáticos
  const verificarEEnviarEmails = async () => {
    // Só executa se o envio automático estiver ativado
    if (!config.enviarAutomatico) {
      return;
    }

    // Prevenir múltiplas verificações no mesmo minuto
    const agora = new Date().toISOString().substring(0, 16); // YYYY-MM-DDTHH:mm
    if (ultimaVerificacaoRef.current === agora) {
      return;
    }
    ultimaVerificacaoRef.current = agora;

    console.log('🔍 Verificando pagamentos para envio automático de emails...');

    const hoje = new Date();
    let lembretesEnviados = 0;
    let cobrancasEnviadas = 0;

    for (const auction of auctions) {
      // Pular se não tem arrematante ou email
      if (!auction.arrematante || !auction.arrematante.email) {
        continue;
      }

      // Pular se já está arquivado
      if (auction.arquivado) {
        continue;
      }

      // Pular se já pagou
      if (auction.arrematante.pago) {
        continue;
      }

      // Determinar data de vencimento
      let dataVencimento: Date | null = null;

      // Para pagamento à vista
      if (auction.tipoPagamento === 'a_vista' && auction.dataVencimentoVista) {
        dataVencimento = parseISO(auction.dataVencimentoVista);
      }
      // Para pagamento com entrada
      else if (auction.tipoPagamento === 'entrada_parcelamento' && auction.arrematante.dataEntrada) {
        dataVencimento = parseISO(auction.arrematante.dataEntrada);
      }
      // Para parcelamento
      else if (auction.arrematante.mesInicioPagamento && auction.arrematante.diaVencimentoMensal) {
        const [ano, mes] = auction.arrematante.mesInicioPagamento.split('-');
        dataVencimento = new Date(parseInt(ano), parseInt(mes) - 1, auction.arrematante.diaVencimentoMensal);
      }

      // Se não tem data de vencimento, pular
      if (!dataVencimento) {
        continue;
      }

      const diasDiferenca = differenceInDays(dataVencimento, hoje);

      // LEMBRETE: Enviar X dias antes do vencimento
      if (diasDiferenca > 0 && diasDiferenca <= config.diasAntesLembrete) {
        // Verificar se já enviou lembrete hoje
        const jaEnviou = await jaEnviouEmail(auction.id, 'lembrete');
        
        if (jaEnviou) {
          console.log(`⏭️ Lembrete já foi enviado hoje para ${auction.arrematante.nome}, pulando...`);
          continue;
        }
        
        console.log(`📧 Enviando lembrete para ${auction.arrematante.nome} (${diasDiferenca} dias para vencer)`);
        
        const resultado = await enviarLembrete(auction);
        if (resultado.success) {
          lembretesEnviados++;
          console.log(`✅ Lembrete enviado: ${auction.arrematante.nome}`);
        } else {
          console.log(`❌ Erro ao enviar lembrete: ${resultado.message}`);
        }
      }

      // COBRANÇA: Enviar X dias após o vencimento
      if (diasDiferenca < 0 && Math.abs(diasDiferenca) >= config.diasDepoisCobranca) {
        // Verificar se já enviou cobrança hoje
        const jaEnviou = await jaEnviouEmail(auction.id, 'cobranca');
        
        if (jaEnviou) {
          console.log(`⏭️ Cobrança já foi enviada hoje para ${auction.arrematante.nome}, pulando...`);
          continue;
        }
        
        console.log(`⚠️ Enviando cobrança para ${auction.arrematante.nome} (${Math.abs(diasDiferenca)} dias atrasado)`);
        
        const resultado = await enviarCobranca(auction);
        if (resultado.success) {
          cobrancasEnviadas++;
          console.log(`✅ Cobrança enviada: ${auction.arrematante.nome}`);
        } else {
          console.log(`❌ Erro ao enviar cobrança: ${resultado.message}`);
        }
      }
    }

    if (lembretesEnviados > 0 || cobrancasEnviadas > 0) {
      console.log(`✅ Emails enviados automaticamente: ${lembretesEnviados} lembrete(s), ${cobrancasEnviadas} cobrança(s)`);
    } else {
      console.log('ℹ️ Nenhum email precisou ser enviado neste momento');
    }
  };

  // Executar verificação ao montar o componente e a cada 5 minutos
  useEffect(() => {
    // Só inicia se o envio automático estiver ativado
    if (!config.enviarAutomatico) {
      console.log('ℹ️ Envio automático de emails está desativado');
      return;
    }

    console.log('🤖 Sistema de envio automático de emails ATIVADO');
    console.log(`⏰ Verificando a cada 5 minutos`);
    console.log(`📅 Lembretes: ${config.diasAntesLembrete} dias antes do vencimento`);
    console.log(`⚠️ Cobranças: ${config.diasDepoisCobranca} dias após o vencimento`);

    // Executar imediatamente
    verificarEEnviarEmails();

    // Executar a cada 5 minutos (300000 ms)
    intervalRef.current = setInterval(verificarEEnviarEmails, 300000);

    // Limpar intervalo ao desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('🛑 Sistema de envio automático desativado');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctions, config.enviarAutomatico, config.diasAntesLembrete, config.diasDepoisCobranca]);
  // Nota: verificarEEnviarEmails não é incluída intencionalmente para evitar recriação do intervalo
  // A função captura as dependências via closure e o intervalo é recriado quando as deps mudam

  return {
    verificando: config.enviarAutomatico,
  };
}

