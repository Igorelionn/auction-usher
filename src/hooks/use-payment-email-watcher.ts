import { useEffect, useRef } from 'react';
import { useEmailNotifications } from './use-email-notifications';
import { useSupabaseAuctions } from './use-supabase-auctions';
import { Auction } from '@/lib/types';

/**
 * Hook para monitorar mudanças de status de pagamento e enviar confirmações automáticas
 * 
 * Funcionalidade:
 * - Detecta quando um arrematante é marcado como pago
 * - Envia email de confirmação automaticamente
 * - Previne envios duplicados
 */
export function usePaymentEmailWatcher() {
  const { auctions } = useSupabaseAuctions();
  const { enviarConfirmacao, jaEnviouEmail } = useEmailNotifications();
  const pagosPreviousRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Log para debug
    console.log('🔍 [PaymentWatcher] Verificando pagamentos...', {
      totalAuctions: auctions.length,
      comArrematante: auctions.filter(a => a.arrematante).length,
      pagos: auctions.filter(a => a.arrematante?.pago).length
    });

    // Criar um Set dos IDs dos leilões cujos arrematantes já foram pagos
    const pagosAtuais = new Set<string>();
    const novoPagos: Auction[] = [];

    auctions.forEach(auction => {
      if (auction.arrematante?.pago && auction.arrematante?.email) {
        pagosAtuais.add(auction.id);
        
        // Se não estava no set anterior, é um novo pagamento
        if (!pagosPreviousRef.current.has(auction.id)) {
          console.log(`🆕 [PaymentWatcher] Novo pagamento detectado:`, {
            arrematante: auction.arrematante.nome,
            email: auction.arrematante.email,
            auctionId: auction.id
          });
          novoPagos.push(auction);
        }
      }
    });

    // Enviar confirmações para novos pagamentos
    if (novoPagos.length > 0) {
      console.log(`✅ [PaymentWatcher] Detectados ${novoPagos.length} novo(s) pagamento(s), enviando confirmações...`);
      
      // Processar cada pagamento sequencialmente
      (async () => {
        for (const auction of novoPagos) {
          try {
            // Verificar se já enviou (segurança extra)
            const jaEnviou = await jaEnviouEmail(auction.id, 'confirmacao');
            
            if (jaEnviou) {
              console.log(`⏭️ [PaymentWatcher] Confirmação já foi enviada para ${auction.arrematante?.nome}, pulando...`);
              continue;
            }

            console.log(`📧 [PaymentWatcher] Enviando confirmação de pagamento para ${auction.arrematante?.nome}`);
            const resultado = await enviarConfirmacao(auction);
            
            if (resultado.success) {
              console.log(`✅ [PaymentWatcher] Confirmação enviada: ${auction.arrematante?.nome}`);
            } else {
              console.error(`❌ [PaymentWatcher] Erro ao enviar confirmação: ${resultado.message}`);
            }
          } catch (error) {
            console.error(`❌ [PaymentWatcher] Erro ao processar pagamento:`, error);
          }
        }
      })();
    }

    // Atualizar referência
    pagosPreviousRef.current = pagosAtuais;
  }, [auctions, enviarConfirmacao, jaEnviouEmail]);

  return {};
}

