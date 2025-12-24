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
    // Criar um Set dos IDs dos leilões cujos arrematantes já foram pagos
    const pagosAtuais = new Set<string>();
    const novoPagos: Auction[] = [];

    auctions.forEach(auction => {
      if (auction.arrematante?.pago && auction.arrematante?.email) {
        pagosAtuais.add(auction.id);
        
        // Se não estava no set anterior, é um novo pagamento
        if (!pagosPreviousRef.current.has(auction.id)) {
          novoPagos.push(auction);
        }
      }
    });

    // Enviar confirmações para novos pagamentos
    if (novoPagos.length > 0) {
      // Processar cada pagamento sequencialmente
      (async () => {
        for (const auction of novoPagos) {
          try {
            // Verificar se já enviou (segurança extra)
            const jaEnviou = await jaEnviouEmail(auction.id, 'confirmacao');
            
            if (jaEnviou) {
              continue;
            }

            const resultado = await enviarConfirmacao(auction);
            
            if (!resultado.success) {
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

