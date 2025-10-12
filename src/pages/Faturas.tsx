import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import html2pdf from 'html2pdf.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Search, Eye, Trash2, Receipt, 
  Calendar, DollarSign, FileText, Check, X, MoreHorizontal, 
  Archive, Download, ArrowLeft
} from "lucide-react";
import { Invoice, InvoiceStatus } from "@/lib/types";
import { useSupabaseAuctions } from "@/hooks/use-supabase-auctions";
import { useToast } from "@/hooks/use-toast";

interface FaturaExtendida extends Invoice {
  leilaoNome: string;
  loteNumero: string;
  arrematanteNome: string;
  diasVencimento: number;
  statusFatura: InvoiceStatus;
  arquivado?: boolean;
  parcela?: number;
  totalParcelas?: number;
  dataVencimento?: string;
  dataPagamento?: string;
  valorTotal?: number;
  observacoes?: string;
  createdAt?: string;
  updatedAt?: string;
  tipoPagamento?: "a_vista" | "parcelamento" | "entrada_parcelamento";
}


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

// Função para normalizar mesInicioPagamento para formato YYYY-MM
const normalizarMesInicioPagamento = (mesInicioPagamento: string): string => {
  if (!mesInicioPagamento) return '';
  
  // Se já está no formato correto (YYYY-MM), retornar como está
  if (mesInicioPagamento.includes('-') && mesInicioPagamento.split('-').length === 2) {
    return mesInicioPagamento;
  }
  
  // Se veio apenas o mês (ex: "11"), adicionar o ano atual
  const anoAtual = new Date().getFullYear();
  return `${anoAtual}-${mesInicioPagamento.padStart(2, '0')}`;
};

function Faturas() {
  const navigate = useNavigate();
  const { auctions, isLoading } = useSupabaseAuctions();
  const { toast } = useToast();
  
  // Estados para Faturas
  const [searchTermFaturas, setSearchTermFaturas] = useState("");
  const [searchInputValueFaturas, setSearchInputValueFaturas] = useState("");
  const [statusFilterFaturas, setStatusFilterFaturas] = useState<string>("todos");
  const [isFaturaModalOpen, setIsFaturaModalOpen] = useState(false);
  const [isEditingFatura, setIsEditingFatura] = useState(false);
  const [selectedFatura, setSelectedFatura] = useState<FaturaExtendida | null>(null);
  const [isViewFaturaModalOpen, setIsViewFaturaModalOpen] = useState(false);
  const [isTransitioningFaturas, setIsTransitioningFaturas] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedFaturas, setArchivedFaturas] = useState<Set<string>>(new Set());

  // Refs para debounce
  const searchTimeoutFaturas = useRef<NodeJS.Timeout>();

  // Form states
  const [faturaForm, setFaturaForm] = useState({
    lotId: "",
    auctionId: "",
    arrematanteId: "",
    valorArremate: "",
    comissao: "",
    custosAdicionais: "",
    valorLiquido: "",
    vencimento: "",
    status: "em_aberto" as InvoiceStatus
  });

  // Função para calcular próxima data de vencimento baseada no sistema de parcelas (DESABILITADA - usando lógica específica por lote)
  const calculateNextPaymentDate = (arrematante: any) => {
    // Esta função foi desabilitada pois agora usamos configurações específicas por lote
    return null;
  };

  // Função para determinar status da fatura baseado na data atual e parcelas
  const getInvoiceStatus = (arrematante: any, parcelaIndex: number, dueDate: Date): InvoiceStatus => {
    const parcelasPagas = arrematante.parcelasPagas || 0;
    const today = new Date();
    
    // Se a parcela já foi paga
    if (parcelaIndex < parcelasPagas) {
      return "pago";
    }
    
    // Data de vencimento da parcela específica com horário até final do dia
    const endOfDueDate = new Date(dueDate);
    endOfDueDate.setHours(23, 59, 59, 999);
    
    // Se passou da data de vencimento e não foi paga
    if (today > endOfDueDate) {
      return "atrasado";
    }
    
    return "em_aberto";
  };

  // Gerar faturas automaticamente baseadas nos arrematantes dos leilões - considera tipos de pagamento específicos por lote
  const generateFaturasFromLeiloes = (): FaturaExtendida[] => {
    const faturas: FaturaExtendida[] = [];
    
    auctions.forEach(auction => {
      if (auction.arrematante && !auction.arquivado) {
        const arrematante = auction.arrematante;
        
        // Encontrar o lote específico que o arrematante arrematou
        const loteArrematado = (auction.lotes || []).find(lote => lote.id === arrematante.loteId);
        
        // Se não encontrou o lote ou não tem tipo de pagamento configurado, pular
        if (!loteArrematado || !loteArrematado.tipoPagamento) {
          return;
        }
        
        const tipoPagamento = loteArrematado.tipoPagamento;
        const valorTotal = arrematante.valorPagarNumerico || 0;
        
        // Gerar faturas baseadas no tipo de pagamento do lote específico
        switch (tipoPagamento) {
          case 'a_vista': {
            // À vista: apenas uma fatura com a data específica
            // CORREÇÃO: Evitar problema de fuso horário do JavaScript
            const dateStr = loteArrematado.dataVencimentoVista || new Date().toISOString().split('T')[0];
            const [year, month, day] = dateStr.split('-').map(Number);
            
            // Validar se os valores de data são válidos
            if (isNaN(year) || isNaN(month) || isNaN(day)) {
              console.error('Data de vencimento à vista inválida:', {
                dateStr,
                year,
                month,
                day,
                loteId: loteArrematado.id
              });
              break; // Sair do case
            }
            
            const dueDateObj = new Date(year, month - 1, day); // month é zero-indexed
            
            // Validar se a data criada é válida
            if (isNaN(dueDateObj.getTime())) {
              console.error('Data objeto inválida criada para à vista:', {
                year,
                month,
                day
              });
              break; // Sair do case
            }
            
            faturas.push({
              id: `${auction.id}-avista`,
              auctionId: auction.id,
              lotId: loteArrematado.id || '',
              arrematanteId: arrematante.documento || `${auction.id}-${arrematante.nome}`,
              valorArremate: valorTotal,
              valorLiquido: valorTotal,
              vencimento: dateStr,
              parcela: 1,
              totalParcelas: 1,
              valorTotal: valorTotal,
              dataVencimento: dateStr,
              dataPagamento: undefined,
              status: getInvoiceStatus(arrematante, 0, dueDateObj),
              observacoes: `Pagamento à vista - ${auction.identificacao || auction.nome}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              leilaoNome: auction.nome || auction.identificacao || 'Leilão sem nome',
              loteNumero: loteArrematado.numero || 'Sem número',
              arrematanteNome: arrematante.nome,
              diasVencimento: Math.ceil((dueDateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
              statusFatura: getInvoiceStatus(arrematante, 0, dueDateObj),
              arquivado: archivedFaturas.has(`${auction.id}-avista`),
              tipoPagamento: 'a_vista'
            });
            break;
          }
          
          case 'entrada_parcelamento': {
            // Entrada + Parcelamento: gerar todas as parcelas (entrada + parcelas mensais)
            const quantidadeParcelasTotal = arrematante.quantidadeParcelas || loteArrematado.parcelasPadrao || 12;
            const quantidadeParcelas = quantidadeParcelasTotal + 1; // Total incluindo entrada
            const valorEntrada = arrematante.valorEntrada ? parseCurrencyToNumber(arrematante.valorEntrada) : valorTotal * 0.3;
            const valorRestante = valorTotal - valorEntrada;
            const valorParcela = valorRestante / quantidadeParcelasTotal;
            const parcelasPagas = arrematante.parcelasPagas || 0;
            
            // Gerar fatura da entrada
            const dataEntrada = loteArrematado.dataEntrada || new Date().toISOString().split('T')[0];
            const dueDateObjEntrada = new Date(dataEntrada);
            
            // Validar se a data de entrada é válida
            if (isNaN(dueDateObjEntrada.getTime())) {
              console.error('Data de entrada inválida:', {
                dataEntrada,
                loteId: loteArrematado.id
              });
              break; // Sair do case
            }
            
            faturas.push({
              id: `${auction.id}-entrada`,
              auctionId: auction.id,
              lotId: loteArrematado.id || '',
              arrematanteId: arrematante.documento || `${auction.id}-${arrematante.nome}`,
              valorArremate: valorTotal,
              valorLiquido: valorTotal,
              vencimento: dataEntrada,
              parcela: 1,
              totalParcelas: quantidadeParcelas,
              valorTotal: valorTotal,
              dataVencimento: dataEntrada,
              dataPagamento: parcelasPagas > 0 ? dataEntrada : undefined,
              status: parcelasPagas > 0 ? 'pago' : getInvoiceStatus(arrematante, 0, dueDateObjEntrada),
              observacoes: `Entrada - ${auction.identificacao || auction.nome}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              leilaoNome: auction.nome || auction.identificacao || 'Leilão sem nome',
              loteNumero: loteArrematado.numero || 'Sem número',
              arrematanteNome: arrematante.nome,
              diasVencimento: Math.ceil((dueDateObjEntrada.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
              statusFatura: parcelasPagas > 0 ? 'pago' : getInvoiceStatus(arrematante, 0, dueDateObjEntrada),
              arquivado: archivedFaturas.has(`${auction.id}-entrada`),
              tipoPagamento: 'entrada_parcelamento'
            });
            
            // Gerar todas as parcelas mensais
            const mesInicioPagamento = arrematante.mesInicioPagamento || loteArrematado.mesInicioPagamento;
            const diaVencimento = arrematante.diaVencimentoMensal || loteArrematado.diaVencimentoPadrao;
            
            if (mesInicioPagamento && diaVencimento) {
              const mesInicioPagamentoNormalizado = normalizarMesInicioPagamento(mesInicioPagamento);
              const [startYear, startMonth] = mesInicioPagamentoNormalizado.split('-').map(Number);
              
              // Validar se os valores de data são válidos
              if (isNaN(startYear) || isNaN(startMonth) || isNaN(diaVencimento)) {
                console.error('Valores de data inválidos para entrada+parcelamento:', {
                  startYear,
                  startMonth,
                  diaVencimento,
                  mesInicioPagamento,
                  mesInicioPagamentoNormalizado
                });
                break; // Sair do case
              }
              
              for (let i = 0; i < quantidadeParcelasTotal; i++) {
                const parcelaNumero = i + 1; // Número da parcela (1, 2, 3...)
                const dueDate = new Date(startYear, startMonth - 1 + i, diaVencimento);
                
                // Validar se a data criada é válida
                if (isNaN(dueDate.getTime())) {
                  console.error('Data de vencimento inválida criada para entrada+parcelamento:', {
                    startYear,
                    startMonth,
                    i,
                    diaVencimento
                  });
                  continue; // Pular esta parcela
                }
                
                const jaPaga = parcelasPagas > parcelaNumero; // Se já pagou essa parcela
                
                faturas.push({
                  id: `${auction.id}-parcela-${parcelaNumero}`,
                  auctionId: auction.id,
                  lotId: loteArrematado.id || '',
                  arrematanteId: arrematante.documento || `${auction.id}-${arrematante.nome}`,
                  valorArremate: valorTotal,
                  valorLiquido: valorTotal,
                  vencimento: dueDate.toISOString().split('T')[0],
                  parcela: parcelaNumero + 1, // +1 porque a entrada é a parcela 1
                  totalParcelas: quantidadeParcelas,
                  valorTotal: valorTotal,
                  dataVencimento: dueDate.toISOString().split('T')[0],
                  dataPagamento: jaPaga ? dueDate.toISOString().split('T')[0] : undefined,
                  status: jaPaga ? 'pago' : getInvoiceStatus(arrematante, parcelaNumero, dueDate),
                  observacoes: `Parcela ${parcelaNumero + 1} de ${quantidadeParcelas} - ${auction.identificacao || auction.nome}`,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  leilaoNome: auction.nome || auction.identificacao || 'Leilão sem nome',
                  loteNumero: loteArrematado.numero || 'Sem número',
                  arrematanteNome: arrematante.nome,
                  diasVencimento: Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
                  statusFatura: jaPaga ? 'pago' : getInvoiceStatus(arrematante, parcelaNumero, dueDate),
                  arquivado: archivedFaturas.has(`${auction.id}-parcela-${parcelaNumero}`),
                  tipoPagamento: 'entrada_parcelamento'
                });
              }
            }
            break;
          }
          
          case 'parcelamento':
          default: {
            // Parcelamento tradicional: gerar APENAS a próxima parcela pendente (uma por vez)
            if (!loteArrematado.parcelasPadrao || !loteArrematado.mesInicioPagamento || !loteArrematado.diaVencimentoPadrao) return;
            
            const quantidadeParcelas = loteArrematado.parcelasPadrao;
            const valorParcela = valorTotal / quantidadeParcelas;
            const parcelasPagas = arrematante.parcelasPagas || 0;
            
            // Se já pagou todas as parcelas, não gerar nenhuma fatura
            if (parcelasPagas >= quantidadeParcelas) return;
            
            const mesInicioPagamentoNormalizado = normalizarMesInicioPagamento(loteArrematado.mesInicioPagamento);
            const [startYear, startMonth] = mesInicioPagamentoNormalizado.split('-').map(Number);
            
            // Validar se os valores de data são válidos
            if (isNaN(startYear) || isNaN(startMonth) || isNaN(loteArrematado.diaVencimentoPadrao)) {
              console.error('Valores de data inválidos no lote:', {
                startYear,
                startMonth,
                diaVencimentoPadrao: loteArrematado.diaVencimentoPadrao,
                mesInicioPagamento: loteArrematado.mesInicioPagamento,
                mesInicioPagamentoNormalizado
              });
              return;
            }
            
            // Gerar apenas a próxima parcela não paga
            const i = parcelasPagas; // Índice da próxima parcela (0-based)
            const parcelaNumero = parcelasPagas + 1; // Número da próxima parcela (1-based)
            const dueDate = new Date(startYear, startMonth - 1 + i, loteArrematado.diaVencimentoPadrao);
            
            // Validar se a data criada é válida
            if (isNaN(dueDate.getTime())) {
              console.error('Data de vencimento inválida criada:', {
                startYear,
                startMonth,
                i,
                diaVencimentoPadrao: loteArrematado.diaVencimentoPadrao
              });
              return;
            }
            
            // Gerar apenas esta parcela
            faturas.push({
              id: `${auction.id}-parcela-${parcelaNumero}`,
              auctionId: auction.id,
              lotId: loteArrematado.id || '',
              arrematanteId: arrematante.documento || `${auction.id}-${arrematante.nome}`,
              valorArremate: valorTotal,
              valorLiquido: valorParcela,
              vencimento: dueDate.toISOString().split('T')[0],
              parcela: parcelaNumero,
              totalParcelas: quantidadeParcelas,
              valorTotal: valorParcela,
              dataVencimento: dueDate.toISOString().split('T')[0],
              dataPagamento: undefined,
              status: getInvoiceStatus(arrematante, i, dueDate),
              observacoes: `Parcela ${parcelaNumero} de ${quantidadeParcelas} - ${auction.identificacao || auction.nome}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              leilaoNome: auction.nome || auction.identificacao || 'Leilão sem nome',
              loteNumero: loteArrematado.numero || 'Sem número',
              arrematanteNome: arrematante.nome,
              diasVencimento: Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
              statusFatura: getInvoiceStatus(arrematante, i, dueDate),
              arquivado: archivedFaturas.has(`${auction.id}-parcela-${parcelaNumero}`),
              tipoPagamento: 'parcelamento'
            });
            
            break;
          }
        }
      }
    });
    
    return faturas.sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());
  };

  // Gerar faturas automaticamente a partir dos dados dos leilões
  const faturasList = generateFaturasFromLeiloes();

  // Debounce para busca de faturas
  useEffect(() => {
    if (searchTimeoutFaturas.current) {
      clearTimeout(searchTimeoutFaturas.current);
    }
    searchTimeoutFaturas.current = setTimeout(() => {
      setSearchTermFaturas(searchInputValueFaturas);
    }, 800);

    return () => {
      if (searchTimeoutFaturas.current) {
        clearTimeout(searchTimeoutFaturas.current);
      }
    };
  }, [searchInputValueFaturas]);

  // Filtros de faturas
  const filteredFaturas = faturasList
    .filter(fatura => {
      const matchesSearch = !searchTermFaturas || 
        fatura.loteNumero.toLowerCase().includes(searchTermFaturas.toLowerCase()) ||
        fatura.arrematanteNome.toLowerCase().includes(searchTermFaturas.toLowerCase()) ||
        fatura.leilaoNome.toLowerCase().includes(searchTermFaturas.toLowerCase());
      
      const matchesStatus = statusFilterFaturas === "todos" || fatura.status === statusFilterFaturas;
      const matchesArchived = showArchived ? fatura.arquivado === true : fatura.arquivado !== true;
      
      return matchesSearch && matchesStatus && matchesArchived;
    })
    .sort((a, b) => {
      // Ordenar por status: não quitadas primeiro, depois quitadas
      const aQuitada = a.status === "pago" ? 1 : 0;
      const bQuitada = b.status === "pago" ? 1 : 0;
      
      if (aQuitada !== bQuitada) {
        return aQuitada - bQuitada; // Não quitadas (0) vêm antes de quitadas (1)
      }
      
      // Se ambas têm o mesmo status, ordenar por data de vencimento
      return new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime();
    });

  // Função para calcular juros progressivos mês a mês
  const calcularJurosProgressivos = (valorOriginal: number, percentualJuros: number, mesesAtraso: number) => {
    if (mesesAtraso < 1 || !percentualJuros) {
      return valorOriginal;
    }

    let valorAtual = valorOriginal;
    const taxaMensal = percentualJuros / 100;
    
    // Aplicar juros mês a mês de forma progressiva
    for (let mes = 1; mes <= mesesAtraso; mes++) {
      const jurosMes = valorAtual * taxaMensal;
      valorAtual = valorAtual + jurosMes;
    }
    
    return Math.round(valorAtual * 100) / 100;
  };

  // Função para calcular valor TOTAL do leilão (entrada + todas as parcelas) com juros se houver atraso
  const calcularValorTotalLeilaoComJuros = (fatura: FaturaExtendida) => {
    const now = new Date();
    
    // Encontrar o arrematante para obter informações completas
    const auction = auctions.find(a => a.id === fatura.auctionId);
    const arrematante = auction?.arrematante;
    
    if (!arrematante) {
      return fatura.valorTotal || fatura.valorLiquido;
    }
    
    const loteArrematado = auction.lotes?.find((lote: any) => lote.id === arrematante.loteId);
    const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento || "parcelamento";
    let valorTotalComJuros = 0;

    if (tipoPagamento === "a_vista") {
      // À vista: valor total com juros se atrasado
      const dataVencimento = loteArrematado?.dataVencimentoVista;
      if (dataVencimento) {
        const vencimento = new Date(dataVencimento + 'T23:59:59');
        if (now > vencimento && arrematante?.percentualJurosAtraso) {
          const mesesAtraso = Math.max(0, Math.floor((now.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24 * 30)));
          if (mesesAtraso >= 1) {
            valorTotalComJuros = calcularJurosProgressivos(arrematante.valorPagarNumerico, arrematante.percentualJurosAtraso, mesesAtraso);
          } else {
            valorTotalComJuros = arrematante.valorPagarNumerico;
          }
        } else {
          valorTotalComJuros = arrematante.valorPagarNumerico;
        }
      } else {
        valorTotalComJuros = arrematante.valorPagarNumerico;
      }
    } else if (tipoPagamento === "entrada_parcelamento") {
      // Entrada + Parcelamento: calcular entrada + todas as parcelas com juros se atrasadas
      const valorEntrada = arrematante.valorEntrada ? 
        parseCurrencyToNumber(arrematante.valorEntrada) : 
        arrematante.valorPagarNumerico * 0.3;
      const valorParcelas = arrematante.valorPagarNumerico - valorEntrada;
      const quantidadeParcelas = arrematante.quantidadeParcelas || 12;
      const valorPorParcela = valorParcelas / quantidadeParcelas;
      const parcelasPagas = arrematante.parcelasPagas || 0;

      // Calcular valor da entrada (com juros se atrasada)
      if (parcelasPagas === 0) {
        // Entrada ainda não foi paga - verificar se está atrasada
        if (loteArrematado?.dataEntrada) {
          const dataEntrada = new Date(loteArrematado.dataEntrada + 'T23:59:59');
          if (now > dataEntrada && arrematante?.percentualJurosAtraso) {
            const mesesAtraso = Math.max(0, Math.floor((now.getTime() - dataEntrada.getTime()) / (1000 * 60 * 60 * 24 * 30)));
            if (mesesAtraso >= 1) {
              valorTotalComJuros += calcularJurosProgressivos(valorEntrada, arrematante.percentualJurosAtraso, mesesAtraso);
            } else {
              valorTotalComJuros += valorEntrada;
            }
          } else {
            valorTotalComJuros += valorEntrada;
          }
        } else {
          valorTotalComJuros += valorEntrada;
        }
      }

      // Calcular valor de todas as parcelas (com juros se atrasadas)
      const parcelasEfetivasPagas = parcelasPagas > 0 ? Math.max(0, parcelasPagas - 1) : 0;
      
      if (arrematante.mesInicioPagamento && arrematante.diaVencimentoMensal) {
        const mesNormalizado = normalizarMesInicioPagamento(arrematante.mesInicioPagamento);
        const [startYear, startMonth] = mesNormalizado.split('-').map(Number);
        
        for (let i = parcelasEfetivasPagas; i < quantidadeParcelas; i++) {
          const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal, 23, 59, 59);
          if (now > parcelaDate && arrematante?.percentualJurosAtraso) {
            const mesesAtraso = Math.max(0, Math.floor((now.getTime() - parcelaDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
            if (mesesAtraso >= 1) {
              valorTotalComJuros += calcularJurosProgressivos(valorPorParcela, arrematante.percentualJurosAtraso, mesesAtraso);
            } else {
              valorTotalComJuros += valorPorParcela;
            }
          } else {
            valorTotalComJuros += valorPorParcela;
          }
        }
      } else {
        // Se não tem dados de vencimento, somar valor restante sem juros
        valorTotalComJuros += (quantidadeParcelas - parcelasEfetivasPagas) * valorPorParcela;
      }
    } else {
      // Parcelamento simples: calcular todas as parcelas com juros se atrasadas
      const quantidadeParcelas = arrematante.quantidadeParcelas || 12;
      const valorPorParcela = arrematante.valorPagarNumerico / quantidadeParcelas;
      const parcelasPagas = arrematante.parcelasPagas || 0;
      
      if (arrematante.mesInicioPagamento && arrematante.diaVencimentoMensal) {
        const mesNormalizado = normalizarMesInicioPagamento(arrematante.mesInicioPagamento);
        const [startYear, startMonth] = mesNormalizado.split('-').map(Number);
        
        for (let i = parcelasPagas; i < quantidadeParcelas; i++) {
          const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal, 23, 59, 59);
          if (now > parcelaDate && arrematante?.percentualJurosAtraso) {
            const mesesAtraso = Math.max(0, Math.floor((now.getTime() - parcelaDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
            if (mesesAtraso >= 1) {
              valorTotalComJuros += calcularJurosProgressivos(valorPorParcela, arrematante.percentualJurosAtraso, mesesAtraso);
            } else {
              valorTotalComJuros += valorPorParcela;
            }
          } else {
            valorTotalComJuros += valorPorParcela;
          }
        }
      } else {
        // Se não tem dados de vencimento, somar valor restante sem juros
        valorTotalComJuros += (quantidadeParcelas - parcelasPagas) * valorPorParcela;
      }
    }
    
    return Math.round(valorTotalComJuros * 100) / 100;
  };

  // Função para calcular TOTAL a receber (todas as parcelas pendentes + juros de atraso)
  const calcularTotalAReceber = () => {
    const now = new Date();
    
    return auctions
      .filter(auction => auction.arrematante && !auction.arrematante.pago && !auction.arquivado)
      .reduce((total, auction) => {
        const arrematante = auction.arrematante;
        const loteArrematado = auction.lotes?.find((lote: any) => lote.id === arrematante.loteId);
        const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento || "parcelamento";
        let valorAReceber = 0;

        if (tipoPagamento === "a_vista") {
          // À vista: valor total com juros se atrasado
          const dataVencimento = loteArrematado?.dataVencimentoVista;
          if (dataVencimento) {
            const vencimento = new Date(dataVencimento + 'T23:59:59');
            if (now > vencimento && arrematante?.percentualJurosAtraso) {
              const mesesAtraso = Math.max(0, Math.floor((now.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24 * 30)));
              if (mesesAtraso >= 1) {
                valorAReceber = calcularJurosProgressivos(arrematante.valorPagarNumerico, arrematante.percentualJurosAtraso, mesesAtraso);
              } else {
                valorAReceber = arrematante.valorPagarNumerico;
              }
            } else {
              valorAReceber = arrematante.valorPagarNumerico;
            }
          } else {
            valorAReceber = arrematante.valorPagarNumerico;
          }
        } else if (tipoPagamento === "entrada_parcelamento") {
          // Entrada + Parcelamento
          const valorEntrada = arrematante.valorEntrada ? 
            parseCurrencyToNumber(arrematante.valorEntrada) : 
            arrematante.valorPagarNumerico * 0.3;
          const valorParcelas = arrematante.valorPagarNumerico - valorEntrada;
          const quantidadeParcelas = arrematante.quantidadeParcelas || 12;
          const valorPorParcela = valorParcelas / quantidadeParcelas;
          const parcelasPagas = arrematante.parcelasPagas || 0;

          // Se entrada não foi paga
          if (parcelasPagas === 0) {
            // Verificar se entrada está atrasada
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
            if (arrematante.mesInicioPagamento && arrematante.diaVencimentoMensal) {
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
              // Se não tem dados de vencimento, somar valor total das parcelas sem juros
            valorAReceber += valorParcelas;
            }
          } else {
            // Entrada já paga, calcular parcelas restantes
            const parcelasEfetivasPagas = Math.max(0, parcelasPagas - 1);
            
            if (arrematante.mesInicioPagamento && arrematante.diaVencimentoMensal) {
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
              // Se não tem dados de vencimento, somar valor restante sem juros
              valorAReceber += (quantidadeParcelas - parcelasEfetivasPagas) * valorPorParcela;
            }
          }
        } else {
          // Parcelamento simples
          const quantidadeParcelas = arrematante.quantidadeParcelas || 12;
          const valorPorParcela = arrematante.valorPagarNumerico / quantidadeParcelas;
          const parcelasPagas = arrematante.parcelasPagas || 0;
          
          if (arrematante.mesInicioPagamento && arrematante.diaVencimentoMensal) {
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
            // Se não tem dados de vencimento, somar valor restante sem juros
            valorAReceber += (quantidadeParcelas - parcelasPagas) * valorPorParcela;
          }
        }

        return Math.round((total + valorAReceber) * 100) / 100;
      }, 0);
  };

  // Estatísticas de faturas (apenas não arquivadas)
  const faturasAtivas = faturasList.filter(f => !f.arquivado);
  const statsFaturas = {
    total: faturasAtivas.length,
    emAberto: faturasAtivas.filter(f => f.status === "em_aberto").length,
    pagas: faturasAtivas.filter(f => f.status === "pago").length,
    atrasadas: faturasAtivas.filter(f => f.status === "atrasado").length,
    valorTotal: faturasAtivas.reduce((sum, f) => sum + f.valorLiquido, 0),
    valorPendente: calcularTotalAReceber()
  };

  // Funções de manipulação
  const handleSmoothTransitionFaturas = (callback: () => void) => {
    setIsTransitioningFaturas(true);
    setTimeout(() => {
      callback();
      setTimeout(() => setIsTransitioningFaturas(false), 50);
    }, 150);
  };

  const resetFaturaForm = () => {
    setFaturaForm({
      lotId: "",
      auctionId: "",
      arrematanteId: "",
      valorArremate: "",
      comissao: "",
      custosAdicionais: "",
      valorLiquido: "",
      vencimento: "",
      status: "em_aberto"
    });
  };


  const handleEditFatura = (fatura: FaturaExtendida) => {
    setFaturaForm({
      lotId: fatura.lotId,
      auctionId: fatura.auctionId,
      arrematanteId: fatura.arrematanteId,
      valorArremate: fatura.valorLiquido.toString(),
      comissao: "0",
      custosAdicionais: "0",
      valorLiquido: fatura.valorLiquido.toString(),
      vencimento: fatura.dataVencimento,
      status: fatura.status
    });
    setSelectedFatura(fatura);
    setIsEditingFatura(true);
    setIsFaturaModalOpen(true);
  };

  const handleDeleteFatura = (faturaId: string) => {
    // Implementar exclusão da fatura
    console.log("Excluir fatura:", faturaId);
    
    // Em um sistema real, você faria uma chamada para a API para deletar
    // Por exemplo:
    // await deleteFaturaFromDatabase(faturaId);
    
    // Por enquanto, apenas remove da lista local (mock)
    handleSmoothTransitionFaturas(() => {
      console.log(`Fatura ${faturaId} excluída com sucesso`);
      // A lista será regenerada automaticamente na próxima renderização
    });
  };

  // Estado para preview modal da fatura
  const [isFaturaPreviewOpen, setIsFaturaPreviewOpen] = useState(false);
  const [selectedFaturaForPreview, setSelectedFaturaForPreview] = useState<FaturaExtendida | null>(null);

  const handleDownloadFatura = (faturaId: string) => {
    const fatura = faturasList.find(f => f.id === faturaId);
    if (!fatura) return;

    setSelectedFaturaForPreview(fatura);
    setIsFaturaPreviewOpen(true);
  };

  // Estado para modal temporário invisível (igual aos relatórios)
  const [isExportFaturaModalOpen, setIsExportFaturaModalOpen] = useState(false);

  const handleDownloadFromPreview = async () => {
    if (!selectedFaturaForPreview) return;

    try {
      console.log('🔍 Iniciando geração do PDF da fatura...');
      
      // 1. Abrir modal temporário invisível (igual aos relatórios)
      setIsExportFaturaModalOpen(true);
      
      // 2. Aguardar renderização do componente React (igual aos relatórios)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. Pegar o elemento que foi renderizado pelo React (igual aos relatórios)
      const element = document.getElementById('fatura-pdf-content');
      if (!element) {
        throw new Error('Elemento PDF da fatura não encontrado - modal não renderizou');
      }

      console.log('📄 Elemento da fatura encontrado:', element);
      console.log('📐 Dimensões:', element.offsetWidth, 'x', element.offsetHeight);

      // 4. Usar html2pdf importado estaticamente

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `fatura-lote-${selectedFaturaForPreview.loteNumero}-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as const
        }
      };

      console.log('🔄 Iniciando conversão da fatura para PDF...');
      
      // 5. Gerar PDF do elemento renderizado pelo React (igual aos relatórios)
      await html2pdf().set(opt).from(element).save();
      
      console.log('✅ PDF da fatura gerado com sucesso!');

      toast({
        title: "PDF Gerado",
        description: `Fatura do lote #${selectedFaturaForPreview.loteNumero} foi baixada.`,
        duration: 4000,
      });
      
    } catch (error) {
      console.error('❌ Erro ao gerar PDF da fatura:', error);
      toast({
        title: "Erro ao Gerar PDF",
        description: "Ocorreu um erro ao gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      // Sempre fechar o modal no final
      setIsExportFaturaModalOpen(false);
      setSelectedFaturaForPreview(null);
    }

    setIsFaturaPreviewOpen(false);
  };


  const handleArchiveFatura = (faturaId: string) => {
    setArchivedFaturas(prev => new Set(prev).add(faturaId));
    handleSmoothTransitionFaturas(() => {
      console.log(`Fatura ${faturaId} arquivada com sucesso`);
    });
  };

  const handleUnarchiveFatura = (faturaId: string) => {
    setArchivedFaturas(prev => {
      const newSet = new Set(prev);
      newSet.delete(faturaId);
      return newSet;
    });
    handleSmoothTransitionFaturas(() => {
      console.log(`Fatura ${faturaId} desarquivada com sucesso`);
    });
  };

  const handleSaveFatura = () => {
    // Validar campos obrigatórios
    if (!faturaForm.arrematanteId || !faturaForm.valorLiquido) {
      console.error("Campos obrigatórios não preenchidos");
      return;
    }

    // Implementar salvamento da fatura
    const faturaData = {
      ...faturaForm,
      valorLiquido: parseFloat(faturaForm.valorLiquido.replace(',', '.')),
      id: isEditingFatura ? selectedFatura?.id : `fatura-${Date.now()}`
    };

    if (isEditingFatura) {
      console.log("Atualizando fatura:", faturaData);
      // Em um sistema real: await updateFatura(faturaData);
    } else {
      console.log("Criando nova fatura:", faturaData);
      // Em um sistema real: await createFatura(faturaData);
    }

    // Fechar modal e resetar formulário
    setIsFaturaModalOpen(false);
    resetFaturaForm();
    setSelectedFatura(null);
    setIsEditingFatura(false);

    // Aplicar transição suave
    handleSmoothTransitionFaturas(() => {
      console.log("Fatura salva com sucesso");
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para gerar texto adequado baseado no tipo de pagamento
  const getPaymentTypeDisplay = (fatura: FaturaExtendida) => {
    if (!fatura.tipoPagamento) {
      // Fallback para faturas sem tipo definido
      return `Parcela ${fatura.parcela}/${fatura.totalParcelas}`;
    }

    switch (fatura.tipoPagamento) {
      case 'a_vista':
        return 'Pagamento à Vista';
      
      case 'entrada_parcelamento':
        if (fatura.parcela === 1) {
          return 'Entrada + Parcelamento';
        } else {
          return `Entrada + Parcelamento (Parcela ${fatura.parcela - 1}/${fatura.totalParcelas - 1})`;
        }
      
      case 'parcelamento':
      default:
        return `Parcela ${fatura.parcela}/${fatura.totalParcelas}`;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'em_aberto':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pago':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'atrasado':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'em_aberto':
        return 'Em Aberto';
      case 'pago':
        return 'Pago';
      case 'atrasado':
        return 'Atrasado';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6 p-6 zoom-in-subtle">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Faturas</h1>
          <p className="text-gray-600 mt-1">Gerencie as faturas de arrematação dos leilões</p>
        </div>
      </div>

      {/* Indicadores Gerais - Faturas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-0 shadow-sm rounded-lg p-6">
          <div className="text-center">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Total de Faturas</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
            <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{statsFaturas.total}</p>
            <p className="text-sm text-gray-600 font-medium">Emitidas</p>
          </div>
        </div>

        <div className="bg-white border-0 shadow-sm rounded-lg p-6">
          <div className="text-center">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Pendentes</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
            <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{statsFaturas.emAberto + statsFaturas.atrasadas}</p>
            <p className="text-sm text-gray-600 font-medium">Pendentes</p>
          </div>
        </div>

        <div className="bg-white border-0 shadow-sm rounded-lg p-6">
          <div className="text-center">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Pagas</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
            <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{statsFaturas.pagas}</p>
            <p className="text-sm text-gray-600 font-medium">Quitadas</p>
          </div>
        </div>

        <div className="bg-white border-0 shadow-sm rounded-lg p-6">
          <div className="text-center">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Valor Pendente</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
            <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{formatCurrency(statsFaturas.valorPendente)}</p>
            <p className="text-sm text-gray-600 font-medium">A Receber</p>
          </div>
        </div>
      </div>

      {/* Card de Faturas */}
      <Card className="border-0 shadow-sm h-[calc(100vh-320px)]">
        <CardHeader className="pb-4">
          <div className="space-y-4">
            <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Receipt className="h-5 w-5 text-gray-600" />
              </div>
              {showArchived ? "Faturas Arquivadas" : "Faturas Emitidas"}
            </CardTitle>

            <div className="flex flex-col lg:flex-row gap-4">
              {/* Barra de pesquisa à esquerda */}
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por lote, arrematante ou leilão..."
                  value={searchInputValueFaturas}
                  onChange={(e) => setSearchInputValueFaturas(e.target.value)}
                  className="pl-10 h-11 border-gray-300 focus:border-gray-300 focus:ring-0 no-focus-outline"
                />
              </div>
              
              {/* Filtros à direita */}
              <div className="flex gap-3 lg:ml-auto">
                <Select value={statusFilterFaturas} onValueChange={setStatusFilterFaturas}>
                  <SelectTrigger className="w-[140px] h-11 border-gray-300 bg-white focus:!ring-0 focus:!ring-offset-0 focus:!border-gray-300 focus:!outline-none focus:!shadow-none">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos ({statsFaturas.total})</SelectItem>
                    <SelectItem value="em_aberto">Em Aberto ({statsFaturas.emAberto})</SelectItem>
                    <SelectItem value="pago">Pagas ({statsFaturas.pagas})</SelectItem>
                    <SelectItem value="atrasado">Atrasadas ({statsFaturas.atrasadas})</SelectItem>
                  </SelectContent>
                </Select>
                {showArchived && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleSmoothTransitionFaturas(() => {
                        setShowArchived(false);
                      });
                    }}
                    className="h-11 px-3 border-gray-300 bg-white text-sm hover:bg-gray-100 hover:text-black"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    handleSmoothTransitionFaturas(() => {
                      setShowArchived(!showArchived);
                    });
                  }}
                  className="h-11 px-4 border-gray-300 bg-white text-black text-sm hover:bg-gray-100 hover:text-black"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {showArchived ? "Ver Ativas" : "Ver Arquivadas"}
              </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 h-[calc(100%-120px)] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-0">
              {[...Array(4)].map((_, index) => (
                <div
                  key={index}
                  className={`animate-pulse border-b border-gray-100 p-4 ${
                    index === 0 ? 'animate-delay-0' :
                    index === 1 ? 'animate-delay-100' :
                    index === 2 ? 'animate-delay-200' : 'animate-delay-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-4 w-16 bg-gray-200 rounded"></div>
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      <div className="h-6 w-20 bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFaturas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Receipt className="h-12 w-12 mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTermFaturas && statusFilterFaturas !== "todos" 
                  ? `Nenhuma fatura ${statusFilterFaturas} encontrada`
                  : searchTermFaturas 
                    ? "Nenhuma fatura encontrada"
                    : statusFilterFaturas !== "todos"
                      ? `Nenhuma fatura ${statusFilterFaturas}`
                      : "Nenhuma fatura encontrada"}
              </h3>
              <p className="text-sm text-center max-w-md">
                {searchTermFaturas && statusFilterFaturas !== "todos"
                  ? `Nenhuma fatura ${statusFilterFaturas} corresponde à busca "${searchTermFaturas}".`
                  : searchTermFaturas
                    ? `Nenhum resultado para "${searchTermFaturas}". Tente outro termo.`
                    : statusFilterFaturas !== "todos"
                      ? `Não há faturas com status ${statusFilterFaturas} no momento.`
                      : "Ainda não há faturas emitidas no sistema."}
              </p>
            </div>
          ) : (
            <div className={`transition-opacity duration-300 ${isTransitioningFaturas ? 'opacity-0' : 'opacity-100'}`}>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200">
                    <TableHead className="font-semibold text-gray-700">Lote</TableHead>
                    <TableHead className="font-semibold text-gray-700">Arrematante</TableHead>
                    <TableHead className="font-semibold text-gray-700">Leilão</TableHead>
                    <TableHead className="font-semibold text-gray-700">Valor</TableHead>
                    <TableHead className="font-semibold text-gray-700">Vencimento</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFaturas.map((fatura) => (
                    <TableRow key={fatura.id} className="border-gray-100 hover:bg-gray-50/50">
                      <TableCell>
                        <span className="font-semibold text-gray-900">#{fatura.loteNumero}</span>
                          <div className="text-xs text-gray-500">{getPaymentTypeDisplay(fatura)}</div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900">{fatura.arrematanteNome}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-900">{fatura.leilaoNome}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-black">{formatCurrency(fatura.valorLiquido)}</span>
                          <span className="text-xs text-gray-500">
                            (Total: {formatCurrency(calcularValorTotalLeilaoComJuros(fatura))})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {new Date(fatura.dataVencimento + 'T00:00:00.000Z').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          {(() => {
                            if (fatura.tipoPagamento === 'a_vista') {
                              return ' • Pagamento à vista';
                            } else if (fatura.tipoPagamento === 'entrada_parcelamento') {
                              if (fatura.parcela === 1) {
                                return ' • Entrada';
                              } else {
                                // Para entrada_parcelamento: parcela 2 = 1ª Parcela, parcela 3 = 2ª Parcela, etc.
                                const parcelaMensal = fatura.parcela - 1;
                                return ` • ${parcelaMensal}ª Parcela`;
                              }
                            } else {
                              // Para parcelamento simples: parcela 1 = 1ª Parcela, parcela 2 = 2ª Parcela, etc.
                              return ` • ${fatura.parcela}ª Parcela`;
                            }
                          })()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold font-medium ${getStatusBadgeColor(fatura.status)}`}>
                          {getStatusText(fatura.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedFatura(fatura);
                              setIsViewFaturaModalOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900 btn-action-click"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadFatura(fatura.id)}
                            className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900 btn-download-click"
                            title="Baixar fatura"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                title="Mais ações"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {!showArchived ? (
                                <DropdownMenuItem 
                                  onClick={() => handleArchiveFatura(fatura.id)}
                                  className="hover:bg-gray-100 focus:bg-gray-100 hover:text-black focus:text-black"
                                >
                                  <Archive className="h-4 w-4 mr-2" />
                                  <span>Arquivar</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => handleUnarchiveFatura(fatura.id)}
                                  className="hover:bg-gray-100 focus:bg-gray-100 hover:text-black focus:text-black"
                                >
                                  <Archive className="h-4 w-4 mr-2" />
                                  <span>Desarquivar</span>
                                </DropdownMenuItem>
                              )}
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem 
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    <span>Excluir</span>
                                  </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Fatura</AlertDialogTitle>
                                <AlertDialogDescription>
                                      Tem certeza que deseja excluir a fatura do lote #{fatura.loteNumero} ({getPaymentTypeDisplay(fatura)})? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteFatura(fatura.id)}
                                  className="bg-red-600 hover:bg-red-700 btn-save-click"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Visualização de Fatura */}
      <Dialog open={isViewFaturaModalOpen} onOpenChange={setIsViewFaturaModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Detalhes da Fatura
            </DialogTitle>
          </DialogHeader>
          {selectedFatura && (() => {
            // Buscar dados completos do leilão e arrematante
            const auction = auctions.find(a => a.id === selectedFatura.auctionId);
            const arrematante = auction?.arrematante;
            const loteArrematado = auction?.lotes?.find(lote => lote.id === selectedFatura.lotId);
            
            return (
            <div className="space-y-6">
                {/* Identificação Principal */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Lote</Label>
                      <p className="mt-1 text-lg font-bold text-slate-900">#{selectedFatura.loteNumero}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <div className="mt-1">
                        <div className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${getStatusBadgeColor(selectedFatura.status)}`}>
                      {getStatusText(selectedFatura.status)}
                    </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Tipo de Pagamento</Label>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedFatura.tipoPagamento === 'entrada_parcelamento' ? 'Entrada + Parcelamento' :
                         selectedFatura.tipoPagamento === 'a_vista' ? 'À Vista' : 'Parcelamento'}
                      </p>
                  </div>
                </div>
              </div>

                {/* Dados do Arrematante */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                    Dados do Arrematante
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
              <div>
                      <Label className="text-sm font-medium text-gray-700">Nome Completo</Label>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{selectedFatura.arrematanteNome}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Documento</Label>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {arrematante?.documento || 'Não informado'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Email</Label>
                      <p className="mt-1 text-sm text-gray-600">
                        {arrematante?.email || 'Não informado'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Telefone</Label>
                      <p className="mt-1 text-sm text-gray-600">
                        {arrematante?.telefone || 'Não informado'}
                      </p>
                    </div>
                  </div>
              </div>

                {/* Valor Total do Arrematação */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <Label className="text-sm font-medium text-gray-700">Valor Total do Arrematação</Label>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {formatCurrency(selectedFatura.valorTotal || selectedFatura.valorLiquido)}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">Valor total arrematado no leilão</p>
                </div>

                {/* Detalhes Específicos do Pagamento */}
                {selectedFatura.tipoPagamento === 'entrada_parcelamento' ? (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                      Detalhes do Pagamento - Entrada + Parcelamento
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      {/* Informações da Entrada */}
                      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                        <h4 className="text-md font-semibold text-gray-800 mb-3">Entrada</h4>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs font-medium text-gray-700">Valor da Entrada</Label>
                            <p className="text-lg font-bold text-gray-900">
                              {(() => {
                                const valorTotal = Number(selectedFatura.valorTotal || selectedFatura.valorLiquido);
                                const valorEntradaConfig = arrematante?.valorEntrada;
                                
                                // Se há valor configurado, usa ele (convertendo de string se necessário)
                                if (valorEntradaConfig) {
                                  const valorConvertido = typeof valorEntradaConfig === 'string' ? 
                                    parseCurrencyToNumber(valorEntradaConfig) : 
                                    Number(valorEntradaConfig);
                                  return formatCurrency(valorConvertido);
                                }
                                
                                // Senão, usa 30% do total
                                return formatCurrency(valorTotal * 0.3);
                              })()}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-700">Data de Vencimento</Label>
                            <p className="text-sm font-semibold text-gray-800">
                              {selectedFatura.parcela === 1 ? 
                                new Date(selectedFatura.dataVencimento).toLocaleDateString('pt-BR') :
                                (loteArrematado?.dataEntrada ? 
                                  new Date(loteArrematado.dataEntrada).toLocaleDateString('pt-BR') : 
                                  'Não definida')
                              }
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-700">Status</Label>
                            <p className="text-sm font-semibold text-gray-800">
                              {selectedFatura.parcela === 1 ? getStatusText(selectedFatura.status) : 
                               (arrematante?.parcelasPagas && arrematante.parcelasPagas > 0 ? 'Pago' : 'Pendente')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Informações das Parcelas */}
                      <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
                        <h4 className="text-md font-semibold text-slate-800 mb-3">Parcelas</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-medium text-slate-700">Valor por Parcela</Label>
                            <p className="text-lg font-bold text-slate-900">
                              {(() => {
                                const valorTotal = Number(selectedFatura.valorTotal || selectedFatura.valorLiquido);
                                const valorEntradaConfig = arrematante?.valorEntrada;
                                
                                // Calcular valor da entrada (mesmo cálculo usado acima)
                                let valorEntrada;
                                if (valorEntradaConfig) {
                                  valorEntrada = typeof valorEntradaConfig === 'string' ? 
                                    parseCurrencyToNumber(valorEntradaConfig) : 
                                    Number(valorEntradaConfig);
                                } else {
                                  valorEntrada = valorTotal * 0.3;
                                }
                                
                                // Calcular valor por parcela
                                const valorPorParcela = (valorTotal - valorEntrada) / (arrematante?.quantidadeParcelas || 12);
                                return formatCurrency(valorPorParcela);
                              })()}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-slate-700">Quantidade de Parcelas</Label>
                            <p className="text-sm font-semibold text-slate-800">
                              {arrematante?.quantidadeParcelas || 12} parcelas
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-slate-700">Parcelas Pagas</Label>
                            <p className="text-sm font-semibold text-slate-800">
                              {(arrematante?.parcelasPagas || 0) - 1 < 0 ? 0 : (arrematante?.parcelasPagas || 0) - 1} de {arrematante?.quantidadeParcelas || 12}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-slate-700">Status das Parcelas</Label>
                            <div>
                              {(() => {
                                const parcelasPagas = (arrematante?.parcelasPagas || 0) - 1; // Subtrai 1 porque entrada não conta
                                const quantidadeParcelas = arrematante?.quantidadeParcelas || 12;
                                const dataAtual = new Date();
                                const mesInicio = arrematante?.mesInicioPagamento;
                                const diaVencimento = arrematante?.diaVencimentoMensal || 15;
                                
                                // Calcular parcelas atrasadas
                                const parcelasAtrasadas = [];
                                let hasParcelasAtrasadas = false;
                                
                                if (mesInicio && diaVencimento) {
                                  const [ano, mes] = mesInicio.split('-').map(Number);
                                  
                                  // Verificar todas as parcelas que deveriam ter sido pagas
                                  for (let i = 0; i < quantidadeParcelas; i++) {
                                    const dataVencimentoParcela = new Date(ano, mes - 1 + i, diaVencimento);
                                    dataVencimentoParcela.setHours(23, 59, 59, 999);
                                    
                                    if (dataAtual > dataVencimentoParcela && i >= parcelasPagas) {
                                      hasParcelasAtrasadas = true;
                                      parcelasAtrasadas.push({
                                        numero: i + 1,
                                        data: dataVencimentoParcela.toLocaleDateString('pt-BR'),
                                        diasAtraso: Math.floor((dataAtual.getTime() - dataVencimentoParcela.getTime()) / (1000 * 60 * 60 * 24))
                                      });
                                    }
                                  }
                                }
                                
                                let statusText = '';
                                let statusColor = 'text-slate-800';
                                
                                if (parcelasPagas === quantidadeParcelas) {
                                  statusText = 'Todas Pagas';
                                  statusColor = 'text-green-700';
                                } else if (hasParcelasAtrasadas) {
                                  statusText = 'Em Atraso';
                                  statusColor = 'text-red-700';
                                } else if (parcelasPagas === 0) {
                                  statusText = 'Pendente';
                                  statusColor = 'text-orange-600';
                                } else {
                                  statusText = 'Em Andamento';
                                  statusColor = 'text-blue-700';
                                }
                                
                                return (
                                  <div>
                                    <p className={`text-sm font-semibold ${statusColor}`}>
                                      {statusText}
                                    </p>
                                    {hasParcelasAtrasadas && (
                                      <div className="mt-2 text-xs text-red-600">
                                        <p className="font-medium">
                                          {parcelasAtrasadas.length} parcela{parcelasAtrasadas.length > 1 ? 's' : ''} atrasada{parcelasAtrasadas.length > 1 ? 's' : ''}:
                                        </p>
                                        <ul className="mt-1 space-y-1">
                                          {parcelasAtrasadas.map((parcela, index) => (
                                            <li key={index} className="text-xs">
                                              {parcela.numero}ª Parcela - Venceu em {parcela.data} ({parcela.diasAtraso} dias de atraso)
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : selectedFatura.tipoPagamento === 'a_vista' ? (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                      Detalhes do Pagamento - À Vista
                    </h3>
                    <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                          <Label className="text-sm font-medium text-gray-700">Valor a Pagar</Label>
                          <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(selectedFatura.valorLiquido)}
                  </p>
                </div>
                <div>
                          <Label className="text-sm font-medium text-gray-700">Modalidade</Label>
                          <p className="text-sm font-semibold text-gray-800">Pagamento único à vista</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                      Detalhes do Pagamento - Parcelamento
                    </h3>
                    <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-slate-700">Parcela Atual</Label>
                          <p className="text-lg font-bold text-slate-900">
                    {selectedFatura.parcela}/{selectedFatura.totalParcelas}
                  </p>
                </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-700">Valor da Parcela</Label>
                          <p className="text-lg font-bold text-slate-900">
                            {formatCurrency(selectedFatura.valorLiquido)}
                          </p>
              </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-700">Parcelas Pagas</Label>
                          <p className="text-sm font-semibold text-slate-800">
                            {arrematante?.parcelasPagas || 0} de {selectedFatura.totalParcelas}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fatura Específica */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                    Esta Fatura
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        {selectedFatura.tipoPagamento === 'entrada_parcelamento' && selectedFatura.parcela === 1 ? 
                          'Tipo' : 
                          selectedFatura.tipoPagamento === 'a_vista' ? 'Tipo' : 'Parcela'
                        }
                      </Label>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {selectedFatura.tipoPagamento === 'entrada_parcelamento' && selectedFatura.parcela === 1 ? 
                          'Entrada + Parcelamento' :
                          selectedFatura.tipoPagamento === 'entrada_parcelamento' && selectedFatura.parcela > 1 ?
                          `Parcela ${selectedFatura.parcela - 1}/${(selectedFatura.totalParcelas || 1) - 1} (Entrada + Parcelamento)` :
                          selectedFatura.tipoPagamento === 'a_vista' ? 'Pagamento à Vista' :
                          `Parcela ${selectedFatura.parcela}/${selectedFatura.totalParcelas}`
                        }
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Valor desta Fatura</Label>
                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {formatCurrency(selectedFatura.valorLiquido)}
                      </p>
                    </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Data de Vencimento</Label>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                  {new Date(selectedFatura.dataVencimento).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                      <Label className="text-sm font-medium text-gray-700">Status</Label>
                      <div className="mt-1">
                        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeColor(selectedFatura.status)}`}>
                          {getStatusText(selectedFatura.status)}
                        </div>
                      </div>
                    </div>
                  </div>
              </div>


                {/* Informações do Leilão */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                    Informações do Leilão
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
              <div>
                      <Label className="text-sm font-medium text-gray-700">Nome do Leilão</Label>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{selectedFatura.leilaoNome}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Data do Leilão</Label>
                      <p className="mt-1 text-sm text-gray-600">
                        {auction?.dataInicio ? new Date(auction.dataInicio).toLocaleDateString('pt-BR') : 'Não informada'}
                </p>
              </div>
              <div>
                      <Label className="text-sm font-medium text-gray-700">Local</Label>
                      <p className="mt-1 text-sm text-gray-600">
                        {auction?.endereco || 'Não informado'}
                </p>
              </div>
            </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Modal de Criação/Edição de Fatura */}
      <Dialog open={isFaturaModalOpen} onOpenChange={setIsFaturaModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {isEditingFatura ? "Editar Fatura" : "Nova Fatura"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lotId">Lote</Label>
                <Select value={faturaForm.lotId} onValueChange={(value) => setFaturaForm({...faturaForm, lotId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o lote" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Lote #001</SelectItem>
                    <SelectItem value="2">Lote #002</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="arrematanteId">Arrematante</Label>
                <Select value={faturaForm.arrematanteId} onValueChange={(value) => setFaturaForm({...faturaForm, arrematanteId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o arrematante" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bidder-1">João Silva</SelectItem>
                    <SelectItem value="bidder-2">Maria Santos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valorArremate">Valor Arrematado (R$)</Label>
                <Input
                  id="valorArremate"
                  value={faturaForm.valorArremate}
                  onChange={(e) => setFaturaForm({...faturaForm, valorArremate: e.target.value})}
                  placeholder="Ex: 12.000,00"
                />
              </div>
              <div>
                <Label htmlFor="comissao">Comissão (R$)</Label>
                <Input
                  id="comissao"
                  value={faturaForm.comissao}
                  onChange={(e) => setFaturaForm({...faturaForm, comissao: e.target.value})}
                  placeholder="Ex: 600,00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="custosAdicionais">Custos Adicionais (R$)</Label>
                <Input
                  id="custosAdicionais"
                  value={faturaForm.custosAdicionais}
                  onChange={(e) => setFaturaForm({...faturaForm, custosAdicionais: e.target.value})}
                  placeholder="Ex: 200,00"
                />
              </div>
              <div>
                <Label htmlFor="vencimento">Data de Vencimento</Label>
                <Input
                  id="vencimento"
                  type="date"
                  value={faturaForm.vencimento}
                  onChange={(e) => setFaturaForm({...faturaForm, vencimento: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={faturaForm.status} onValueChange={(value: InvoiceStatus) => setFaturaForm({...faturaForm, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_aberto">Em Aberto</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsFaturaModalOpen(false)}
                className="hover:text-black"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  handleSaveFatura();
                }}
                className="bg-green-600 hover:bg-green-700 btn-save-click"
              >
                {isEditingFatura ? "Salvar Alterações" : "Criar Fatura"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Preview da Fatura - similar ao dos relatórios */}
    <Dialog open={isFaturaPreviewOpen} onOpenChange={setIsFaturaPreviewOpen}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Visualizar Fatura - Lote #{selectedFaturaForPreview?.loteNumero}</DialogTitle>
          <p className="text-sm text-gray-600">
            Visualize como ficará a fatura antes de baixar o PDF
          </p>
        </DialogHeader>
        
        {selectedFaturaForPreview && (
          <div className="space-y-6">
            {/* Preview da Fatura - Design Minimalista Corporativo */}
            <div className="border rounded-lg bg-white" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif", padding: '48px 40px' }}>
              {/* Cabeçalho Minimalista */}
              <div className="mb-8 pb-6" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h1 className="text-2xl font-light text-slate-800 tracking-tight mb-1" style={{ letterSpacing: '-0.01em' }}>
                      Fatura de Arrematação
                    </h1>
                    <p className="text-xs text-slate-500 uppercase tracking-wide" style={{ fontSize: '10px' }}>Sistema de Gestão de Leilões</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase tracking-wide mb-1" style={{ fontSize: '9px' }}>Documento</div>
                    <div className="text-xl font-medium text-slate-800">#{selectedFaturaForPreview.loteNumero}</div>
                  </div>
                </div>
                <div className="flex gap-6 text-xs text-slate-500" style={{ fontSize: '11px' }}>
                  <div>
                    <span className="text-slate-400">Emissão:</span>{' '}
                    <span className="text-slate-600">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Horário:</span>{' '}
                    <span className="text-slate-600">{new Date().toLocaleTimeString('pt-BR')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Status:</span>{' '}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      selectedFaturaForPreview.status === 'pago' ? 'bg-slate-100 text-slate-700' :
                      selectedFaturaForPreview.status === 'atrasado' ? 'bg-red-50 text-red-700 font-semibold' :
                      'bg-slate-100 text-slate-600'
                    }`} style={{ fontSize: '10px' }}>
                      {getStatusText(selectedFaturaForPreview.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid de Informações */}
              <div className="grid grid-cols-2 gap-10 mb-8">
                {/* Dados do Arrematante */}
                <div>
                  <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4" style={{ fontSize: '10px' }}>
                    Arrematante
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <span className="text-sm text-slate-500">Nome</span>
                      <span className="text-sm font-medium text-slate-900">{selectedFaturaForPreview.arrematanteNome}</span>
                    </div>
                    <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <span className="text-sm text-slate-500">Documento</span>
                      <span className="text-sm font-medium text-slate-900">
                        {auctions.find(a => a.id === selectedFaturaForPreview.auctionId)?.arrematante?.documento || 'Não informado'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Informações do Leilão */}
                    <div>
                  <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4" style={{ fontSize: '10px' }}>
                    Informações do Leilão
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <span className="text-sm text-slate-500">Leilão</span>
                      <span className="text-sm font-medium text-slate-900">{selectedFaturaForPreview.leilaoNome}</span>
                    </div>
                    <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <span className="text-sm text-slate-500">Modalidade</span>
                      <span className="text-sm font-medium text-slate-900">{getPaymentTypeDisplay(selectedFaturaForPreview)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Valor Total - Minimalista */}
              <div className="py-8 mb-8" style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                <div className="text-center">
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3" style={{ fontSize: '10px' }}>
                    Valor Total
                  </div>
                  <div>
                    {(() => {
                      const auction = auctions.find(a => a.id === selectedFaturaForPreview.auctionId);
                      const arrematante = auction?.arrematante;
                      const loteArrematado = auction?.lotes?.find(lote => lote.id === selectedFaturaForPreview.lotId);
                      const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento;
                      const valorBase = selectedFaturaForPreview.valorLiquido;
                      const percentualJuros = arrematante?.percentualJurosAtraso || 0;
                      
                      // Para pagamento à vista
                      if (tipoPagamento === 'a_vista') {
                        if (!arrematante || !percentualJuros) {
                          return (
                            <div className="text-4xl font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>
                              {formatCurrency(valorBase)}
                            </div>
                          );
                        }
                        
                        const dataVencimento = loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista;
                        let valorTotalComJuros = valorBase;
                        
                        if (dataVencimento) {
                          const hoje = new Date();
                          const vencimento = new Date(dataVencimento + 'T23:59:59');
                          if (hoje > vencimento) {
                            const mesesAtraso = Math.max(0, Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                            if (mesesAtraso >= 1) {
                              valorTotalComJuros = calcularJurosProgressivos(valorBase, percentualJuros, mesesAtraso);
                            }
                          }
                        }
                        
                        const valorJuros = valorTotalComJuros - valorBase;
                        return (
                          <div className="text-4xl font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>
                            {formatCurrency(valorTotalComJuros)}
                            {valorJuros > 0 && (
                              <span className="text-sm text-red-600 ml-2">
                                ({formatCurrency(valorJuros)} juros)
                              </span>
                            )}
                          </div>
                        );
                      }
                      
                      // Para parcelamento
                      if (!arrematante || !arrematante.mesInicioPagamento) {
                        return (
                          <div className="text-4xl font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>
                            {formatCurrency(valorBase)}
                          </div>
                        );
                      }
                      
                      const quantidadeParcelas = arrematante.quantidadeParcelas || 12;
                      const mesNormalizado = normalizarMesInicioPagamento(arrematante.mesInicioPagamento);
                      const [startYear, startMonth] = mesNormalizado.split('-').map(Number);
                      
                      let valorTotalComJuros = 0;
                      
                      if (tipoPagamento === 'entrada_parcelamento') {
                        const valorEntradaBase = arrematante.valorEntrada ? 
                          parseCurrencyToNumber(arrematante.valorEntrada) : 
                          valorBase * 0.3;
                        const valorRestante = valorBase - valorEntradaBase;
                        const valorPorParcela = valorRestante / quantidadeParcelas;
                        
                        const dataEntrada = loteArrematado?.dataEntrada || auction?.dataEntrada;
                        if (dataEntrada && percentualJuros) {
                          const mesesAtrasoEntrada = Math.max(0, Math.floor((new Date().getTime() - new Date(dataEntrada + 'T23:59:59').getTime()) / (1000 * 60 * 60 * 24 * 30)));
                          valorTotalComJuros += calcularJurosProgressivos(valorEntradaBase, percentualJuros, mesesAtrasoEntrada);
                        } else {
                          valorTotalComJuros += valorEntradaBase;
                        }
                        
                        for (let i = 0; i < quantidadeParcelas; i++) {
                          const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal || 15, 23, 59, 59);
                          const mesesAtraso = Math.max(0, Math.floor((new Date().getTime() - parcelaDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                          if (mesesAtraso >= 1 && percentualJuros) {
                            valorTotalComJuros += calcularJurosProgressivos(valorPorParcela, percentualJuros, mesesAtraso);
                          } else {
                            valorTotalComJuros += valorPorParcela;
                          }
                        }
                      } else {
                        const valorPorParcela = valorBase / quantidadeParcelas;
                        for (let i = 0; i < quantidadeParcelas; i++) {
                          const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal || 15, 23, 59, 59);
                          const mesesAtraso = Math.max(0, Math.floor((new Date().getTime() - parcelaDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                          if (mesesAtraso >= 1 && percentualJuros) {
                            valorTotalComJuros += calcularJurosProgressivos(valorPorParcela, percentualJuros, mesesAtraso);
                          } else {
                            valorTotalComJuros += valorPorParcela;
                          }
                        }
                      }
                      
                      const valorJuros = valorTotalComJuros - valorBase;
                      return (
                        <div className="text-4xl font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>
                          {formatCurrency(valorTotalComJuros)}
                          {valorJuros > 0 && (
                            <span className="text-sm text-red-600 ml-2">
                              ({formatCurrency(valorJuros)} juros)
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Condições de Pagamento Minimalista */}
              {selectedFaturaForPreview.tipoPagamento === 'entrada_parcelamento' && (
                <div className="mb-8">
                  <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4" style={{ fontSize: '10px' }}>
                    Condições de Pagamento
                  </h2>
                  <div className="space-y-3 text-sm">
                    {(() => {
                      const auction = auctions.find(a => a.id === selectedFaturaForPreview.auctionId);
                      const arrematante = auction?.arrematante;
                      const loteArrematado = auction?.lotes?.find(lote => lote.id === selectedFaturaForPreview.lotId);
                      
                      if (!arrematante) return <div>Dados do arrematante não encontrados</div>;
                      
                      const quantidadeParcelasTotal = arrematante.quantidadeParcelas || 12;
                      const parcelasPagasCorretas = arrematante.parcelasPagas || 0;
                      
                      let mesInicioTexto = 'Não definido';
                      if (arrematante.mesInicioPagamento) {
                        try {
                          const mesNormalizado = normalizarMesInicioPagamento(arrematante.mesInicioPagamento);
                          const [ano, mes] = mesNormalizado.split('-');
                          const data = new Date(parseInt(ano), parseInt(mes) - 1);
                          mesInicioTexto = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                        } catch (error) {
                          mesInicioTexto = 'Não definido';
                        }
                      }

                      // Calcular entrada com juros se atrasada
                      const valorEntradaBase = arrematante.valorEntrada ? 
                        parseCurrencyToNumber(arrematante.valorEntrada) : 
                        selectedFaturaForPreview.valorLiquido * 0.3;
                      
                      const valorRestante = selectedFaturaForPreview.valorLiquido - valorEntradaBase;
                      const valorPorParcela = valorRestante / quantidadeParcelasTotal;
                      
                      const dataEntrada = loteArrematado?.dataEntrada || auction?.dataEntrada;
                      const percentualJuros = arrematante.percentualJurosAtraso || 0;
                      
                      let valorEntradaComJuros = valorEntradaBase;
                      let entradaAtrasada = false;
                      
                      if (dataEntrada && arrematante.parcelasPagas === 0 && percentualJuros) {
                        const mesesAtraso = Math.max(0, Math.floor((new Date().getTime() - new Date(dataEntrada + 'T23:59:59').getTime()) / (1000 * 60 * 60 * 24 * 30)));
                        if (mesesAtraso >= 1) {
                          valorEntradaComJuros = calcularJurosProgressivos(valorEntradaBase, percentualJuros, mesesAtraso);
                          entradaAtrasada = true;
                        }
                      }

                      return (
                        <>
                          <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <span className="text-slate-500">Entrada</span>
                            <span className="font-medium text-slate-900">
                              {formatCurrency(valorEntradaComJuros)}
                              {entradaAtrasada && (
                                <span className="text-xs text-red-600 ml-2">
                                  (+{formatCurrency(valorEntradaComJuros - valorEntradaBase)})
                                </span>
                              )}
                            </span>
                            </div>
                          <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <span className="text-slate-500">Vencimento da Entrada</span>
                            <span className="font-medium text-slate-900">
                              {dataEntrada ? new Date(dataEntrada + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não definida'}
                            </span>
                          </div>
                          <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <span className="text-slate-500">Parcelas</span>
                            <span className="font-medium text-slate-900">{quantidadeParcelasTotal}× mensais</span>
                            </div>
                          <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <span className="text-slate-500">Valor por Parcela</span>
                            <span className="font-medium text-slate-900">{formatCurrency(valorPorParcela)}</span>
                          </div>
                          <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <span className="text-slate-500">Início</span>
                            <span className="font-medium text-slate-900 capitalize">{mesInicioTexto}</span>
                          </div>
                          <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <span className="text-slate-500">Vencimento</span>
                            <span className="font-medium text-slate-900">Dia {arrematante.diaVencimentoMensal || 15}</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-slate-500">Situação</span>
                            <span className="font-medium text-slate-900">
                              {parcelasPagasCorretas} de {quantidadeParcelasTotal + 1} pagas
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Observações */}
              <div className="mb-8 p-4" style={{ backgroundColor: '#fafafa', border: '1px solid #e2e8f0' }}>
                <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3" style={{ fontSize: '10px' }}>
                  Observações
                </h3>
                <ul className="text-xs text-slate-600 space-y-1.5" style={{ fontSize: '11px', lineHeight: '1.6' }}>
                  <li>• Este documento tem validade legal para fins de cobrança</li>
                  <li>• O pagamento após o vencimento está sujeito a juros de mora conforme legislação vigente</li>
                  <li>• Em caso de dúvidas, entre em contato com o departamento financeiro</li>
                </ul>
              </div>

              {/* Rodapé */}
              <div className="pt-6 mt-8" style={{ borderTop: '1px solid #e2e8f0' }}>
                <div className="text-center mb-6">
                  <div className="text-xs text-slate-500" style={{ fontSize: '11px' }}>
                    Documento gerado automaticamente em {new Date().toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric' 
                    })} às {new Date().toLocaleTimeString('pt-BR')}
                </div>
                  <div className="text-xs text-slate-400 mt-1" style={{ fontSize: '10px' }}>
                    Sistema de Gestão de Leilões • Página 1 de 1
                  </div>
                </div>
                <div className="text-center text-xs text-slate-400 mb-8" style={{ fontSize: '10px' }}>
                  Este documento é válido sem assinatura conforme artigo 10º da MP 2.200-2/2001
                </div>
              </div>

              {/* Logos no Rodapé */}
              <div className="mt-8 flex justify-center items-center -ml-20">
                <img 
                  src="/logo-elionx-softwares.png" 
                  alt="Elionx Softwares" 
                  className="max-h-80 object-contain opacity-90"
                  style={{ maxHeight: '320px', maxWidth: '620px' }}
                />
                <img 
                  src="/arthur-lira-logo.png" 
                  alt="Arthur Lira Leilões" 
                  className="max-h-14 object-contain opacity-90 -mt-2 -ml-16"
                  style={{ maxHeight: '55px', maxWidth: '110px' }}
                />
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsFaturaPreviewOpen(false)}
                className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDownloadFromPreview}
                className="bg-black hover:bg-gray-800 text-white hover:text-white btn-download-click"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Modal temporário invisível para geração de PDF (igual aos relatórios) */}
    <Dialog open={isExportFaturaModalOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" style={{ display: 'none', visibility: 'hidden' }}>
        <DialogHeader style={{ display: 'none' }}>
          <DialogTitle>Gerando PDF da Fatura...</DialogTitle>
        </DialogHeader>
        
        {/* Renderizar componente React para ter o mesmo layout do preview */}
        {selectedFaturaForPreview && (
          <div id="fatura-pdf-content" style={{ display: 'block', visibility: 'visible' }}>
            <FaturaPreview fatura={selectedFaturaForPreview} auctions={auctions} />
          </div>
        )}
      </DialogContent>
    </Dialog>

    </div>
  );
}

// Componente de Preview da Fatura (igual ao ReportPreview dos relatórios)
const FaturaPreview = ({ fatura, auctions }: { fatura: FaturaExtendida, auctions: any[] }) => {
  // Função para calcular juros progressivos
  const calcularJurosProgressivos = (valorOriginal: number, dataVencimento: string, percentualJuros: number): number => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const vencimento = new Date(dataVencimento + 'T00:00:00.000');
    vencimento.setHours(0, 0, 0, 0);
    
    if (hoje <= vencimento) {
      return valorOriginal;
    }
    
    const diffTime = hoje.getTime() - vencimento.getTime();
    const mesesAtraso = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
    
    if (mesesAtraso <= 0) {
      return valorOriginal;
    }
    
    let valorComJuros = valorOriginal;
    for (let i = 0; i < mesesAtraso; i++) {
      valorComJuros = valorComJuros * (1 + percentualJuros / 100);
    }
    
    return valorComJuros;
  };

  // Funções auxiliares (replicadas localmente)
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPaymentTypeDisplay = (fatura: FaturaExtendida) => {
    if (!fatura.tipoPagamento) {
      return `Parcela ${fatura.parcela}/${fatura.totalParcelas}`;
    }

    switch (fatura.tipoPagamento) {
      case 'a_vista':
        return 'Pagamento à Vista';
      
      case 'entrada_parcelamento':
        if (fatura.parcela === 1) {
          return 'Entrada + Parcelamento';
        } else {
          return `Entrada + Parcelamento (Parcela ${fatura.parcela - 1}/${fatura.totalParcelas - 1})`;
        }
      
      case 'parcelamento':
      default:
        return `Parcela ${fatura.parcela}/${fatura.totalParcelas}`;
    }
  };

  const getStatusText = (status: InvoiceStatus) => {
    switch (status) {
      case 'em_aberto':
        return 'Em Aberto';
      case 'pago':
        return 'Pago';
      case 'atrasado':
        return 'Atrasado';
      default:
        return 'Desconhecido';
    }
  };
  const auction = auctions.find(a => a.id === fatura.auctionId);
  const arrematante = auction?.arrematante;
  const loteArrematado = auction?.lotes?.find(lote => lote.id === fatura.lotId);

  // Calcular parcelas corretas
  const parcelasPagasCorretas = arrematante?.parcelasPagas || 0;
  const quantidadeParcelasTotal = arrematante?.quantidadeParcelas || 12;

  // Calcular mês de início das parcelas
  const mesInicioParcelas = arrematante?.mesInicioPagamento;
  let mesInicioTexto = 'Não definido';
  if (mesInicioParcelas) {
    try {
      const [ano, mes] = mesInicioParcelas.split('-');
      const data = new Date(parseInt(ano), parseInt(mes) - 1);
      mesInicioTexto = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } catch (error) {
      mesInicioTexto = 'Não definido';
    }
  }

  // Calcular valor total real do arrematante
  const valorTotalArrematante = arrematante?.valorPagar ? 
    (typeof arrematante.valorPagar === 'string' 
      ? parseCurrencyToNumber(arrematante.valorPagar)
      : Number(arrematante.valorPagar)) 
    : fatura.valorLiquido;
  
  // Verificar tipo de pagamento
  const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento;
  
  let valorEntradaBase = 0;
  let valorPorParcelaBase = 0;
  
  if (tipoPagamento === 'entrada_parcelamento') {
    // Para entrada + parcelamento, calcular entrada e parcelas do restante
    valorEntradaBase = arrematante?.valorEntrada ? parseCurrencyToNumber(arrematante.valorEntrada) : valorTotalArrematante * 0.3;
    const valorRestante = valorTotalArrematante - valorEntradaBase;
    valorPorParcelaBase = valorRestante / quantidadeParcelasTotal;
  } else {
    // Para parcelamento simples, dividir valor total pelas parcelas
    valorPorParcelaBase = valorTotalArrematante / quantidadeParcelasTotal;
  }
  
  const dataEntradaStr = (loteArrematado?.dataEntrada || auction?.dataEntrada) || '';
  const dataEntrada = dataEntradaStr ? 
    new Date(dataEntradaStr + 'T00:00:00').toLocaleDateString('pt-BR') : 
    'Não definida';
  
  // Calcular valores com juros se atrasados
  const percentualJuros = arrematante?.percentualJurosAtraso || 0;
  const valorEntrada = (dataEntradaStr && tipoPagamento === 'entrada_parcelamento') 
    ? calcularJurosProgressivos(valorEntradaBase, dataEntradaStr, percentualJuros) 
    : valorEntradaBase;
  const valorPorParcela = valorPorParcelaBase;

  return (
    <div className="bg-white font-sans" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif", padding: '48px 40px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Cabeçalho Minimalista Corporativo */}
      <div className="mb-8 pb-6" style={{ borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className="text-2xl font-light text-slate-800 tracking-tight mb-1" style={{ letterSpacing: '-0.01em' }}>
          Fatura de Arrematação
        </h1>
            <p className="text-xs text-slate-500 uppercase tracking-wide" style={{ fontSize: '10px' }}>Sistema de Gestão de Leilões</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-1" style={{ fontSize: '9px' }}>Documento</div>
            <div className="text-xl font-medium text-slate-800">#{fatura.loteNumero}</div>
          </div>
        </div>
        <div className="flex gap-6 text-xs text-slate-500" style={{ fontSize: '11px' }}>
          <div>
            <span className="text-slate-400">Emissão:</span>{' '}
            <span className="text-slate-600">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
          </div>
          <div>
            <span className="text-slate-400">Horário:</span>{' '}
            <span className="text-slate-600">{new Date().toLocaleTimeString('pt-BR')}</span>
          </div>
          <div>
            <span className="text-slate-400">Status:</span>{' '}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              fatura.status === 'pago' ? 'bg-slate-100 text-slate-700' :
              fatura.status === 'atrasado' ? 'bg-red-50 text-red-700 font-semibold' :
              'bg-slate-100 text-slate-600'
            }`} style={{ fontSize: '10px' }}>
              {getStatusText(fatura.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Informações */}
      <div className="grid grid-cols-2 gap-10 mb-8">
        {/* Dados do Arrematante */}
        <div>
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4" style={{ fontSize: '10px' }}>
            Arrematante
        </h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <span className="text-sm text-slate-500">Nome</span>
              <span className="text-sm font-medium text-slate-900">{fatura.arrematanteNome}</span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <span className="text-sm text-slate-500">Documento</span>
              <span className="text-sm font-medium text-slate-900">{arrematante?.documento || 'Não informado'}</span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <span className="text-sm text-slate-500">E-mail</span>
              <span className="text-sm font-medium text-slate-900">{arrematante?.email || 'Não informado'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-slate-500">Telefone</span>
              <span className="text-sm font-medium text-slate-900">{arrematante?.telefone || 'Não informado'}</span>
            </div>
        </div>
      </div>

        {/* Informações do Leilão */}
        <div>
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4" style={{ fontSize: '10px' }}>
            Informações do Leilão
        </h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <span className="text-sm text-slate-500">Leilão</span>
              <span className="text-sm font-medium text-slate-900">{fatura.leilaoNome}</span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <span className="text-sm text-slate-500">Lote</span>
              <span className="text-sm font-medium text-slate-900">#{fatura.loteNumero}</span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <span className="text-sm text-slate-500">Modalidade</span>
              <span className="text-sm font-medium text-slate-900">{getPaymentTypeDisplay(fatura)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-slate-500">Vencimento</span>
              <span className="text-sm font-medium text-slate-900">{new Date(fatura.dataVencimento).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Valor Total - Minimalista */}
      <div className="py-8 mb-8" style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div className="text-center">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3" style={{ fontSize: '10px' }}>
            Valor Total
          </div>
          <div>
          {(() => {
            // Para pagamento à vista
            if (tipoPagamento === 'a_vista') {
              if (!arrematante || !percentualJuros) {
                return (
                  <div className="text-4xl font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>
                    {formatCurrency(valorTotalArrematante)}
                  </div>
                );
              }
              
              const dataVencimento = loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista;
              let valorTotalComJuros = valorTotalArrematante;
              
              if (dataVencimento) {
                const hoje = new Date();
                const vencimento = new Date(dataVencimento + 'T23:59:59');
                if (hoje > vencimento) {
                  const mesesAtraso = Math.max(0, Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                  if (mesesAtraso >= 1) {
                    valorTotalComJuros = calcularJurosProgressivos(valorTotalArrematante, dataVencimento, percentualJuros);
                  }
                }
              }
              
              const valorJuros = valorTotalComJuros - valorTotalArrematante;
              return (
                <div className="text-4xl font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>
                  {formatCurrency(valorTotalComJuros)}
                  {valorJuros > 0 && (
                    <span className="text-sm text-red-600 ml-2">
                      ({formatCurrency(valorJuros)} juros)
                    </span>
                  )}
                </div>
              );
            }
            
            // Para parcelamento
            if (!arrematante || !mesInicioParcelas) {
                return (
                  <div className="text-4xl font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>
                    {formatCurrency(valorTotalArrematante)}
                  </div>
                );
            }
            
            const [startYear, startMonth] = mesInicioParcelas.split('-').map(Number);
              let valorTotalComJuros = 0;
              
              // Para entrada + parcelamento, adicionar entrada com juros
              if (tipoPagamento === 'entrada_parcelamento') {
                valorTotalComJuros = valorEntrada; // Já calculado com juros se atrasada
              }
            
            // Somar todas as parcelas com seus juros
            for (let i = 0; i < quantidadeParcelasTotal; i++) {
              const dataVencimento = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal || 15);
              const dataVencimentoStr = dataVencimento.toISOString().split('T')[0];
              valorTotalComJuros += calcularJurosProgressivos(valorPorParcela, dataVencimentoStr, percentualJuros);
            }
            
            const valorJuros = valorTotalComJuros - valorTotalArrematante;
            return (
              <div className="text-4xl font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>
                {formatCurrency(valorTotalComJuros)}
                {valorJuros > 0 && (
                  <span className="text-sm text-red-600 ml-2">
                    ({formatCurrency(valorJuros)} juros)
                  </span>
                )}
              </div>
            );
          })()}
        </div>
        </div>
      </div>

      {/* Condições de Pagamento */}
      {fatura.tipoPagamento === 'entrada_parcelamento' && arrematante ? (
        <div className="mb-8">
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4" style={{ fontSize: '10px' }}>
            Condições de Pagamento
          </h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <span className="text-slate-500">Entrada</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(valorEntrada)}
                {valorEntrada > valorEntradaBase && (
                  <span className="text-xs text-red-600 ml-2">
                    (+{formatCurrency(valorEntrada - valorEntradaBase)})
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <span className="text-slate-500">Vencimento da Entrada</span>
              <span className="font-medium text-slate-900">{dataEntrada}</span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <span className="text-slate-500">Parcelas</span>
              <span className="font-medium text-slate-900">{quantidadeParcelasTotal}× mensais</span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <span className="text-slate-500">Valor por Parcela</span>
              <span className="font-medium text-slate-900">{formatCurrency(valorPorParcela)}</span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <span className="text-slate-500">Início</span>
              <span className="font-medium text-slate-900 capitalize">{mesInicioTexto}</span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <span className="text-slate-500">Vencimento</span>
              <span className="font-medium text-slate-900">Dia {arrematante.diaVencimentoMensal || 15}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Situação</span>
              <span className="font-medium text-slate-900">
                {parcelasPagasCorretas} de {quantidadeParcelasTotal + 1} pagas
              </span>
            </div>
          </div>
          
          {/* Detalhamento de Parcelas com Juros */}
          {mesInicioParcelas && (
            <div className="mt-6 pt-6" style={{ borderTop: '1px solid #e2e8f0' }}>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4" style={{ fontSize: '10px' }}>
                Detalhamento de Parcelas
              </h3>
              <div className="space-y-2">
                {Array.from({ length: quantidadeParcelasTotal }, (_, index) => {
                  const [startYear, startMonth] = mesInicioParcelas.split('-').map(Number);
                  const isPaga = (index + 1) < parcelasPagasCorretas;
                  const dataVencimento = new Date(startYear, startMonth - 1 + index, arrematante.diaVencimentoMensal || 15);
                  const dataVencimentoStr = dataVencimento.toISOString().split('T')[0];
                  const valorComJuros = calcularJurosProgressivos(valorPorParcela, dataVencimentoStr, percentualJuros);
                  const temJuros = valorComJuros > valorPorParcela;
                  const hoje = new Date();
                  hoje.setHours(0, 0, 0, 0);
                  const isAtrasada = !isPaga && dataVencimento < hoje;
                  
                  return (
                    <div key={index} className="flex items-center justify-between py-2 px-3" style={{ 
                      borderBottom: index < quantidadeParcelasTotal - 1 ? '1px solid #f1f5f9' : 'none',
                      backgroundColor: isAtrasada ? '#fef2f2' : 'transparent'
                    }}>
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          isPaga ? 'bg-slate-700 text-white' :
                          isAtrasada ? 'bg-red-600 text-white' :
                          'bg-slate-200 text-slate-600'
                        }`} style={{ fontSize: '10px' }}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {index + 1}ª Parcela
                          </div>
                          <div className="text-xs text-slate-500">
                            {dataVencimento.toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                        <div className="text-right">
                        <div className={`text-sm font-semibold ${isAtrasada && !isPaga ? 'text-red-600' : 'text-slate-900'}`}>
                            {formatCurrency(temJuros && !isPaga ? valorComJuros : valorPorParcela)}
                        </div>
                          {temJuros && !isPaga && (
                          <div className="text-xs text-red-600">
                            +{formatCurrency(valorComJuros - valorPorParcela)}
                          </div>
                        )}
                        <div className="text-xs text-slate-500 mt-0.5">
                          {isPaga ? 'Paga' : isAtrasada ? 'Atrasada' : 'A vencer'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : fatura.tipoPagamento === 'a_vista' ? (
        <div className="mb-8">
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4" style={{ fontSize: '10px' }}>
            Condições de Pagamento
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <span className="text-slate-500">Modalidade</span>
              <span className="font-medium text-slate-900">Pagamento À Vista</span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <span className="text-slate-500">Vencimento</span>
              <span className="font-medium text-slate-900">{new Date(fatura.dataVencimento).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Valor</span>
              <span className="text-lg font-semibold text-slate-900">{formatCurrency(fatura.valorLiquido)}</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Observações */}
      <div className="mb-8 p-4" style={{ backgroundColor: '#fafafa', border: '1px solid #e2e8f0' }}>
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3" style={{ fontSize: '10px' }}>
          Observações
        </h3>
        <ul className="text-xs text-slate-600 space-y-1.5" style={{ fontSize: '11px', lineHeight: '1.6' }}>
          <li>• Este documento tem validade legal para fins de cobrança</li>
          <li>• O pagamento após o vencimento está sujeito a juros de mora conforme legislação vigente</li>
          <li>• Em caso de dúvidas, entre em contato com o departamento financeiro</li>
        </ul>
      </div>

      {/* Rodapé Minimalista */}
      <div className="pt-6 mt-8" style={{ borderTop: '1px solid #e2e8f0' }}>
        <div className="text-center mb-6">
          <div className="text-xs text-slate-500" style={{ fontSize: '11px' }}>
            Documento gerado automaticamente em {new Date().toLocaleDateString('pt-BR', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            })} às {new Date().toLocaleTimeString('pt-BR')}
          </div>
          <div className="text-xs text-slate-400 mt-1" style={{ fontSize: '10px' }}>
            Sistema de Gestão de Leilões • Página 1 de 1
          </div>
        </div>
        <div className="text-center text-xs text-slate-400 mb-8" style={{ fontSize: '10px' }}>
          Este documento é válido sem assinatura conforme artigo 10º da MP 2.200-2/2001
        </div>
      </div>

      {/* Logos no Rodapé */}
      <div className="mt-8 flex justify-center items-center -ml-20">
        <img 
          src="/logo-elionx-softwares.png" 
          alt="Elionx Softwares" 
          className="max-h-80 object-contain opacity-90"
          style={{ maxHeight: '320px', maxWidth: '620px' }}
        />
        <img 
          src="/arthur-lira-logo.png" 
          alt="Arthur Lira Leilões" 
          className="max-h-14 object-contain opacity-90 -mt-2 -ml-16"
          style={{ maxHeight: '55px', maxWidth: '110px' }}
        />
      </div>
    </div>
  );
};

export default Faturas;

