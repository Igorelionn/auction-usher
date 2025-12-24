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

    const hoje = new Date();
    let lembretesEnviados = 0;
    let cobrancasEnviadas = 0;

    for (const auction of auctions) {
      // Pular se já está arquivado
      if (auction.arquivado) {
        continue;
      }

      // Obter todos os arrematantes (compatibilidade com estrutura antiga e nova)
      const arrematantes = auction.arrematantes || (auction.arrematante ? [auction.arrematante] : []);
      
      // Pular se não tem arrematantes
      if (arrematantes.length === 0) {
        continue;
      }

      // Processar cada arrematante do leilão
      for (const arrematante of arrematantes) {
        // Pular se não tem email
        if (!arrematante.email) {
          continue;
        }

        // Pular se já pagou
        if (arrematante.pago) {
          continue;
        }

        // Encontrar o lote arrematado para verificar o tipo de pagamento
        const loteArrematado = arrematante.loteId 
          ? auction.lotes?.find(lote => lote.id === arrematante.loteId)
          : null;
        
        // Usar tipo de pagamento do lote ou do leilão
        const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento;

        // Determinar data de vencimento
        let dataVencimento: Date | null = null;

        // Para pagamento à vista
        if (tipoPagamento === 'a_vista') {
          const dataVista = loteArrematado?.dataVencimentoVista || auction.dataVencimentoVista;
          if (dataVista) {
            dataVencimento = parseISO(dataVista);
          }
        }
        // Para pagamento com entrada
        else if (tipoPagamento === 'entrada_parcelamento') {
          const dataEntrada = loteArrematado?.dataEntrada || arrematante.dataEntrada;
          if (dataEntrada) {
            dataVencimento = parseISO(dataEntrada);
          }
        }
        // Para parcelamento
        else if (arrematante.mesInicioPagamento && arrematante.diaVencimentoMensal) {
          const [ano, mes] = arrematante.mesInicioPagamento.split('-');
          dataVencimento = new Date(parseInt(ano), parseInt(mes) - 1, arrematante.diaVencimentoMensal);
        }

        // Se não tem data de vencimento, pular
        if (!dataVencimento) {
          continue;
        }

        const diasDiferenca = differenceInDays(dataVencimento, hoje);

        // Criar um objeto auction com o arrematante específico para os emails
        const auctionComArrematante = {
          ...auction,
          arrematante: arrematante
        };

        // LEMBRETE: Enviar X dias antes do vencimento
        if (diasDiferenca > 0 && diasDiferenca <= config.diasAntesLembrete) {
          // Verificar se já enviou lembrete hoje (usar ID do arrematante se disponível)
          const emailId = arrematante.id ? `${auction.id}_${arrematante.id}` : auction.id;
          const jaEnviou = await jaEnviouEmail(emailId, 'lembrete');
          
          if (jaEnviou) {
            continue;
          }
          
          const resultado = await enviarLembrete(auctionComArrematante);
          if (resultado.success) {
            lembretesEnviados++;
          }
        }

        // COBRANÇA: Enviar X dias após o vencimento
        if (diasDiferenca < 0 && Math.abs(diasDiferenca) >= config.diasDepoisCobranca) {
          // Verificar se já enviou cobrança hoje (usar ID do arrematante se disponível)
          const emailId = arrematante.id ? `${auction.id}_${arrematante.id}` : auction.id;
          const jaEnviou = await jaEnviouEmail(emailId, 'cobranca');
          
          if (jaEnviou) {
            continue;
          }
          
          const resultado = await enviarCobranca(auctionComArrematante);
          if (resultado.success) {
            cobrancasEnviadas++;
          }
        }
      }
    }
  };

  // Executar verificação ao montar o componente e a cada 5 minutos
  useEffect(() => {
    // Só inicia se o envio automático estiver ativado
    if (!config.enviarAutomatico) {
      return;
    }

    // Executar imediatamente
    verificarEEnviarEmails();

    // Executar a cada 5 minutos (300000 ms)
    intervalRef.current = setInterval(verificarEEnviarEmails, 300000);

    // Limpar intervalo ao desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
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

