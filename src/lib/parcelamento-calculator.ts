// Interface para retorno de informação de parcela
export interface ParcelaInfo {
  numero: number;
  tipo: 'simples' | 'dupla' | 'tripla' | 'entrada';
  valor: number;
  multiplicador: number; // 1, 2 ou 3
}

/**
 * Calcular valor total: lance × fator
 */
export function calcularValorTotal(lance: number, fator: number): number {
  if (lance <= 0 || fator <= 0) {
    return 0;
  }
  return Math.round(lance * fator * 100) / 100;
}

/**
 * Calcular estrutura de parcelas baseado em quantidades de cada tipo
 */
export function calcularEstruturaParcelas(
  valorTotal: number,
  parcelasTriplas: number = 0,
  parcelasDuplas: number = 0,
  parcelasSimples: number = 0
): ParcelaInfo[] {
  const estrutura: ParcelaInfo[] = [];
  
  // Calcular unidades totais
  const totalUnidades = (parcelasTriplas * 3) + (parcelasDuplas * 2) + (parcelasSimples * 1);
  
  if (totalUnidades === 0) return [];
  
  const valorBase = valorTotal / totalUnidades;
  let numeroParcela = 1;
  
  // Adicionar parcelas triplas
  for (let i = 0; i < parcelasTriplas; i++) {
    estrutura.push({
      numero: numeroParcela++,
      tipo: 'tripla',
      valor: valorBase * 3,
      multiplicador: 3
    });
  }
  
  // Adicionar parcelas duplas
  for (let i = 0; i < parcelasDuplas; i++) {
    estrutura.push({
      numero: numeroParcela++,
      tipo: 'dupla',
      valor: valorBase * 2,
      multiplicador: 2
    });
  }
  
  // Adicionar parcelas simples
  for (let i = 0; i < parcelasSimples; i++) {
    estrutura.push({
      numero: numeroParcela++,
      tipo: 'simples',
      valor: valorBase,
      multiplicador: 1
    });
  }
  
  return estrutura;
}

/**
 * Obter quantidade total de parcelas
 */
export function obterQuantidadeTotalParcelas(
  parcelasTriplas: number = 0,
  parcelasDuplas: number = 0,
  parcelasSimples: number = 0
): number {
  return parcelasTriplas + parcelasDuplas + parcelasSimples;
}

/**
 * Função helper para obter valor total considerando fator multiplicador
 */
export function obterValorTotalArrematante(
  arrematante: {
    usaFatorMultiplicador?: boolean;
    valorLance?: number;
    fatorMultiplicador?: number;
    valorPagarNumerico: number;
  }
): number {
  // Se usa fator multiplicador (novo sistema)
  if (arrematante.usaFatorMultiplicador && arrematante.valorLance && arrematante.fatorMultiplicador) {
    return calcularValorTotal(arrematante.valorLance, arrematante.fatorMultiplicador);
  }
  
  // Sistema antigo (valor direto)
  return arrematante.valorPagarNumerico || 0;
}
