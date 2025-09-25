import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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


function Faturas() {
  const navigate = useNavigate();
  const { auctions, isLoading } = useSupabaseAuctions();
  
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
            if (arrematante.pago) return;
            
            // CORREÇÃO: Evitar problema de fuso horário do JavaScript
            const dateStr = loteArrematado.dataVencimentoVista || new Date().toISOString().split('T')[0];
            const [year, month, day] = dateStr.split('-').map(Number);
            const dueDateObj = new Date(year, month - 1, day); // month é zero-indexed
            
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
            // Entrada + Parcelamento: primeira a entrada, depois as parcelas
            const quantidadeParcelas = (loteArrematado.parcelasPadrao || 1) + 1; // +1 para a entrada
            const valorEntrada = valorTotal * 0.5; // 50% de entrada
            const valorRestante = valorTotal - valorEntrada;
            const valorParcela = valorRestante / (quantidadeParcelas - 1);
            const parcelasPagas = arrematante.parcelasPagas || 0;
            
            if (arrematante.pago || parcelasPagas >= quantidadeParcelas) return;
            
            // Se ainda não pagou a entrada (parcela 0)
            if (parcelasPagas === 0) {
              const dataEntrada = loteArrematado.dataEntrada || new Date().toISOString().split('T')[0];
              const dueDateObj = new Date(dataEntrada);
              
              faturas.push({
                id: `${auction.id}-entrada`,
                auctionId: auction.id,
                lotId: loteArrematado.id || '',
                arrematanteId: arrematante.documento || `${auction.id}-${arrematante.nome}`,
                valorArremate: valorTotal,
                valorLiquido: valorEntrada,
                vencimento: dataEntrada,
                parcela: 1,
                totalParcelas: quantidadeParcelas,
                valorTotal: valorEntrada,
                dataVencimento: dataEntrada,
                dataPagamento: undefined,
                status: getInvoiceStatus(arrematante, 0, dueDateObj),
                observacoes: `Entrada - ${auction.identificacao || auction.nome}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                leilaoNome: auction.nome || auction.identificacao || 'Leilão sem nome',
                loteNumero: loteArrematado.numero || 'Sem número',
                arrematanteNome: arrematante.nome + ' (Entrada)',
                diasVencimento: Math.ceil((dueDateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
                statusFatura: getInvoiceStatus(arrematante, 0, dueDateObj),
                arquivado: archivedFaturas.has(`${auction.id}-entrada`),
                tipoPagamento: 'entrada_parcelamento'
              });
            } else {
              // Gerar próxima parcela (após a entrada)
              if (!loteArrematado.mesInicioPagamento || !loteArrematado.diaVencimentoPadrao) return;
              
              const proximaParcela = parcelasPagas;
              const [startYear, startMonth] = loteArrematado.mesInicioPagamento.split('-').map(Number);
              const dueDate = new Date(startYear, startMonth - 1 + (proximaParcela - 1), loteArrematado.diaVencimentoPadrao);
              
              faturas.push({
                id: `${auction.id}-parcela-${proximaParcela}`,
                auctionId: auction.id,
                lotId: loteArrematado.id || '',
                arrematanteId: arrematante.documento || `${auction.id}-${arrematante.nome}`,
                valorArremate: valorTotal,
                valorLiquido: valorParcela,
                vencimento: dueDate.toISOString().split('T')[0],
                parcela: proximaParcela + 1,
                totalParcelas: quantidadeParcelas,
                valorTotal: valorParcela,
                dataVencimento: dueDate.toISOString().split('T')[0],
                dataPagamento: undefined,
                status: getInvoiceStatus(arrematante, proximaParcela, dueDate),
                observacoes: `Parcela ${proximaParcela + 1} de ${quantidadeParcelas} - ${auction.identificacao || auction.nome}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                leilaoNome: auction.nome || auction.identificacao || 'Leilão sem nome',
                loteNumero: loteArrematado.numero || 'Sem número',
                arrematanteNome: arrematante.nome,
                diasVencimento: Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
                statusFatura: getInvoiceStatus(arrematante, proximaParcela, dueDate),
                arquivado: archivedFaturas.has(`${auction.id}-parcela-${proximaParcela}`),
                tipoPagamento: 'entrada_parcelamento'
              });
            }
            break;
          }
          
          case 'parcelamento':
          default: {
            // Parcelamento tradicional usando dados específicos do lote
            if (!loteArrematado.parcelasPadrao || !loteArrematado.mesInicioPagamento || !loteArrematado.diaVencimentoPadrao) return;
            
            const quantidadeParcelas = loteArrematado.parcelasPadrao;
            const valorParcela = valorTotal / quantidadeParcelas;
            const parcelasPagas = arrematante.parcelasPagas || 0;
            
            // Se já pagou todas as parcelas, não gera fatura
            if (parcelasPagas >= quantidadeParcelas || arrematante.pago) return;
            
            // Calcular próxima parcela (baseado em parcelas pagas)
            const proximaParcela = parcelasPagas;
            const [startYear, startMonth] = loteArrematado.mesInicioPagamento.split('-').map(Number);
            const dueDate = new Date(startYear, startMonth - 1 + proximaParcela, loteArrematado.diaVencimentoPadrao);
            
            faturas.push({
              id: `${auction.id}-parcela-${proximaParcela + 1}`,
              auctionId: auction.id,
              lotId: loteArrematado.id || '',
              arrematanteId: arrematante.documento || `${auction.id}-${arrematante.nome}`,
              valorArremate: valorTotal,
              valorLiquido: valorParcela,
              vencimento: dueDate.toISOString().split('T')[0],
              parcela: proximaParcela + 1,
              totalParcelas: quantidadeParcelas,
              valorTotal: valorParcela,
              dataVencimento: dueDate.toISOString().split('T')[0],
              dataPagamento: undefined,
              status: getInvoiceStatus(arrematante, proximaParcela, dueDate),
              observacoes: `Parcela ${proximaParcela + 1} de ${quantidadeParcelas} - ${auction.identificacao || auction.nome}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              leilaoNome: auction.nome || auction.identificacao || 'Leilão sem nome',
              loteNumero: loteArrematado.numero || 'Sem número',
              arrematanteNome: arrematante.nome,
              diasVencimento: Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
              statusFatura: getInvoiceStatus(arrematante, proximaParcela, dueDate),
              arquivado: archivedFaturas.has(`${auction.id}-parcela-${proximaParcela + 1}`),
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
  const filteredFaturas = faturasList.filter(fatura => {
    const matchesSearch = !searchTermFaturas || 
      fatura.loteNumero.toLowerCase().includes(searchTermFaturas.toLowerCase()) ||
      fatura.arrematanteNome.toLowerCase().includes(searchTermFaturas.toLowerCase()) ||
      fatura.leilaoNome.toLowerCase().includes(searchTermFaturas.toLowerCase());
    
    const matchesStatus = statusFilterFaturas === "todos" || fatura.status === statusFilterFaturas;
    const matchesArchived = showArchived ? fatura.arquivado === true : fatura.arquivado !== true;
    
    return matchesSearch && matchesStatus && matchesArchived;
  });

  // Estatísticas de faturas (apenas não arquivadas)
  const faturasAtivas = faturasList.filter(f => !f.arquivado);
  const statsFaturas = {
    total: faturasAtivas.length,
    emAberto: faturasAtivas.filter(f => f.status === "em_aberto").length,
    pagas: faturasAtivas.filter(f => f.status === "pago").length,
    atrasadas: faturasAtivas.filter(f => f.status === "atrasado").length,
    valorTotal: faturasAtivas.reduce((sum, f) => sum + f.valorLiquido, 0),
    valorPendente: faturasAtivas.filter(f => f.status === "em_aberto" || f.status === "atrasado").reduce((sum, f) => sum + f.valorLiquido, 0)
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

  const handleDownloadFatura = (faturaId: string) => {
    const fatura = faturasList.find(f => f.id === faturaId);
    if (!fatura) return;

    // Gerar HTML da fatura
    const faturaHTML = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fatura - Lote #${fatura.loteNumero}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px 20px;
                background-color: #ffffff;
                color: #333;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .header h1 {
                color: #333;
                margin: 0;
                font-size: 28px;
            }
            .header p {
                color: #666;
                margin: 5px 0;
            }
            .invoice-info {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 30px;
            }
            .info-section h2 {
                color: #333;
                font-size: 18px;
                margin-bottom: 10px;
                border-bottom: 1px solid #ddd;
                padding-bottom: 5px;
            }
            .info-item {
                margin-bottom: 8px;
            }
            .info-item strong {
                color: #333;
            }
            .amount-section {
                background-color: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 20px;
                margin: 30px 0;
                text-align: center;
            }
            .amount-section h2 {
                color: #333;
                margin-bottom: 10px;
            }
            .amount {
                font-size: 32px;
                font-weight: bold;
                color: #000;
                margin: 10px 0;
            }
            .status-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: bold;
                text-transform: uppercase;
            }
            .status-em-aberto { background-color: #e3f2fd; color: #1976d2; }
            .status-pago { background-color: #e8f5e8; color: #2e7d32; }
            .status-atrasado { background-color: #ffebee; color: #c62828; }
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                text-align: center;
                color: #666;
                font-size: 14px;
            }
            .observations {
                background-color: #f8f9fa;
                border-left: 4px solid #6c757d;
                padding: 15px;
                margin: 20px 0;
            }
            @media print {
                body { padding: 20px; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>FATURA DE ARREMATAÇÃO</h1>
            <p>Sistema de Gestão de Leilões</p>
            <p>Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div class="invoice-info">
            <div class="info-section">
                <h2>Informações do Lote</h2>
                <div class="info-item"><strong>Lote:</strong> #${fatura.loteNumero}</div>
                <div class="info-item"><strong>Leilão:</strong> ${fatura.leilaoNome}</div>
                <div class="info-item"><strong>Tipo:</strong> ${getPaymentTypeDisplay(fatura)}</div>
            </div>
            
            <div class="info-section">
                <h2>Dados do Arrematante</h2>
                <div class="info-item"><strong>Nome:</strong> ${fatura.arrematanteNome}</div>
                <div class="info-item"><strong>Data de Vencimento:</strong> ${new Date(fatura.dataVencimento).toLocaleDateString('pt-BR')}</div>
                <div class="info-item"><strong>Status:</strong> <span class="status-badge status-${fatura.status}">${getStatusText(fatura.status)}</span></div>
            </div>
        </div>

        <div class="amount-section">
            <h2>Valor da Parcela</h2>
            <div class="amount">${formatCurrency(fatura.valorLiquido)}</div>
            <p>Valor líquido a ser pago</p>
        </div>

        ${fatura.observacoes ? `
        <div class="observations">
            <h3>Observações:</h3>
            <p>${fatura.observacoes}</p>
        </div>` : ''}

        <div class="footer">
            <p>Esta fatura foi gerada automaticamente pelo sistema.</p>
            <p>Para dúvidas ou esclarecimentos, entre em contato com a administração do leilão.</p>
        </div>
    </body>
    </html>`;

    // Criar e baixar o arquivo
    const blob = new Blob([faturaHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Fatura_Lote_${fatura.loteNumero}_Parcela_${fatura.parcela}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpar a URL após o uso
    setTimeout(() => URL.revokeObjectURL(url), 100);

    console.log(`Fatura do lote #${fatura.loteNumero} baixada com sucesso`);
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
          return 'Entrada';
        } else {
          return `Parcela ${fatura.parcela - 1}/${fatura.totalParcelas - 1}`;
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
    <div className="space-y-6 p-6">
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
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Em Aberto</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
            <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{statsFaturas.emAberto}</p>
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
                        <span className="font-semibold text-black">{formatCurrency(fatura.valorLiquido)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {new Date(fatura.dataVencimento + 'T00:00:00.000Z').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
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
                            className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadFatura(fatura.id)}
                            className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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
                                  className="bg-red-600 hover:bg-red-700"
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Detalhes da Fatura
            </DialogTitle>
          </DialogHeader>
          {selectedFatura && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Lote</Label>
                  <p className="mt-1 text-sm font-semibold text-gray-900">#{selectedFatura.loteNumero}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <div className="mt-1">
                    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold font-medium ${getStatusBadgeColor(selectedFatura.status)}`}>
                      {getStatusText(selectedFatura.status)}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Arrematante</Label>
                <p className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium">
                  {selectedFatura.arrematanteNome}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    {selectedFatura.tipoPagamento === 'a_vista' ? 'Valor Total' : 'Valor da Parcela'}
                  </Label>
                  <p className="mt-1 text-lg font-semibold text-black">
                    {formatCurrency(selectedFatura.valorLiquido)}
                  </p>
                </div>
                {selectedFatura.tipoPagamento !== 'a_vista' && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      {selectedFatura.tipoPagamento === 'entrada_parcelamento' && selectedFatura.parcela === 1 ? 'Entrada' : 'Parcela'}
                    </Label>
                    <p className="mt-1 text-lg font-semibold text-black">
                      {selectedFatura.tipoPagamento === 'entrada_parcelamento' && selectedFatura.parcela === 1 
                        ? 'Entrada' 
                        : `${selectedFatura.parcela}/${selectedFatura.totalParcelas}`
                      }
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Data de Vencimento</Label>
                <p className="mt-1 text-lg font-semibold text-black">
                  {new Date(selectedFatura.dataVencimento).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Observações</Label>
                <p className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                  {selectedFatura.observacoes || 'Nenhuma observação adicional.'}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Leilão</Label>
                <p className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                  {selectedFatura.leilaoNome}
                </p>
              </div>
            </div>
          )}
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
                className="bg-green-600 hover:bg-green-700"
              >
                {isEditingFatura ? "Salvar Alterações" : "Criar Fatura"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default Faturas;
