// Templates corporativos de email para notificações de pagamento
// Design profissional e formal

interface EmailTemplateData {
  arrematanteNome: string;
  leilaoNome: string;
  loteNumero?: string;
  valorPagar: string;
  dataVencimento: string;
  diasRestantes?: number;
  diasAtraso?: number;
  valorJuros?: string;
  valorTotal?: string;
  tipoPagamento?: 'a_vista' | 'entrada_parcelamento' | 'parcelamento';
  parcelaAtual?: number;
  totalParcelas?: number;
  valorEntrada?: string;
  avisoJurosFuturos?: {
    diasRestantes: number;
    percentualJuros: number;
    valorJurosFuturo: string;
  };
}

export function getLembreteEmailTemplate(data: EmailTemplateData): { subject: string; html: string } {
  const { arrematanteNome, leilaoNome, loteNumero, valorPagar, dataVencimento, diasRestantes, tipoPagamento, parcelaAtual, totalParcelas } = data;
  
  // Determinar tipo de pagamento humanizado
  let tipoPagamentoTexto = '';
  if (tipoPagamento === 'a_vista') {
    tipoPagamentoTexto = 'Pagamento à Vista';
  } else if (tipoPagamento === 'entrada_parcelamento') {
    tipoPagamentoTexto = parcelaAtual === 1 
      ? 'Entrada' 
      : `Parcela ${parcelaAtual - 1}/${totalParcelas || '?'}`;
  } else {
    tipoPagamentoTexto = `Parcela ${parcelaAtual}/${totalParcelas}`;
  }
  
  return {
    subject: `Lembrete de Vencimento - ${leilaoNome}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lembrete de Pagamento</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', 'Helvetica', sans-serif; background-color: #f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 2px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          
          <!-- Header Corporativo -->
          <tr>
            <td style="background-color: #1a365d; padding: 30px 40px; border-bottom: 3px solid #c49b63;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
                Notificação de Pagamento
              </h1>
            </td>
          </tr>

          <!-- Logo Arthur Lira -->
          <tr>
            <td align="center" style="padding: 30px 40px 0 40px;">
              <img src="https://moojuqphvhrhasxhaahd.supabase.co/storage/v1/object/public/documents/arthur-lira-logo.png" alt="Arthur Lira Leilões" style="height: 60px; width: auto; display: block; margin: 0 auto;" />
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #2d3748; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                Prezado(a) <strong>${arrematanteNome}</strong>,
              </p>
              
              <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 32px 0;">
                Informamos que o prazo para quitação do compromisso referente ao leilão abaixo está próximo do vencimento.
              </p>

              <!-- Box de Informações -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 32px;">
                <tr>
                  <td style="background-color: #f7fafc; padding: 20px; border-bottom: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #1a365d; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Dados do Compromisso
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; width: 140px;">Leilão:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${leilaoNome}</td>
                      </tr>
                      ${loteNumero ? `
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Lote:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${loteNumero}</td>
                      </tr>
                      ` : ''}
                      ${tipoPagamentoTexto ? `
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Tipo:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${tipoPagamentoTexto}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Valor:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${valorPagar}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Vencimento:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${dataVencimento}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${diasRestantes !== undefined ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ebf8ff; border-left: 4px solid #4299e1; padding: 16px; margin-bottom: 32px;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #2c5282; font-size: 14px;">
                      <strong>Prazo:</strong> ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'} restantes para o vencimento.
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                Solicitamos que o pagamento seja efetuado dentro do prazo estabelecido para evitar a incidência de encargos adicionais.
              </p>

              <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                Para esclarecimentos ou informações adicionais, permanecemos à disposição através dos nossos canais de atendimento.
              </p>

              <!-- Informações de Contato -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7fafc; border-radius: 4px; padding: 16px; margin: 0;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
                      <strong style="color: #2d3748;">Contato:</strong> lireleiloesgestoes@gmail.com
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Corporativo -->
          <tr>
            <td style="background-color: #f7fafc; padding: 32px 40px; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">
                Atenciosamente,<br/>
                <strong style="color: #2d3748; font-size: 16px;">Arthur Lira Leilões</strong>
              </p>
              
              <!-- Logos -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="border-spacing: 0; border-collapse: collapse; margin-left: -20px;">
                      <tr>
                        <td style="padding: 0 10px 0 0; margin: 0; vertical-align: middle; line-height: 0;">
                          <img src="https://moojuqphvhrhasxhaahd.supabase.co/storage/v1/object/public/documents/Elionsoftwaress.png" alt="Elion Softwares" style="height: 48px; width: auto; display: block; vertical-align: middle; border: none; outline: none; text-decoration: none; pointer-events: none; -webkit-user-select: none; -moz-user-select: none; user-select: none; position: relative; z-index: 1; margin-top: 5px;" draggable="false" />
                        </td>
                        <td style="padding: 0 0 0 10px; margin: 0; vertical-align: middle; line-height: 0;">
                          <img src="https://moojuqphvhrhasxhaahd.supabase.co/storage/v1/object/public/documents/arthur-lira-logo.png" alt="Arthur Lira" style="height: 50px; width: auto; display: block; vertical-align: middle; border: none; outline: none; text-decoration: none; pointer-events: none; -webkit-user-select: none; -moz-user-select: none; user-select: none; position: relative; z-index: 2;" draggable="false" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="color: #a0aec0; font-size: 11px; margin: 24px 0 0 0; text-align: center; line-height: 1.5;">
                © ${new Date().getFullYear()} Arthur Lira Leilões. Todos os direitos reservados.<br/>
                Desenvolvido por Elion Softwares.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  };
}

export function getCobrancaEmailTemplate(data: EmailTemplateData): { subject: string; html: string } {
  const { arrematanteNome, leilaoNome, loteNumero, valorPagar, dataVencimento, diasAtraso, valorJuros, valorTotal, tipoPagamento, parcelaAtual, totalParcelas, avisoJurosFuturos } = data;
  
  // Determinar tipo de pagamento humanizado
  let tipoPagamentoTexto = '';
  if (tipoPagamento === 'a_vista') {
    tipoPagamentoTexto = 'Pagamento à Vista';
  } else if (tipoPagamento === 'entrada_parcelamento') {
    tipoPagamentoTexto = parcelaAtual === 1 
      ? 'Entrada' 
      : `Parcela ${parcelaAtual - 1}/${totalParcelas || '?'}`;
  } else {
    tipoPagamentoTexto = `Parcela ${parcelaAtual}/${totalParcelas}`;
  }
  
  return {
    subject: `Notificação de Débito em Aberto - ${leilaoNome}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificação de Débito</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', 'Helvetica', sans-serif; background-color: #f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 2px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          
          <!-- Header Corporativo -->
          <tr>
            <td style="background-color: #742a2a; padding: 30px 40px; border-bottom: 3px solid #c49b63;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
                Notificação de Débito em Aberto
              </h1>
            </td>
          </tr>

          <!-- Logo Arthur Lira -->
          <tr>
            <td align="center" style="padding: 30px 40px 0 40px;">
              <img src="https://moojuqphvhrhasxhaahd.supabase.co/storage/v1/object/public/documents/arthur-lira-logo.png" alt="Arthur Lira Leilões" style="height: 60px; width: auto; display: block; margin: 0 auto;" />
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #2d3748; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                Prezado(a) <strong>${arrematanteNome}</strong>,
              </p>
              
              <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 32px 0;">
                Identificamos que o pagamento referente ao compromisso abaixo encontra-se em atraso. Solicitamos atenção imediata para regularização.
              </p>

              <!-- Alerta de Atraso -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff5f5; border-left: 4px solid #c53030; padding: 16px; margin-bottom: 32px;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #742a2a; font-size: 14px; font-weight: 600;">
                      DÉBITO VENCIDO HÁ ${diasAtraso} ${diasAtraso === 1 ? 'DIA' : 'DIAS'}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Box de Informações -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 32px;">
                <tr>
                  <td style="background-color: #f7fafc; padding: 20px; border-bottom: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #1a365d; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Dados do Débito
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; width: 140px;">Leilão:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${leilaoNome}</td>
                      </tr>
                      ${loteNumero ? `
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Lote:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${loteNumero}</td>
                      </tr>
                      ` : ''}
                      ${tipoPagamentoTexto ? `
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Tipo:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${tipoPagamentoTexto}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Valor Original:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${valorPagar}</td>
                      </tr>
                      ${valorJuros ? `
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Encargos:</td>
                        <td style="padding: 8px 0; color: #c53030; font-size: 14px; font-weight: 600;">${valorJuros}</td>
                      </tr>
                      ` : ''}
                      ${valorTotal ? `
                      <tr style="background-color: #fff5f5;">
                        <td style="padding: 12px 0; color: #742a2a; font-size: 14px; font-weight: 600; border-top: 2px solid #feb2b2;">Valor Total:</td>
                        <td style="padding: 12px 0; color: #742a2a; font-size: 16px; font-weight: 700; border-top: 2px solid #feb2b2;">${valorTotal}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Data Vencimento:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${dataVencimento}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Dias em Atraso:</td>
                        <td style="padding: 8px 0; color: #c53030; font-size: 14px; font-weight: 700;">${diasAtraso} ${diasAtraso === 1 ? 'dia' : 'dias'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${avisoJurosFuturos ? `
              <!-- Aviso de Juros Futuros -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 2px solid #ed8936; border-radius: 4px; margin: 24px 0 32px 0; background-color: #fffaf0;">
                <tr>
                  <td style="background-color: #fed7aa; padding: 12px 20px; border-bottom: 2px solid #ed8936;">
                    <p style="margin: 0; color: #7c2d12; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      ⚠️ Aviso Importante - Aplicação de Juros
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; color: #7c2d12; font-size: 14px; line-height: 1.6; font-weight: 600;">
                      Em <strong>${avisoJurosFuturos.diasRestantes} ${avisoJurosFuturos.diasRestantes === 1 ? 'dia' : 'dias'}</strong>, serão aplicados juros de <strong>${avisoJurosFuturos.percentualJuros}%</strong> sobre o valor em aberto.
                    </p>
                    <p style="margin: 0; color: #9c4221; font-size: 14px; line-height: 1.6;">
                      Valor adicional estimado: <strong style="color: #c53030; font-size: 15px;">${avisoJurosFuturos.valorJurosFuturo}</strong>
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                <strong>É imprescindível</strong> que a regularização do débito seja efetuada com a maior brevidade possível, a fim de evitar o acúmulo de encargos adicionais e possíveis medidas administrativas cabíveis.
              </p>

              <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                Para efetuar o pagamento ou negociar as condições, solicitamos contato através dos nossos canais de atendimento.
              </p>

              <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                Permanecemos à disposição para esclarecer quaisquer dúvidas.
              </p>

              <!-- Informações de Contato -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7fafc; border-radius: 4px; padding: 16px; margin: 0;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
                      <strong style="color: #2d3748;">Contato:</strong> lireleiloesgestoes@gmail.com
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Corporativo -->
          <tr>
            <td style="background-color: #f7fafc; padding: 32px 40px; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">
                Atenciosamente,<br/>
                <strong style="color: #2d3748; font-size: 16px;">Arthur Lira Leilões</strong>
              </p>
              
              <!-- Logos -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="border-spacing: 0; border-collapse: collapse; margin-left: -20px;">
                      <tr>
                        <td style="padding: 0 10px 0 0; margin: 0; vertical-align: middle; line-height: 0;">
                          <img src="https://moojuqphvhrhasxhaahd.supabase.co/storage/v1/object/public/documents/Elionsoftwaress.png" alt="Elion Softwares" style="height: 48px; width: auto; display: block; vertical-align: middle; border: none; outline: none; text-decoration: none; pointer-events: none; -webkit-user-select: none; -moz-user-select: none; user-select: none; position: relative; z-index: 1; margin-top: 5px;" draggable="false" />
                        </td>
                        <td style="padding: 0 0 0 10px; margin: 0; vertical-align: middle; line-height: 0;">
                          <img src="https://moojuqphvhrhasxhaahd.supabase.co/storage/v1/object/public/documents/arthur-lira-logo.png" alt="Arthur Lira" style="height: 50px; width: auto; display: block; vertical-align: middle; border: none; outline: none; text-decoration: none; pointer-events: none; -webkit-user-select: none; -moz-user-select: none; user-select: none; position: relative; z-index: 2;" draggable="false" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="color: #a0aec0; font-size: 11px; margin: 24px 0 0 0; text-align: center; line-height: 1.5;">
                © ${new Date().getFullYear()} Arthur Lira Leilões. Todos os direitos reservados.<br/>
                Desenvolvido por Elion Softwares.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  };
}

export function getConfirmacaoPagamentoEmailTemplate(data: EmailTemplateData): { subject: string; html: string } {
  const { arrematanteNome, leilaoNome, loteNumero, valorPagar, tipoPagamento, parcelaAtual, totalParcelas } = data;
  
  // Determinar tipo de pagamento humanizado e assunto personalizado
  let tipoPagamentoTexto = '';
  let assuntoEmail = '';
  
  if (tipoPagamento === 'a_vista') {
    tipoPagamentoTexto = 'Pagamento à Vista';
    assuntoEmail = 'Confirmação de Pagamento à Vista';
  } else if (tipoPagamento === 'entrada_parcelamento') {
    if (parcelaAtual === 1) {
      tipoPagamentoTexto = 'Entrada';
      assuntoEmail = 'Confirmação da Entrada';
    } else {
      const numParcela = parcelaAtual - 1;
      tipoPagamentoTexto = `Parcela ${numParcela}/${totalParcelas || '?'}`;
      assuntoEmail = `Confirmação da ${numParcela}ª Parcela`;
    }
  } else {
    tipoPagamentoTexto = `Parcela ${parcelaAtual}/${totalParcelas}`;
    assuntoEmail = `Confirmação da ${parcelaAtual}ª Parcela`;
  }
  
  return {
    subject: `${assuntoEmail} - ${leilaoNome}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmação de Pagamento</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', 'Helvetica', sans-serif; background-color: #f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 2px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          
          <!-- Header Corporativo -->
          <tr>
            <td style="background-color: #22543d; padding: 30px 40px; border-bottom: 3px solid #c49b63;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
                Confirmação de Pagamento
              </h1>
            </td>
          </tr>

          <!-- Logo Arthur Lira -->
          <tr>
            <td align="center" style="padding: 30px 40px 0 40px;">
              <img src="https://moojuqphvhrhasxhaahd.supabase.co/storage/v1/object/public/documents/arthur-lira-logo.png" alt="Arthur Lira Leilões" style="height: 60px; width: auto; display: block; margin: 0 auto;" />
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #2d3748; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                Prezado(a) <strong>${arrematanteNome}</strong>,
              </p>
              
              <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 32px 0;">
                Confirmamos o recebimento do pagamento referente ao compromisso abaixo relacionado. Agradecemos pela pontualidade e confiança em nossos serviços.
              </p>

              <!-- Confirmação -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fff4; border-left: 4px solid #38a169; padding: 16px; margin-bottom: 32px;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #22543d; font-size: 14px; font-weight: 600;">
                      PAGAMENTO PROCESSADO COM SUCESSO
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Box de Informações -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 32px;">
                <tr>
                  <td style="background-color: #f7fafc; padding: 20px; border-bottom: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #1a365d; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Dados do Pagamento
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; width: 140px;">Leilão:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${leilaoNome}</td>
                      </tr>
                      ${loteNumero ? `
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Lote:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${loteNumero}</td>
                      </tr>
                      ` : ''}
                      ${tipoPagamentoTexto ? `
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Tipo:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${tipoPagamentoTexto}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Valor Pago:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 700;">${valorPagar}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Data:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${new Date().toLocaleDateString('pt-BR')}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                Agradecemos pela preferência e confiança depositada em nossos serviços. Estamos à disposição para atendê-lo em futuras negociações.
              </p>

              <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                Para informações adicionais, permanecemos à disposição através dos nossos canais de atendimento.
              </p>

              <!-- Informações de Contato -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7fafc; border-radius: 4px; padding: 16px; margin: 0;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
                      <strong style="color: #2d3748;">Contato:</strong> lireleiloesgestoes@gmail.com
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Corporativo -->
          <tr>
            <td style="background-color: #f7fafc; padding: 32px 40px; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">
                Atenciosamente,<br/>
                <strong style="color: #2d3748; font-size: 16px;">Arthur Lira Leilões</strong>
              </p>
              
              <!-- Logos -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="border-spacing: 0; border-collapse: collapse; margin-left: -20px;">
                      <tr>
                        <td style="padding: 0 10px 0 0; margin: 0; vertical-align: middle; line-height: 0;">
                          <img src="https://moojuqphvhrhasxhaahd.supabase.co/storage/v1/object/public/documents/Elionsoftwaress.png" alt="Elion Softwares" style="height: 48px; width: auto; display: block; vertical-align: middle; border: none; outline: none; text-decoration: none; pointer-events: none; -webkit-user-select: none; -moz-user-select: none; user-select: none; position: relative; z-index: 1; margin-top: 5px;" draggable="false" />
                        </td>
                        <td style="padding: 0 0 0 10px; margin: 0; vertical-align: middle; line-height: 0;">
                          <img src="https://moojuqphvhrhasxhaahd.supabase.co/storage/v1/object/public/documents/arthur-lira-logo.png" alt="Arthur Lira" style="height: 50px; width: auto; display: block; vertical-align: middle; border: none; outline: none; text-decoration: none; pointer-events: none; -webkit-user-select: none; -moz-user-select: none; user-select: none; position: relative; z-index: 2;" draggable="false" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="color: #a0aec0; font-size: 11px; margin: 24px 0 0 0; text-align: center; line-height: 1.5;">
                © ${new Date().getFullYear()} Arthur Lira Leilões. Todos os direitos reservados.<br/>
                Desenvolvido por Elion Softwares.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  };
}

export function getQuitacaoCompletaEmailTemplate(data: EmailTemplateData): { subject: string; html: string } {
  const { arrematanteNome, leilaoNome, loteNumero, valorTotal, totalParcelas, tipoPagamento } = data;
  
  // Determinar mensagem personalizada por tipo de pagamento
  let mensagemTipo = '';
  if (tipoPagamento === 'a_vista') {
    mensagemTipo = 'pagamento à vista';
  } else if (tipoPagamento === 'entrada_parcelamento') {
    mensagemTipo = `entrada + ${totalParcelas ? totalParcelas : ''} parcelas`;
  } else {
    mensagemTipo = `${totalParcelas} parcelas`;
  }
  
  return {
    subject: `Comprovante de Quitação - ${leilaoNome}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comprovante de Quitação</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', 'Helvetica', sans-serif; background-color: #f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 2px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          
          <!-- Header Corporativo -->
          <tr>
            <td style="background-color: #1a365d; padding: 30px 40px; border-bottom: 3px solid #c49b63;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
                Comprovante de Quitação
              </h1>
            </td>
          </tr>

          <!-- Logo Arthur Lira -->
          <tr>
            <td align="center" style="padding: 30px 40px 0 40px;">
              <img src="https://moojuqphvhrhasxhaahd.supabase.co/storage/v1/object/public/documents/arthur-lira-logo.png" alt="Arthur Lira Leilões" style="height: 60px; width: auto; display: block; margin: 0 auto;" />
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #2d3748; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                Prezado(a) <strong>${arrematanteNome}</strong>,
              </p>
              
              <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 32px 0;">
                Confirmamos a quitação integral do compromisso financeiro referente ao leilão discriminado abaixo. Todas as obrigações contratuais foram exitosamente adimplidas.
              </p>

              <!-- Confirmação de Quitação -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fff4; border-left: 4px solid #38a169; padding: 16px; margin-bottom: 32px;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #22543d; font-size: 14px; font-weight: 600;">
                      COMPROMISSO INTEGRALMENTE QUITADO
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Box de Informações -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 32px;">
                <tr>
                  <td style="background-color: #f7fafc; padding: 20px; border-bottom: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #1a365d; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Dados do Compromisso Quitado
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; width: 140px;">Leilão:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${leilaoNome}</td>
                      </tr>
                      ${loteNumero ? `
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Lote:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${loteNumero}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Forma de Pagamento:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600; text-transform: capitalize;">${mensagemTipo}</td>
                      </tr>
                      ${totalParcelas && tipoPagamento !== 'a_vista' ? `
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Total de Parcelas:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${tipoPagamento === 'entrada_parcelamento' ? `${totalParcelas} parcelas + entrada quitadas` : `${totalParcelas} parcelas integralmente quitadas`}</td>
                      </tr>
                      ` : ''}
                      ${valorTotal ? `
                      <tr style="background-color: #f0fff4;">
                        <td style="padding: 12px 0; color: #22543d; font-size: 14px; font-weight: 600; border-top: 2px solid #9ae6b4;">Valor Total Quitado:</td>
                        <td style="padding: 12px 0; color: #22543d; font-size: 16px; font-weight: 700; border-top: 2px solid #9ae6b4;">${valorTotal}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Data da Quitação:</td>
                        <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-weight: 600;">${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px;">Situação:</td>
                        <td style="padding: 8px 0;">
                          <span style="background-color: #38a169; color: #ffffff; padding: 5px 14px; border-radius: 3px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                            QUITADO
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                Agradecemos pela confiança depositada em nossos serviços. Seu comprometimento e pontualidade são muito importantes para nós.
              </p>

              <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                Permanecemos à disposição para atendê-lo em futuras oportunidades.
              </p>

              <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                Para quaisquer dúvidas ou esclarecimentos adicionais, nossa equipe permanece à sua inteira disposição.
              </p>

              <!-- Informações de Contato -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7fafc; border-radius: 4px; padding: 16px; margin: 0;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
                      <strong style="color: #2d3748;">Contato:</strong> lireleiloesgestoes@gmail.com
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Corporativo -->
          <tr>
            <td style="background-color: #f7fafc; padding: 32px 40px; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">
                Atenciosamente,<br/>
                <strong style="color: #2d3748; font-size: 16px;">Arthur Lira Leilões</strong>
              </p>
              
              <!-- Logos -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="border-spacing: 0; border-collapse: collapse; margin-left: -20px;">
                      <tr>
                        <td style="padding: 0 10px 0 0; margin: 0; vertical-align: middle; line-height: 0;">
                          <img src="https://moojuqphvhrhasxhaahd.supabase.co/storage/v1/object/public/documents/Elionsoftwaress.png" alt="Elion Softwares" style="height: 48px; width: auto; display: block; vertical-align: middle; border: none; outline: none; text-decoration: none; pointer-events: none; -webkit-user-select: none; -moz-user-select: none; user-select: none; position: relative; z-index: 1; margin-top: 5px;" draggable="false" />
                        </td>
                        <td style="padding: 0 0 0 10px; margin: 0; vertical-align: middle; line-height: 0;">
                          <img src="https://moojuqphvhrhasxhaahd.supabase.co/storage/v1/object/public/documents/arthur-lira-logo.png" alt="Arthur Lira" style="height: 50px; width: auto; display: block; vertical-align: middle; border: none; outline: none; text-decoration: none; pointer-events: none; -webkit-user-select: none; -moz-user-select: none; user-select: none; position: relative; z-index: 2;" draggable="false" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="color: #a0aec0; font-size: 11px; margin: 24px 0 0 0; text-align: center; line-height: 1.5;">
                © ${new Date().getFullYear()} Arthur Lira Leilões. Todos os direitos reservados.<br/>
                Desenvolvido por Elion Softwares.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  };
}
