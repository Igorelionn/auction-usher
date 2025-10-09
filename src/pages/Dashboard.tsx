import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Gavel,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Users,
  Package,
  ArrowRight,
  FileText,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";
import { Invoice } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useSupabaseAuctions } from "@/hooks/use-supabase-auctions";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Função para converter string de moeda para número
const parseCurrencyToNumber = (currencyString: string): number => {
  if (!currencyString) return 0;
  // Remove R$, espaços, pontos (milhares) e converte vírgula para ponto decimal
  const cleanString = currencyString
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleanString) || 0;
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { auctions, isLoading } = useSupabaseAuctions();
  const { stats } = useDashboardStats();
  
  // Carrossel da agenda
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const slides = [
    { id: 'leiloes', title: 'Próximos Leilões', icon: Calendar },
    { id: 'inadimplentes', title: 'Inadimplentes', icon: AlertTriangle },
    { id: 'arrematantes', title: 'Arrematantes', icon: Users },
  ];

  // Rotação automática
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 300);
    }, 8000);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  const nextSlide = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 300);
  };
  
  const prevSlide = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 300);
  };

  // Filtrar apenas leilões não arquivados
  const activeAuctions = auctions.filter(auction => !auction.arquivado);

  // Função para verificar se um arrematante está inadimplente (considera tipos de pagamento por lote)
  const isOverdue = (arrematante: any, auction: any) => {
    if (arrematante.pago) return false;
    
    // Encontrar o lote arrematado para obter as configurações específicas de pagamento
    const loteArrematado = auction.lotes?.find((lote: any) => lote.id === arrematante.loteId);
    if (!loteArrematado || !loteArrematado.tipoPagamento) return false;
    
    const tipoPagamento = loteArrematado.tipoPagamento;
    const now = new Date();
    
    switch (tipoPagamento) {
      case 'a_vista': {
        // CORREÇÃO: Evitar problema de fuso horário do JavaScript
        const dateStr = loteArrematado.dataVencimentoVista || new Date().toISOString().split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        
        // Usar construtor Date(year, month, day) que ignora fuso horário
        const dueDate = new Date(year, month - 1, day); // month é zero-indexed
        dueDate.setHours(23, 59, 59, 999);
        return now > dueDate;
      }
      
      case 'entrada_parcelamento': {
        const parcelasPagas = arrematante.parcelasPagas || 0;
        const quantidadeParcelas = arrematante.quantidadeParcelas || 12;
        
        // Para entrada_parcelamento: entrada + parcelas
        // Se parcelasPagas >= (1 + quantidadeParcelas), está tudo pago
        if (parcelasPagas >= (1 + quantidadeParcelas)) return false;
        
        if (parcelasPagas === 0) {
          // Entrada não foi paga - verificar se está atrasada
          if (!loteArrematado.dataEntrada) return false;
          const entradaDueDate = new Date(loteArrematado.dataEntrada);
          entradaDueDate.setHours(23, 59, 59, 999);
          return now > entradaDueDate;
        } else {
          // Entrada foi paga - verificar se há parcelas atrasadas
          // PRIORIZAR dados do arrematante (mais específicos)
          const mesInicioPagamento = arrematante.mesInicioPagamento || loteArrematado.mesInicioPagamento;
          const diaVencimento = arrematante.diaVencimentoMensal || loteArrematado.diaVencimentoPadrao;
          
          if (!mesInicioPagamento || !diaVencimento) return false;
          
          let startYear, startMonth;
          
          // Verificar se mesInicioPagamento está no formato "YYYY-MM" ou só "MM"
          if (mesInicioPagamento.includes('-')) {
            const parts = mesInicioPagamento.split('-');
            if (parts.length !== 2) return false;
            [startYear, startMonth] = parts.map(Number);
          } else {
            // Se for só o mês, usar ano atual
            startYear = new Date().getFullYear();
            startMonth = Number(mesInicioPagamento);
          }
          
          // Verificar todas as parcelas que deveriam ter sido pagas até agora
          const parcelasEfetivasPagas = parcelasPagas - 1; // -1 porque a primeira "parcela paga" é a entrada
          
          for (let i = 0; i < quantidadeParcelas; i++) {
            const parcelaDate = new Date(startYear, startMonth - 1 + i, diaVencimento);
            parcelaDate.setHours(23, 59, 59, 999);
            
            if (now > parcelaDate && i >= parcelasEfetivasPagas) {
              return true; // Encontrou uma parcela em atraso
            }
          }
          
          return false; // Nenhuma parcela está atrasada
        }
      }
      
      case 'parcelamento':
      default: {
        // PRIORIZAR dados do arrematante (mais específicos)
        const mesInicioPagamento = arrematante.mesInicioPagamento || loteArrematado.mesInicioPagamento;
        const diaVencimento = arrematante.diaVencimentoMensal || loteArrematado.diaVencimentoPadrao;
        const quantidadeParcelas = arrematante.quantidadeParcelas || loteArrematado.parcelasPadrao || 12;
        
        if (!mesInicioPagamento || !diaVencimento) return false;
        
        let startYear, startMonth;
        
        // Verificar se mesInicioPagamento está no formato "YYYY-MM" ou só "MM"
        if (mesInicioPagamento.includes('-')) {
          const parts = mesInicioPagamento.split('-');
          if (parts.length !== 2) return false;
          [startYear, startMonth] = parts.map(Number);
        } else {
          // Se for só o mês, usar ano atual
          startYear = new Date().getFullYear();
          startMonth = Number(mesInicioPagamento);
        }
        
        const parcelasPagas = arrematante.parcelasPagas || 0;
        
        if (parcelasPagas >= quantidadeParcelas) return false;
        
        const nextPaymentDate = new Date(startYear, startMonth - 1 + parcelasPagas, diaVencimento);
        nextPaymentDate.setHours(23, 59, 59, 999);
        return now > nextPaymentDate;
      }
    }
  };

  // Calcular total recebido localmente (valores parciais e totais)
  const localTotalRecebido = activeAuctions
    .filter(auction => auction.arrematante)
    .reduce((total, auction) => {
      const arrematante = auction.arrematante;
      const parcelasPagas = arrematante?.parcelasPagas || 0;
      
      // Se totalmente pago, contar valor total
      if (arrematante?.pago) {
        const valorTotal = arrematante?.valorPagarNumerico || 0;
        return total + valorTotal;
      }
      
      // Se parcialmente pago, calcular valor das parcelas pagas
      if (parcelasPagas > 0) {
        const loteArrematado = auction.lotes?.find(lote => lote.id === arrematante.loteId);
        const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento;
        const valorTotal = arrematante?.valorPagarNumerico || 0;
        
        if (tipoPagamento === 'entrada_parcelamento') {
          // Para entrada + parcelamento
          const valorEntrada = arrematante?.valorEntrada ? 
            (typeof arrematante.valorEntrada === 'string' ? 
              parseFloat(arrematante.valorEntrada.replace(/[^\d,]/g, '').replace(',', '.')) : 
              arrematante.valorEntrada) : 
            valorTotal * 0.3;
          const quantidadeParcelas = arrematante?.quantidadeParcelas || 12;
          const valorRestante = valorTotal - valorEntrada;
          const valorPorParcela = valorRestante / quantidadeParcelas;
          
          // Calcular valor recebido: entrada + parcelas pagas
          if (parcelasPagas >= 1) {
            // Entrada foi paga
            const parcelasEfetivasPagas = Math.max(0, parcelasPagas - 1);
            return total + valorEntrada + (parcelasEfetivasPagas * valorPorParcela);
          }
        } else if (tipoPagamento === 'parcelamento' || !tipoPagamento) {
          // Para parcelamento simples
          const quantidadeParcelas = arrematante?.quantidadeParcelas || 1;
          const valorPorParcela = valorTotal / quantidadeParcelas;
          return total + (parcelasPagas * valorPorParcela);
        } else if (tipoPagamento === 'a_vista') {
          // Para à vista, se parcelasPagas > 0, foi pago
          return total + (parcelasPagas > 0 ? valorTotal : 0);
        }
      }
      
      return total;
    }, 0);

  // Calcular superávit de patrocínios (quando patrocínios > custos)
  const totalSuperavitPatrocinios = activeAuctions.reduce((total, auction) => {
    const custosNumerico = auction.custosNumerico || 0;
    const patrociniosTotal = auction.patrociniosTotal || 0;
    
    // Se há superávit de patrocínios, adicionar ao total
    if (patrociniosTotal > custosNumerico) {
      const superavit = patrociniosTotal - custosNumerico;
      return total + superavit;
    }
    
    return total;
  }, 0);

  // Total recebido final = pagamentos dos arrematantes + superávit de patrocínios
  const totalRecebidoComSuperavit = localTotalRecebido + totalSuperavitPatrocinios;

  // Calcular inadimplentes localmente com lógica correta
  const localOverdueCount = activeAuctions
    .filter(auction => auction.arrematante && isOverdue(auction.arrematante, auction))
    .length;

  // Calcular leilões em andamento localmente (apenas não arquivados)
  // CORREÇÃO: Usar cálculo local para garantir que conte apenas leilões não arquivados
  const localActiveAuctionsCount = activeAuctions.filter(a => a.status === "em_andamento").length;

  // Calcular valores localmente para evitar duplicatas (incluindo juros de atraso)
  const localTotalAReceber = activeAuctions
    .filter(auction => auction.arrematante && !auction.arrematante.pago)
    .reduce((total, auction) => {
      const arrematante = auction.arrematante;
      const loteArrematado = auction.lotes?.find(lote => lote.id === arrematante?.loteId);
      const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento || "parcelamento";
      const valorTotal = arrematante?.valorPagarNumerico || 0;
      const parcelasPagas = arrematante?.parcelasPagas || 0;
      const now = new Date();
      
      // Função para calcular juros progressivos
      const calcularJurosProgressivos = (valorOriginal: number, percentualJuros: number, mesesAtraso: number) => {
        if (mesesAtraso < 1 || !percentualJuros) {
          return valorOriginal;
        }
        let valorAtual = valorOriginal;
        const taxaMensal = percentualJuros / 100;
        for (let mes = 1; mes <= mesesAtraso; mes++) {
          const jurosMes = valorAtual * taxaMensal;
          valorAtual = valorAtual + jurosMes;
        }
        return Math.round(valorAtual * 100) / 100;
      };
      
      if (tipoPagamento === "a_vista") {
        // Para à vista, verificar se está atrasado e aplicar juros
        const dataVencimento = loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista;
        if (dataVencimento) {
          const vencimento = new Date(dataVencimento + 'T23:59:59');
          if (now > vencimento && arrematante?.percentualJurosAtraso) {
            const mesesAtraso = Math.max(0, Math.floor((now.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24 * 30)));
            if (mesesAtraso >= 1) {
              return total + calcularJurosProgressivos(valorTotal, arrematante.percentualJurosAtraso, mesesAtraso);
            }
          }
        }
        return total + valorTotal;
      } else if (tipoPagamento === "entrada_parcelamento") {
        // Para entrada + parcelamento, calcular valor restante com juros
        const valorEntrada = arrematante?.valorEntrada ? 
          (typeof arrematante.valorEntrada === 'string' ? 
            parseFloat(arrematante.valorEntrada.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')) : 
            arrematante.valorEntrada) : 
          valorTotal * 0.3;
        const valorRestante = valorTotal - valorEntrada;
        const quantidadeParcelas = arrematante?.quantidadeParcelas || 12;
        const valorPorParcela = Math.round((valorRestante / quantidadeParcelas) * 100) / 100;
        
        let valorAReceber = 0;
        
        // Verificar entrada se não foi paga
        if (parcelasPagas === 0) {
          if (loteArrematado?.dataEntrada) {
            const dataEntrada = new Date(loteArrematado.dataEntrada + 'T23:59:59');
            if (now > dataEntrada && arrematante?.percentualJurosAtraso) {
              const mesesAtraso = Math.max(0, Math.floor((now.getTime() - dataEntrada.getTime()) / (1000 * 60 * 60 * 24 * 30)));
              if (mesesAtraso >= 1) {
                valorAReceber += calcularJurosProgressivos(valorEntrada, arrematante.percentualJurosAtraso, mesesAtraso);
              } else {
                valorAReceber += valorEntrada;
              }
            } else {
              valorAReceber += valorEntrada;
            }
          } else {
            valorAReceber += valorEntrada;
          }
          
          // Calcular cada parcela mensal com juros se atrasada
          if (arrematante?.mesInicioPagamento && arrematante?.diaVencimentoMensal) {
            const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
            
            for (let i = 0; i < quantidadeParcelas; i++) {
              const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal, 23, 59, 59);
              if (now > parcelaDate && arrematante?.percentualJurosAtraso) {
                const mesesAtraso = Math.max(0, Math.floor((now.getTime() - parcelaDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                if (mesesAtraso >= 1) {
                  valorAReceber += calcularJurosProgressivos(valorPorParcela, arrematante.percentualJurosAtraso, mesesAtraso);
                } else {
                  valorAReceber += valorPorParcela;
                }
              } else {
                valorAReceber += valorPorParcela;
              }
            }
          } else {
            valorAReceber += valorRestante;
          }
        } else {
          // Entrada já paga, calcular parcelas restantes
          const parcelasEfetivasPagas = Math.max(0, parcelasPagas - 1);
          const parcelasRestantes = quantidadeParcelas - parcelasEfetivasPagas;
          
          // Verificar parcelas mensais com juros
          if (arrematante?.mesInicioPagamento && arrematante?.diaVencimentoMensal) {
            const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
            
            for (let i = parcelasEfetivasPagas; i < quantidadeParcelas; i++) {
              const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal, 23, 59, 59);
              if (now > parcelaDate && arrematante?.percentualJurosAtraso) {
                const mesesAtraso = Math.max(0, Math.floor((now.getTime() - parcelaDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                if (mesesAtraso >= 1) {
                  valorAReceber += calcularJurosProgressivos(valorPorParcela, arrematante.percentualJurosAtraso, mesesAtraso);
                } else {
                  valorAReceber += valorPorParcela;
                }
              } else {
                valorAReceber += valorPorParcela;
              }
            }
          } else {
            valorAReceber += parcelasRestantes * valorPorParcela;
          }
        }
        
        return total + valorAReceber;
      } else {
        // Para parcelamento simples, calcular parcelas restantes com juros
        const quantidadeParcelas = arrematante?.quantidadeParcelas || 1;
        const valorPorParcela = valorTotal / quantidadeParcelas;
        const parcelasRestantes = quantidadeParcelas - parcelasPagas;
        
        let valorAReceber = 0;
        
        if (arrematante?.mesInicioPagamento && arrematante?.diaVencimentoMensal) {
          const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
          
          for (let i = parcelasPagas; i < quantidadeParcelas; i++) {
            const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal, 23, 59, 59);
            if (now > parcelaDate && arrematante?.percentualJurosAtraso) {
              const mesesAtraso = Math.max(0, Math.floor((now.getTime() - parcelaDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
              if (mesesAtraso >= 1) {
                valorAReceber += calcularJurosProgressivos(valorPorParcela, arrematante.percentualJurosAtraso, mesesAtraso);
              } else {
                valorAReceber += valorPorParcela;
              }
            } else {
              valorAReceber += valorPorParcela;
            }
          }
        } else {
          valorAReceber = parcelasRestantes * valorPorParcela;
        }
        
        return total + valorAReceber;
      }
    }, 0);

  const localTotalArrematantes = activeAuctions
    .filter(auction => auction.arrematante)
    .length;

  // Usar cálculos locais para evitar duplicatas
  const totalReceiverNumber = localTotalAReceber;
  const auctionCostsNumber = stats?.total_custos || 0;
  const overdueCount = localOverdueCount;
  const totalRecebido = totalRecebidoComSuperavit;
  const activeAuctionsCount = localActiveAuctionsCount;
  const scheduledAuctionsCount = activeAuctions.filter(a => a.status === "agendado").length;
  const totalArrematantes = localTotalArrematantes;

  const todayString = new Date().toISOString().slice(0, 10);

  // Função para calcular próxima data de vencimento baseada nas configurações específicas do lote
  const calculateNextPaymentDate = (arrematante: any, auction: any) => {
    if (!arrematante || arrematante.pago) return null;
    
    const loteArrematado = auction.lotes?.find((lote: any) => lote.id === arrematante.loteId);
    if (!loteArrematado || !loteArrematado.tipoPagamento) return null;
    
    const tipoPagamento = loteArrematado.tipoPagamento;
    
    switch (tipoPagamento) {
      case 'a_vista': {
        if (!loteArrematado.dataVencimentoVista) return null;
        
        // CORREÇÃO: Evitar problema de fuso horário do JavaScript
        const dateStr = loteArrematado.dataVencimentoVista || new Date().toISOString().split('T')[0];
        const parts = dateStr.split('-');
        if (parts.length !== 3) return null;
        
        const [year, month, day] = parts.map(Number);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
        
        // Usar construtor Date(year, month, day) que ignora fuso horário
        return new Date(year, month - 1, day); // month é zero-indexed
      }
      
      case 'entrada_parcelamento': {
        const parcelasPagas = arrematante.parcelasPagas || 0;
        const quantidadeParcelas = (loteArrematado.parcelasPadrao || 1) + 1;
        
        if (parcelasPagas >= quantidadeParcelas) return null;
        
        if (parcelasPagas === 0) {
          // Próximo pagamento é a entrada - CORREÇÃO: Evitar problema de fuso horário
          const dataEntrada = loteArrematado.dataEntrada || arrematante.dataEntrada;
          if (!dataEntrada) return null;
          const parts = dataEntrada.split('-');
          if (parts.length !== 3) return null;
          
          const [year, month, day] = parts.map(Number);
          if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
          
          // Usar construtor Date(year, month, day) que ignora fuso horário
          return new Date(year, month - 1, day); // month é zero-indexed
        } else {
          // Próximo pagamento é uma parcela após entrada
          // Priorizar dados do arrematante (mais confiáveis)
          const mesInicioPagamento = arrematante.mesInicioPagamento || loteArrematado.mesInicioPagamento;
          const diaVencimentoPadrao = arrematante.diaVencimentoMensal || loteArrematado.diaVencimentoPadrao;
          
          if (!mesInicioPagamento || !diaVencimentoPadrao) return null;
          
          let startYear, startMonth;
          
          // Verificar se mesInicioPagamento está no formato "YYYY-MM" ou só "MM"
          if (mesInicioPagamento.includes('-')) {
            const parts = mesInicioPagamento.split('-');
            if (parts.length !== 2) return null;
            [startYear, startMonth] = parts.map(Number);
          } else {
            // Se for só o mês, usar ano atual
            startYear = new Date().getFullYear();
            startMonth = Number(mesInicioPagamento);
          }
          
          const day = Number(diaVencimentoPadrao);
          
          if (isNaN(startYear) || isNaN(startMonth) || isNaN(day)) return null;
          
          return new Date(startYear, startMonth - 1 + (parcelasPagas - 1), day);
        }
      }
      
      case 'parcelamento':
      default: {
        // Priorizar dados do arrematante (mais confiáveis)
        const mesInicioPagamento = arrematante.mesInicioPagamento || loteArrematado.mesInicioPagamento;
        const diaVencimentoPadrao = arrematante.diaVencimentoMensal || loteArrematado.diaVencimentoPadrao;
        
        if (!mesInicioPagamento || !diaVencimentoPadrao) return null;
        
        const parcelasPagas = arrematante.parcelasPagas || 0;
        const quantidadeParcelas = loteArrematado.parcelasPadrao || arrematante.quantidadeParcelas || 1;
        
        if (parcelasPagas >= quantidadeParcelas) return null;
        
        let startYear, startMonth;
        
        // Verificar se mesInicioPagamento está no formato "YYYY-MM" ou só "MM"
        if (mesInicioPagamento.includes('-')) {
          const parts = mesInicioPagamento.split('-');
          if (parts.length !== 2) return null;
          [startYear, startMonth] = parts.map(Number);
        } else {
          // Se for só o mês, usar ano atual
          startYear = new Date().getFullYear();
          startMonth = Number(mesInicioPagamento);
        }
        
        const day = Number(diaVencimentoPadrao);
        
        if (isNaN(startYear) || isNaN(startMonth) || isNaN(day)) return null;
        
        return new Date(startYear, startMonth - 1 + parcelasPagas, day);
      }
    }
  };

  const getProximaDataVencimento = (arrematante: any, auction: any) => {
    const nextDate = calculateNextPaymentDate(arrematante, auction);
    if (!nextDate || isNaN(nextDate.getTime())) {
      return "—";
    }
    return nextDate.toLocaleDateString('pt-BR');
  };

  const nextAuctions = activeAuctions
    .filter((a) => a.dataInicio >= todayString || a.status === "em_andamento")
    .slice(0, 6);

  // Criar faturas fictícias a partir dos leilões com arrematantes para demonstração
  const recentInvoices: Array<{ 
    id: string; 
    bidder: string; 
    amount: string; 
    dueDate: string; 
    status: Invoice["status"];
    parcelas: string;
    leilao: string;
  }> = activeAuctions
    .filter(auction => auction.arrematante)
    .slice(0, 6)
    .map((auction) => {
      // Calcular valor por parcela baseado no tipo de pagamento específico do lote
      const arrematante = auction.arrematante;
      const loteArrematado = auction.lotes?.find((lote: any) => lote.id === arrematante?.loteId);
      
      let valorPorParcela = 0;
      if (arrematante && loteArrematado && loteArrematado.tipoPagamento) {
        const valorTotal = arrematante.valorPagarNumerico !== undefined 
          ? arrematante.valorPagarNumerico 
          : (typeof arrematante.valorPagar === 'number' ? arrematante.valorPagar : 0);
        
        switch (loteArrematado.tipoPagamento) {
          case 'a_vista':
            valorPorParcela = valorTotal;
            break;
          case 'entrada_parcelamento':
            const parcelasPagas = arrematante.parcelasPagas || 0;
            const quantidadeParcelas = (loteArrematado.parcelasPadrao || 1) + 1;
            if (parcelasPagas === 0) {
              // Valor da entrada (50%)
              valorPorParcela = valorTotal * 0.5;
            } else {
              // Parcelas após entrada
              const valorRestante = valorTotal - (valorTotal * 0.5);
              valorPorParcela = valorRestante / (quantidadeParcelas - 1);
            }
            break;
          case 'parcelamento':
          default:
            valorPorParcela = valorTotal / (loteArrematado.parcelasPadrao || 1);
            break;
        }
      }
      
      // Determinar status correto baseado no pagamento e atraso
      let status: Invoice["status"] = "em_aberto";
      if (auction.arrematante?.pago) {
        status = "pago";
      } else if (isOverdue(auction.arrematante, auction)) {
        status = "atrasado";
      }
      
      return {
        id: `invoice-${auction.id}`,
        bidder: auction.arrematante?.nome || "—",
        amount: currency.format(valorPorParcela),
        dueDate: getProximaDataVencimento(auction.arrematante, auction),
        status,
        parcelas: (() => {
          if (!loteArrematado || !loteArrematado.tipoPagamento) {
            return `${auction.arrematante?.parcelasPagas || 0}/${auction.arrematante?.quantidadeParcelas || 1}`;
          }
          
          const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
          
          switch (loteArrematado.tipoPagamento) {
            case 'a_vista':
              return parcelasPagas > 0 ? "1/1" : "0/1"; // À vista é sempre 1 parcela total
            case 'entrada_parcelamento':
              const quantidadeTotal = (loteArrematado.parcelasPadrao || 1) + 1; // +1 para entrada
              return `${parcelasPagas}/${quantidadeTotal}`;
            case 'parcelamento':
            default:
              return `${parcelasPagas}/${loteArrematado.parcelasPadrao || 1}`;
          }
        })(),
        leilao: auction.nome
      };
    });

  // Dados para carrossel - arrematantes em atraso (usando lógica atualizada)
  const overdueAuctions = activeAuctions.filter(auction => {
    return auction.arrematante && isOverdue(auction.arrematante, auction);
  });
  const overdueArrematantes = overdueAuctions.slice(0, 6);
  const recentArrematantes = activeAuctions
    .filter(auction => auction.arrematante)
    .slice(0, 6);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      agendado: { label: "Agendado", variant: "secondary" as const },
      em_andamento: { label: "Em Andamento", variant: "default" as const },
      finalizado: { label: "Finalizado", variant: "outline" as const },
      em_aberto: { label: "Em Aberto", variant: "warning" as const },
      pago: { label: "Pago", variant: "success" as const },
      atrasado: { label: "Atrasado", variant: "destructive" as const },
    };
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const };
  };

  // Horário de Brasília sincronizado
  const brasiliaDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const currentHour = brasiliaDate.getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Header - mantém visível durante carregamento */}
        <div className="pt-4 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground mb-2">
              {greeting}, {user?.full_name || user?.name || "Usuário"}!
            </h1>
            <p className="text-lg text-muted-foreground">Carregando resumo dos leilões...</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Data atual</p>
            <p className="text-lg font-medium text-foreground">
              {brasiliaDate.toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric", 
                month: "long",
                day: "numeric"
              })}
            </p>
          </div>
        </div>

        {/* Layout Principal com Skeleton Loaders Premium */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Conteúdo Principal - 2 colunas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Resumo Geral Skeleton */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <TrendingUp className="h-6 w-6 text-muted-foreground/70" />
                  <div className="h-6 bg-gradient-to-r from-muted via-muted/80 to-muted rounded-md w-32 animate-pulse"></div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Primeira linha de estatísticas */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={`stat-${i}`} className="text-center px-2 space-y-3">
                      <div className="h-3.5 bg-gradient-to-r from-muted via-muted/70 to-muted rounded-full mb-3 mx-auto w-24 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}></div>
                      <div className="h-px w-16 bg-gradient-to-r from-transparent via-muted to-transparent mx-auto mb-4"></div>
                      <div className="h-9 bg-gradient-to-r from-muted/90 via-muted/70 to-muted/90 rounded-lg animate-pulse" style={{ animationDelay: `${i * 150}ms` }}></div>
                      <div className="h-3 bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 rounded-full w-20 mx-auto animate-pulse" style={{ animationDelay: `${i * 200}ms` }}></div>
                    </div>
                  ))}
                </div>

                {/* Separador */}
                <div className="mt-8 pt-6 border-t border-border/50">
                  <div className="flex items-center gap-2 mb-5">
                    <Package className="h-5 w-5 text-muted-foreground/70" />
                    <div className="h-5 bg-gradient-to-r from-muted via-muted/80 to-muted rounded-md w-36 animate-pulse"></div>
                  </div>
                  
                  {/* Segunda linha de estatísticas */}
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={`stat2-${i}`} className="text-center px-2 space-y-3">
                        <div className="h-3.5 bg-gradient-to-r from-muted via-muted/70 to-muted rounded-full mb-3 mx-auto w-20 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}></div>
                        <div className="h-px w-16 bg-gradient-to-r from-transparent via-muted to-transparent mx-auto mb-4"></div>
                        <div className="h-9 bg-gradient-to-r from-muted/90 via-muted/70 to-muted/90 rounded-lg animate-pulse" style={{ animationDelay: `${i * 150}ms` }}></div>
                        <div className="h-3 bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 rounded-full w-24 mx-auto animate-pulse" style={{ animationDelay: `${i * 200}ms` }}></div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Faturas Recentes Skeleton */}
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xl">
                    <FileText className="h-6 w-6 text-muted-foreground/70" />
                    <div className="h-6 bg-gradient-to-r from-muted via-muted/80 to-muted rounded-md w-36 animate-pulse"></div>
                  </div>
                  <div className="h-8 w-8 bg-gradient-to-br from-muted to-muted/70 rounded-md animate-pulse"></div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 space-y-3 overflow-hidden">
                  {[...Array(6)].map((_, i) => (
                    <div key={`invoice-${i}`} className="flex items-start justify-between p-4 rounded-lg bg-muted/20 border border-border/30 animate-pulse" style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="flex-1 space-y-2.5">
                        <div className="h-4 bg-gradient-to-r from-muted via-muted/70 to-muted rounded-md w-44 animate-pulse"></div>
                        <div className="h-3.5 bg-gradient-to-r from-muted/70 via-muted/50 to-muted/70 rounded-md w-56 animate-pulse"></div>
                        <div className="h-3 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 rounded-md w-36 animate-pulse"></div>
                        <div className="h-3 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 rounded-md w-28 animate-pulse"></div>
                      </div>
                      <div className="h-6 w-20 bg-gradient-to-r from-muted via-muted/80 to-muted rounded-full ml-3 animate-pulse"></div>
                    </div>
                  ))}
                </div>
                <div className="flex-shrink-0 pt-4 border-t border-border/30 mt-4">
                  <div className="h-11 bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80 rounded-lg w-full animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Carrossel Skeleton - Lado direito */}
          <Card className="lg:row-span-3 h-[calc(100vh-150px)] flex flex-col overflow-hidden">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xl">
                  <Calendar className="h-6 w-6 text-muted-foreground/70" />
                  <div className="h-6 bg-gradient-to-r from-muted via-muted/80 to-muted rounded-md w-36 animate-pulse"></div>
                </div>
                <div className="h-8 w-8 bg-gradient-to-br from-muted to-muted/70 rounded-md animate-pulse"></div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 space-y-3.5 overflow-hidden">
                {[...Array(5)].map((_, i) => (
                  <div key={`carousel-${i}`} className="p-4 rounded-lg bg-muted/20 border border-border/30 animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 space-y-2.5">
                        <div className="h-4 bg-gradient-to-r from-muted via-muted/70 to-muted rounded-md w-36 animate-pulse"></div>
                        <div className="h-3.5 bg-gradient-to-r from-muted/70 via-muted/50 to-muted/70 rounded-md w-28 animate-pulse"></div>
                      </div>
                      <div className="h-6 w-20 bg-gradient-to-r from-muted via-muted/80 to-muted rounded-full ml-3 animate-pulse"></div>
                    </div>
                    <div className="h-3 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 rounded-md w-full animate-pulse"></div>
                  </div>
                ))}
              </div>
              <div className="flex-shrink-0 pt-6 border-t border-border/30 mt-4">
                <div className="h-11 bg-gradient-to-r from-muted/80 via-muted/60 to-muted/80 rounded-lg w-full animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
          <div className="space-y-8">
        <div className="pt-4 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground mb-2">
              {greeting}, {user?.full_name || user?.name || "Usuário"}!
            </h1>
            <p className="text-lg text-muted-foreground">Aqui está o resumo dos leilões</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Data atual</p>
            <p className="text-lg font-medium text-foreground">
              {brasiliaDate.toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric", 
                month: "long",
                day: "numeric"
              })}
            </p>
          </div>
        </div>

      {/* Layout Principal: Conteúdo à esquerda, Agenda à direita */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conteúdo Principal - 2 colunas */}
        <div className="lg:col-span-2 lg:min-h-[calc(100vh-150px)] flex flex-col space-y-6">
          {/* Resumo Geral - Layout Limpo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <TrendingUp className="h-6 w-6" />
                Resumo Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="text-center px-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3 flex items-center justify-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total a Receber
                  </p>
                  <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
                  <p className="text-4xl font-extralight text-gray-900 mb-2 tracking-tight">{currency.format(totalReceiverNumber)}</p>
                </div>

                <div className="text-center px-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3 flex items-center justify-center gap-2">
                    <Users className="h-4 w-4" />
                    Arrematantes
                  </p>
                  <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
                  <p className="text-4xl font-extralight text-gray-900 mb-2 tracking-tight">{totalArrematantes}</p>
                </div>

                <div className="text-center px-2">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-[0.15em] mb-3 flex items-center justify-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Inadimplentes
                  </p>
                  <div className="h-px w-20 bg-red-300 mx-auto mb-4"></div>
                  <p className="text-4xl font-extralight text-red-600 mb-2 tracking-tight">{overdueCount}</p>
                </div>

                <div className="text-center px-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3 flex items-center justify-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Recebido
                  </p>
                  <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
                  <p className="text-4xl font-extralight text-gray-900 mb-2 tracking-tight">{currency.format(totalRecebido)}</p>
                  {totalSuperavitPatrocinios > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Inclui {currency.format(totalSuperavitPatrocinios)} de superávit de patrocínios
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5 text-black" />
                  <span className="text-lg font-semibold text-black">Dados do Sistema</span>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="text-center px-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Total de Leilões</p>
                    <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
                    <p className="text-4xl font-extralight text-gray-900 mb-2 tracking-tight">{auctions.length}</p>
                    <p className="text-sm text-gray-600 font-medium">Eventos Cadastrados</p>
                  </div>
                  <div className="text-center px-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Em Andamento</p>
                    <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
                    <p className="text-4xl font-extralight text-gray-900 mb-2 tracking-tight">{activeAuctionsCount}</p>
                    <p className="text-sm text-gray-600 font-medium">Leilões Em Andamento</p>
                  </div>
                  <div className="text-center px-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Programados</p>
                    <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
                    <p className="text-4xl font-extralight text-gray-900 mb-2 tracking-tight">{scheduledAuctionsCount}</p>
                    <p className="text-sm text-gray-600 font-medium">Eventos Futuros</p>
                  </div>
                  <div className="text-center px-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Investimento</p>
                    <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
                    <p className="text-3xl font-light text-gray-900 mb-2 tracking-tight">{currency.format(auctionCostsNumber)}</p>
                    <p className="text-sm text-gray-600 font-medium">Custos Totais</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Faturas Recentes */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xl">
                  <FileText className="h-6 w-6" />
                  Faturas Recentes
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate("/faturas")}
                  className="hover:bg-gray-100 hover:text-gray-800 transition-all duration-200"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto">
                {recentInvoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">Nenhuma fatura encontrada</p>
                    <p className="text-sm">Ainda não há faturas emitidas no sistema.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentInvoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-start justify-between p-4 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-muted-foreground/20 transition-colors duration-200">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{invoice.bidder}</p>
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {(() => {
                              // Adaptar exibição baseado no tipo de pagamento
                              const auction = activeAuctions.find(a => `invoice-${a.id}` === invoice.id);
                              if (!auction || !auction.arrematante) return `Parcelas: ${invoice.parcelas} • ${invoice.amount}`;
                              
                              const loteArrematado = auction.lotes?.find((lote: any) => lote.id === auction.arrematante?.loteId);
                              if (!loteArrematado || !loteArrematado.tipoPagamento) {
                                return `Parcelas: ${invoice.parcelas} • ${invoice.amount} por parcela`;
                              }
                              
                              switch (loteArrematado.tipoPagamento) {
                                case 'a_vista':
                                  return `Valor: ${invoice.amount} (à vista)`;
                                case 'entrada_parcelamento':
                                  const parcelasPagas = auction.arrematante.parcelasPagas || 0;
                                  const quantidadeParcelasTotal = auction.arrematante?.quantidadeParcelas || loteArrematado.parcelasPadrao || 12;
                                  if (parcelasPagas === 0) {
                                    // Mostrar entrada + info das parcelas futuras
                                    const valorTotal = auction.arrematante?.valorPagarNumerico || 0;
                                    const valorEntrada = auction.arrematante?.valorEntrada ? parseCurrencyToNumber(auction.arrematante.valorEntrada) : valorTotal * 0.3;
                                    const valorRestante = valorTotal - valorEntrada;
                                    const valorPorParcela = valorRestante / quantidadeParcelasTotal;
                                    return `Entrada: ${currency.format(valorEntrada)} • Parcelas: ${quantidadeParcelasTotal}x ${currency.format(valorPorParcela)}`;
                                  } else {
                                    const parcelasEfetivasPagas = Math.max(0, parcelasPagas - 1);
                                    return `Entrada + ${quantidadeParcelasTotal} parcelas: ${parcelasEfetivasPagas}/${quantidadeParcelasTotal} • ${invoice.amount} por parcela`;
                                  }
                                case 'parcelamento':
                                default:
                                  return `Parcelas: ${invoice.parcelas} • ${invoice.amount} por parcela`;
                              }
                            })()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 font-medium">
                            {(() => {
                              // Adaptar texto de vencimento baseado no tipo de pagamento
                              const auction = activeAuctions.find(a => `invoice-${a.id}` === invoice.id);
                              if (!auction || !auction.arrematante) return `Venc: ${invoice.dueDate}`;
                              
                              const loteArrematado = auction.lotes?.find((lote: any) => lote.id === auction.arrematante?.loteId);
                              const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
                              
                              // Se o pagamento foi confirmado/quitado, mostrar mensagem de confirmação
                              if (auction.arrematante?.pago) {
                                return 'Pagamento confirmado';
                              }
                              
                              if (loteArrematado?.tipoPagamento === 'a_vista') {
                                return `Data pagamento: ${invoice.dueDate}`;
                              } else if (loteArrematado?.tipoPagamento === 'entrada_parcelamento') {
                                  // Calcular qual é a próxima parcela baseada nas já pagas
                                  const quantidadeParcelasTotal = auction.arrematante?.quantidadeParcelas || loteArrematado?.parcelasPadrao || 12;
                                  const mesInicioParcelas = auction.arrematante?.mesInicioPagamento || loteArrematado?.mesInicioPagamento;
                                  const diaVencParcelas = auction.arrematante?.diaVencimentoMensal || loteArrematado?.diaVencimentoPadrao || 15;
                                  
                                  if (parcelasPagas === 0) {
                                    // Entrada pendente + mostrar próxima parcela (1ª parcela após entrada)
                                    let textoVenc = `Venc: ${invoice.dueDate}`;
                                    
                                    if (mesInicioParcelas) {
                                      try {
                                        const [ano, mes] = mesInicioParcelas.split('-');
                                        if (ano && mes && !isNaN(parseInt(ano)) && !isNaN(parseInt(mes))) {
                                          const dataPrimeiraParcela = new Date(parseInt(ano), parseInt(mes) - 1, diaVencParcelas);
                                          if (!isNaN(dataPrimeiraParcela.getTime())) {
                                            textoVenc += ` • Próx parcela: ${dataPrimeiraParcela.toLocaleDateString('pt-BR')}`;
                                          }
                                        }
                                      } catch (error) {
                                        // Se houver erro na conversão, não mostra a data da parcela
                                      }
                                    }
                                    
                                    return textoVenc;
                                  } else if (parcelasPagas < quantidadeParcelasTotal + 1) {
                                    // Entrada já paga, calcular próxima parcela
                                    const proximaParcelaNum = parcelasPagas; // parcelasPagas já conta a entrada
                                    let textoVenc = `Venc. parcela: ${invoice.dueDate}`;
                                    
                                    if (mesInicioParcelas && proximaParcelaNum <= quantidadeParcelasTotal) {
                                      try {
                                        const [ano, mes] = mesInicioParcelas.split('-');
                                        if (ano && mes && !isNaN(parseInt(ano)) && !isNaN(parseInt(mes))) {
                                          // Calcular data da próxima parcela (parcelasPagas-1 porque a entrada já foi paga)
                                          const dataProximaParcela = new Date(parseInt(ano), parseInt(mes) - 1 + (proximaParcelaNum - 1), diaVencParcelas);
                                          if (!isNaN(dataProximaParcela.getTime())) {
                                            textoVenc = `Venc: ${dataProximaParcela.toLocaleDateString('pt-BR')} • ${proximaParcelaNum}ª parcela`;
                                          }
                                        }
                                      } catch (error) {
                                        // Se houver erro na conversão, usa valor padrão
                                      }
                                    }
                                    
                                    return textoVenc;
                                  } else {
                                    return `Venc. parcela: ${invoice.dueDate}`;
                                  }
                              } else {
                                return `Próximo venc: ${invoice.dueDate}`;
                              }
                            })()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Leilão: {invoice.leilao}
                          </p>
                        </div>
                        <Badge variant={getStatusBadge(invoice.status).variant} className="ml-2 flex-shrink-0">
                          {getStatusBadge(invoice.status).label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
                <div className="flex-shrink-0 pt-4">
                  <Button className="w-full h-12 hover:bg-gray-100 hover:text-gray-800 transition-all duration-300 ease-out" variant="outline">
                    <span className="text-sm font-medium">Ver Todas as Faturas</span>
                  </Button>
                </div>
            </CardContent>
          </Card>
        </div>

        {/* Carrossel - Lado direito, altura alinhada */}
        <Card 
          className="lg:row-span-3 h-[calc(100vh-150px)] flex flex-col relative group"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xl">
{(() => {
                  const IconComponent = slides[currentSlide].icon;
                  return <IconComponent className="h-6 w-6" />;
                })()}
                {slides[currentSlide].title}
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  const routes = { leiloes: '/leiloes', inadimplentes: '/inadimplencia', arrematantes: '/arrematantes' };
                  navigate(routes[slides[currentSlide].id as keyof typeof routes]);
                }}
                className="hover:bg-gray-100 hover:text-gray-800 transition-all duration-200"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          
          {/* Controles de navegação nas laterais - aparecem no hover */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-800 transition-all duration-300"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-800 transition-all duration-300"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 relative overflow-hidden">
              <div className={`h-full transition-opacity duration-500 ease-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                {currentSlide === 0 && (
                  // Próximos Leilões
                  nextAuctions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Nenhum leilão agendado</p>
                      <p className="text-sm">Cadastre um novo leilão para começar</p>
                    </div>
                  ) : (
                    <div className="space-y-4 overflow-y-auto max-h-full">
                      {nextAuctions.map((auction) => (
                        <div key={auction.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2 hover:bg-muted/50 hover:border-muted-foreground/20 transition-colors duration-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base truncate">{auction.nome}</p>
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {auction.identificacao && `${auction.identificacao} • `}
                                {auction.dataInicio}
                              </p>
                            </div>
                            <Badge variant={getStatusBadge(auction.status).variant} className="ml-2 flex-shrink-0">
                              {getStatusBadge(auction.status).label}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            Local: {String(auction.local)}{auction.endereco ? ` - ${auction.endereco}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {currentSlide === 1 && (
                  // Inadimplentes
                  overdueArrematantes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <AlertTriangle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Nenhuma inadimplência</p>
                      <p className="text-sm">Todos os pagamentos em dia</p>
                    </div>
                  ) : (
                    <div className="space-y-4 overflow-y-auto max-h-full">
                      {overdueArrematantes.map((auction) => (
                        <div key={auction.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2 hover:bg-muted/50 hover:border-muted-foreground/20 transition-colors duration-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base truncate">
                                {auction.arrematante?.nome || "—"}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {(() => {
                                  // Adaptar texto baseado no tipo de pagamento
                                  const loteArrematado = auction.lotes?.find((lote: any) => lote.id === auction.arrematante?.loteId);
                                  const dataVencimento = getProximaDataVencimento(auction.arrematante, auction);
                                  const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
                                  
                                  // Se o pagamento foi confirmado/quitado, mostrar mensagem de confirmação
                                  if (auction.arrematante?.pago) {
                                    return 'Pagamento confirmado';
                                  }
                                  
                                  if (loteArrematado?.tipoPagamento === 'a_vista') {
                                    return `Data pagamento: ${dataVencimento}`;
                                  } else if (loteArrematado?.tipoPagamento === 'entrada_parcelamento') {
                                     if (parcelasPagas === 0) {
                                       // Mostrar entrada + próxima parcela (1ª parcela após entrada)
                                       // Buscar configurações do arrematante (formulário) ou do lote
                                       const mesInicioParcelas = auction.arrematante?.mesInicioPagamento || loteArrematado?.mesInicioPagamento;
                                       const diaVencParcelas = auction.arrematante?.diaVencimentoMensal || loteArrematado?.diaVencimentoPadrao || 15;
                                       let textoVenc = `Venc: ${dataVencimento}`;
                                       
                                       if (mesInicioParcelas) {
                                         try {
                                           const [ano, mes] = mesInicioParcelas.split('-');
                                           if (ano && mes && !isNaN(parseInt(ano)) && !isNaN(parseInt(mes))) {
                                             const dataPrimeiraParcela = new Date(parseInt(ano), parseInt(mes) - 1, diaVencParcelas);
                                             if (!isNaN(dataPrimeiraParcela.getTime())) {
                                               textoVenc += ` • Próx parcela: ${dataPrimeiraParcela.toLocaleDateString('pt-BR')}`;
                                             }
                                           }
                                         } catch (error) {
                                           // Se houver erro na conversão, não mostra a data da parcela
                                         }
                                       }
                                       
                                       return textoVenc;
                                    } else {
                                      return `Venc. parcela: ${dataVencimento}`;
                                    }
                                  } else {
                                    return `Próximo venc: ${dataVencimento}`;
                                  }
                                })()} • {(() => {
                                  // Calcular valor por parcela baseado no tipo de pagamento do lote
                                  const loteArrematado = auction.lotes?.find((lote: any) => lote.id === auction.arrematante?.loteId);
                                  if (!loteArrematado || !loteArrematado.tipoPagamento) return "R$ 0,00";
                                  
                                  const valorTotal = auction.arrematante?.valorPagarNumerico !== undefined 
                                    ? auction.arrematante.valorPagarNumerico 
                                    : (typeof auction.arrematante?.valorPagar === 'number' ? auction.arrematante.valorPagar : 0);
                                  
                                  let valorPorParcela = 0;
                                  switch (loteArrematado.tipoPagamento) {
                                    case 'a_vista':
                                      return currency.format(valorTotal) + " (à vista)";
                                    case 'entrada_parcelamento':
                                      const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
                                      if (parcelasPagas === 0) {
                                        valorPorParcela = valorTotal * 0.5; // Entrada
                                      } else {
                                        const valorRestante = valorTotal - (valorTotal * 0.5);
                                        valorPorParcela = valorRestante / ((loteArrematado.parcelasPadrao || 1));
                                      }
                                      break;
                                    case 'parcelamento':
                                    default:
                                      valorPorParcela = valorTotal / (loteArrematado.parcelasPadrao || 1);
                                      break;
                                  }
                                  return currency.format(valorPorParcela) + " por parcela";
                                })()}
                              </p>
                            </div>
                            <Badge variant="destructive" className="ml-2 flex-shrink-0">
                              Atrasado
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Leilão: {auction.nome}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {currentSlide === 2 && (
                  // Arrematantes
                  recentArrematantes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Nenhum arrematante encontrado</p>
                      <p className="text-sm">Ainda não há arrematantes cadastrados no sistema.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 overflow-y-auto max-h-full">
                      {recentArrematantes.map((auction) => {
                        const proximoVencimento = getProximaDataVencimento(auction.arrematante, auction);
                        
                        return (
                          <div key={auction.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2 hover:bg-muted/50 hover:border-muted-foreground/20 transition-colors duration-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-base truncate">{auction.arrematante?.nome}</p>
                                <p className="text-sm text-muted-foreground mt-1 truncate">
                                  {(() => {
                                    // Adaptar exibição baseado no tipo de pagamento do lote
                                    const loteArrematado = auction.lotes?.find((lote: any) => lote.id === auction.arrematante?.loteId);
                                    const valorTotal = auction.arrematante?.valorPagarNumerico !== undefined 
                                      ? auction.arrematante.valorPagarNumerico 
                                      : (typeof auction.arrematante?.valorPagar === 'number' ? auction.arrematante.valorPagar : 0);
                                    
                                    if (!loteArrematado || !loteArrematado.tipoPagamento) {
                                      return `Parcelas: ${auction.arrematante?.parcelasPagas || 0}/${auction.arrematante?.quantidadeParcelas || 1} • ${currency.format(valorTotal / (auction.arrematante?.quantidadeParcelas || 1))} por parcela`;
                                    }
                                    
                                    switch (loteArrematado.tipoPagamento) {
                                      case 'a_vista':
                                        return `Valor total: ${currency.format(valorTotal)} (à vista)`;
                                      
                                      case 'entrada_parcelamento': {
                                        const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
                                        const quantidadeParcelasTotal = auction.arrematante?.quantidadeParcelas || loteArrematado.parcelasPadrao || 12;
                                        const valorEntrada = auction.arrematante?.valorEntrada ? 
                                          parseCurrencyToNumber(auction.arrematante.valorEntrada) : 
                                          valorTotal * 0.3; // fallback 30% se não definido
                                        
                                        if (parcelasPagas === 0) {
                                          // Mostra entrada + info das parcelas futuras
                                          const valorRestante = valorTotal - valorEntrada;
                                          const valorPorParcela = valorRestante / quantidadeParcelasTotal;
                                          return `Entrada: ${currency.format(valorEntrada)} • Parcelas: ${quantidadeParcelasTotal}x ${currency.format(valorPorParcela)}`;
                                        } else {
                                          // Mostra parcelas após entrada (parcelasPagas-1 porque a primeira "parcela paga" é a entrada)
                                          const parcelasEfetivasPagas = Math.max(0, parcelasPagas - 1);
                                          const valorRestante = valorTotal - valorEntrada;
                                          const valorPorParcela = valorRestante / quantidadeParcelasTotal;
                                          return `Entrada + ${quantidadeParcelasTotal} parcelas: ${parcelasEfetivasPagas}/${quantidadeParcelasTotal} • ${currency.format(valorPorParcela)} por parcela`;
                                        }
                                      }
                                      
                                      case 'parcelamento':
                                      default: {
                                        const quantidadeParcelas = loteArrematado.parcelasPadrao || 1;
                                        const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
                                        const valorPorParcela = valorTotal / quantidadeParcelas;
                                        return `Parcelas: ${parcelasPagas}/${quantidadeParcelas} • ${currency.format(valorPorParcela)} por parcela`;
                                      }
                                    }
                                  })()}
                                </p>
                                 <p className="text-xs text-muted-foreground mt-1 font-medium">
                                     {(() => {
                                       // Adaptar texto baseado no tipo de pagamento
                                       const loteArrematado = auction.lotes?.find((lote: any) => lote.id === auction.arrematante?.loteId);
                                       const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
                                       
                                       // Se o pagamento foi confirmado/quitado, mostrar mensagem de confirmação
                                       if (auction.arrematante?.pago) {
                                         return 'Pagamento confirmado';
                                       }
                                       
                                       // Se não conseguiu calcular a data, mostrar mensagem de configuração pendente
                                       if (proximoVencimento === "—") {
                                         if (loteArrematado?.tipoPagamento === 'entrada_parcelamento') {
                                           return parcelasPagas === 0 ? "Venc: — • Entrada (configurar data)" : "Venc: — • Parcela (configurar data)";
                                         } else if (loteArrematado?.tipoPagamento === 'a_vista') {
                                           return "Venc: — • À vista (configurar data)";
                                         } else {
                                           return "Venc: — • Parcela (configurar data)";
                                         }
                                       }
                                       
                                       if (loteArrematado?.tipoPagamento === 'a_vista') {
                                         return `Venc: ${proximoVencimento} • Pagamento à vista`;
                                       } else if (loteArrematado?.tipoPagamento === 'entrada_parcelamento') {
                                           const quantidadeParcelasTotal = auction.arrematante?.quantidadeParcelas || loteArrematado?.parcelasPadrao || 12;
                                           
                                           if (parcelasPagas === 0) {
                                             return `Venc: ${proximoVencimento} • Entrada`;
                                           } else if (parcelasPagas < quantidadeParcelasTotal + 1) {
                                             // Entrada já paga, calcular próxima parcela
                                             const proximaParcelaNum = parcelasPagas; // parcelasPagas já conta a entrada
                                             return `Venc: ${proximoVencimento} • ${proximaParcelaNum}ª parcela`;
                                           } else {
                                             return `Venc: ${proximoVencimento} • Finalizado`;
                                           }
                                       } else {
                                         // Parcelamento simples
                                         const proximaParcelaNum = parcelasPagas + 1;
                                         return `Venc: ${proximoVencimento} • ${proximaParcelaNum}ª parcela`;
                                       }
                                     })()}
                                 </p>
                              </div>
                              <Badge 
                                variant={
                                  auction.arrematante?.pago 
                                    ? "default" 
                                    : isOverdue(auction.arrematante, auction) 
                                      ? "destructive" 
                                      : "warning"
                                } 
                                className="ml-2 flex-shrink-0"
                              >
                                {auction.arrematante?.pago 
                                  ? "Pago" 
                                  : isOverdue(auction.arrematante, auction) 
                                    ? "Atrasado" 
                                    : "Em Aberto"
                                }
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Leilão: {auction.nome}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="flex-shrink-0 pt-6">
              <Button 
                className="w-full h-12 hover:bg-gray-100 hover:text-gray-800 transition-all duration-300 ease-out" 
                variant="outline" 
                onClick={() => {
                  const routes = { leiloes: '/leiloes', inadimplentes: '/inadimplencia', arrematantes: '/arrematantes' };
                  navigate(routes[slides[currentSlide].id as keyof typeof routes]);
                }}
              >
                <span className="text-sm font-medium">Ver Todos os {slides[currentSlide].title}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}