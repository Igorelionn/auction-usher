export type AuctionStatus = "agendado" | "em_andamento" | "finalizado";

export interface DocumentoInfo {
  id: string;
  nome: string;
  tipo: string; // tipo MIME do arquivo
  tamanho: number; // tamanho em bytes
  dataUpload: string; // ISO date
  url?: string; // URL do arquivo se armazenado
  categoria?: string; // categoria da foto (lote, mercadoria, etc.)
}

export interface ItemCustoInfo {
  id: string;
  descricao: string; // descrição do gasto (ex: "Transporte", "Alimentação")
  valor: string; // valor como string para preservar formatação
  valorNumerico: number; // valor numérico para cálculos
}

export interface ItemPatrocinioInfo {
  id: string;
  nomePatrocinador: string; // nome do patrocinador
  valor: string; // valor como string para preservar formatação
  valorNumerico: number; // valor numérico para cálculos
}

export interface MercadoriaInfo {
  id: string;
  nome?: string; // nome personalizado da mercadoria (opcional)
  tipo: string; // tipo de mercadoria (ex: Gado Nelore, Veículos)
  descricao: string; // descrição detalhada da mercadoria
  quantidade?: number; // quantidade de unidades da mercadoria
  valor: string; // valor como string para preservar formatação
  valorNumerico: number; // valor numérico para cálculos
}

export interface LoteInfo {
  id: string;
  numero: string; // número do lote (ex: "001", "002")
  descricao: string; // descrição do lote
  mercadorias: MercadoriaInfo[]; // mercadorias dentro do lote
  status?: 'disponivel' | 'arrematado' | 'arquivado'; // status do lote
  
  // Configurações específicas de pagamento por lote
  tipoPagamento?: "a_vista" | "parcelamento" | "entrada_parcelamento"; // tipo de pagamento específico do lote
  dataPagamento?: string; // data específica para pagamento do lote (ISO date)
  mesInicioPagamento?: string; // mês de início do pagamento específico do lote (formato MM)
  diaVencimentoPadrao?: number; // dia padrão do mês para pagamentos do lote (1-31)
  diaVencimentoMensal?: number; // dia do mês para vencimento (1-21)
  dataEntrada?: string; // data completa para pagamento da entrada do lote (apenas para entrada_parcelamento)
  dataVencimentoVista?: string; // data completa para pagamento à vista do lote (apenas para a_vista)
  parcelasPadrao?: number; // quantidade padrão de parcelas para arrematantes do lote
  quantidadeParcelas?: number; // quantidade de parcelas
  valorEntrada?: string; // valor da entrada
}

export interface ArrematanteInfo {
  nome: string;
  documento?: string; // CPF/CNPJ do arrematante
  endereco?: string; // endereço do arrematante
  email?: string; // email do arrematante
  telefone?: string; // telefone do arrematante
  loteId?: string; // ID do lote arrematado
  valorPagar: string; // valor como string para preservar formatação
  valorPagarNumerico: number; // valor numérico para cálculos
  valorEntrada?: string; // valor da entrada para pagamentos com entrada + parcelamento
  diaVencimentoMensal: number; // dia do mês para vencimento (1-21)
  quantidadeParcelas: number; // número total de parcelas
  parcelasPagas?: number; // número de parcelas já pagas (padrão 0)
  mesInicioPagamento: string; // mês de início do pagamento (formato YYYY-MM)
  dataEntrada?: string; // data completa para pagamento da entrada (apenas para entrada_parcelamento)
  dataVencimentoVista?: string; // data completa para pagamento à vista (apenas para a_vista)
  pago?: boolean; // se está completamente quitado
  documentos?: DocumentoInfo[]; // informações completas dos documentos
  percentualJurosAtraso?: number; // percentual de juros por mês de atraso (0-100)
  tipoJurosAtraso?: "simples" | "composto"; // tipo de juros aplicado
}

export interface Auction {
  id: string;
  nome: string;
  identificacao?: string;
  local: "presencial" | "online" | "hibrido" | string;
  endereco?: string;
  dataInicio: string; // ISO date
  dataEncerramento?: string; // ISO date
  tipoPagamento?: "a_vista" | "parcelamento" | "entrada_parcelamento"; // tipo de pagamento
  mesInicioPagamento?: string; // Mês de início do pagamento (formato MM)
  diaVencimentoPadrao?: number; // dia padrão do mês para pagamentos (1-31)
  dataEntrada?: string; // data completa para pagamento da entrada (apenas para entrada_parcelamento)
  dataVencimentoVista?: string; // data completa para pagamento à vista (apenas para a_vista)
  parcelasPadrao?: number; // quantidade padrão de parcelas para novos arrematantes
  status: AuctionStatus;
  custos?: string; // custos como string para preservar formatação
  custosNumerico?: number; // custos numérico para cálculos
  detalheCustos?: ItemCustoInfo[]; // detalhamento dos custos
  detalhePatrocinios?: ItemPatrocinioInfo[]; // detalhamento dos patrocínios
  patrociniosTotal?: number; // total de patrocínios recebidos
  lotes?: LoteInfo[]; // informações dos lotes do leilão
  fotosMercadoria?: DocumentoInfo[]; // fotos da mercadoria
  historicoNotas?: string[];
  arquivado?: boolean; // se o leilão foi arquivado
  arrematante?: ArrematanteInfo; // informações do arrematante
  documentos?: DocumentoInfo[]; // documentos do leilão
}

export interface Lot {
  id: string;
  auctionId: string;
  numero: string;
  descricao: string;
  valorInicial: number;
  incrementoLance: number;
  fotos?: string[];
  documentos?: DocumentoInfo[];
  certificados?: DocumentoInfo[];
  arrematanteId?: string; // filled após encerramento
}

export interface Bidder {
  id: string;
  nome: string;
  documento: string; // CPF/CNPJ
  telefone?: string;
  email?: string;
  endereco?: string;
}

export type InvoiceStatus = "em_aberto" | "pago" | "atrasado";

export interface Invoice {
  id: string;
  lotId: string;
  auctionId: string;
  arrematanteId: string;
  valorArremate: number;
  comissao?: number; // percentual 0-1 ou valor fixo; simplificar como valor fixo em reais
  custosAdicionais?: number; // frete, taxas, impostos
  valorLiquido: number;
  vencimento: string; // ISO date
  status: InvoiceStatus;
  pdfUrl?: string; // preenchido ao gerar PDF
}

export interface DomainState {
  auctions: Auction[];
  lots: Lot[];
  bidders: Bidder[];
  invoices: Invoice[];
}


