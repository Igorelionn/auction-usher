import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import html2pdf from 'html2pdf.js';
import {
  ArrowLeft,
  FileText,
  Download,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  Gavel,
  Clock,
  FileSpreadsheet,
  Printer,
  Mail,
  Eye,
  CreditCard
} from "lucide-react";
import { useSupabaseAuctions } from "@/hooks/use-supabase-auctions";
import { useToast } from "@/hooks/use-toast";
import { StringDatePicker } from "@/components/ui/date-picker";
import { PdfReport } from "@/components/PdfReport";

// Função para verificar se um arrematante está inadimplente (considera tipos de pagamento)
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
      if (parcelasPagas >= (1 + quantidadeParcelas)) return false;
      
      if (parcelasPagas === 0) {
        // Entrada não foi paga - verificar se está atrasada
        if (!loteArrematado.dataEntrada) return false;
        const dateStr = loteArrematado.dataEntrada;
        const [year, month, day] = dateStr.split('-').map(Number);
        const entradaDueDate = new Date(year, month - 1, day);
        entradaDueDate.setHours(23, 59, 59, 999);
        return now > entradaDueDate;
      } else {
        // Entrada foi paga - verificar se há parcelas atrasadas
        if (!arrematante.mesInicioPagamento || !arrematante.diaVencimentoMensal) return false;
        const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
        
        // Verificar todas as parcelas que deveriam ter sido pagas até agora
        const parcelasEfetivasPagas = parcelasPagas - 1; // -1 porque a primeira "parcela paga" é a entrada
        
        for (let i = 0; i < quantidadeParcelas; i++) {
          const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal);
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
      if (!arrematante.mesInicioPagamento || !arrematante.diaVencimentoMensal) return false;
      
      const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
      const parcelasPagas = arrematante.parcelasPagas || 0;
      const quantidadeParcelas = arrematante.quantidadeParcelas || 12;
      
      if (parcelasPagas >= quantidadeParcelas) return false;
      
      const nextPaymentDate = new Date(startYear, startMonth - 1 + parcelasPagas, arrematante.diaVencimentoMensal);
      nextPaymentDate.setHours(23, 59, 59, 999);
      return now > nextPaymentDate;
    }
  }
};

interface RelatorioConfig {
  tipo: string;
  periodo: {
    inicio: string;
    fim: string;
  };
  filtros: {
    status?: string;
    local?: string;
    incluirArquivados?: boolean;
    dataInicio?: string;
    dataFim?: string;
  };
  formato: 'pdf' | 'excel' | 'csv';
}

function Relatorios() {
  const { auctions, isLoading } = useSupabaseAuctions();
  const { toast } = useToast();
  const [config, setConfig] = useState<RelatorioConfig>({
    tipo: "",
    periodo: {
      inicio: "",
      fim: ""
    },
    filtros: {
      status: "todos",
      local: "todos",
      incluirArquivados: false
    },
    formato: 'pdf'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Estados para o modal de preview
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'leiloes' | 'inadimplencia' | 'historico' | 'faturas'>('leiloes');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'todos' | 'a_vista' | 'parcelamento' | 'entrada_parcelamento'>('todos');
  
  // Estados para o modal de PDF temporário (invisível)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedAuctionForExport, setSelectedAuctionForExport] = useState<string>("");

  // Tipos de relatórios disponíveis
  const tiposRelatorio = [
    { id: 'leiloes', nome: 'Leilões', icon: Gavel, descricao: 'Lista completa de leilões com detalhes e status', categoria: 'Operacional' },
    { id: 'financeiro', nome: 'Financeiro', icon: DollarSign, descricao: 'Receitas, custos e análise de lucros', categoria: 'Financeiro' },
    { id: 'arrematantes', nome: 'Arrematantes', icon: Users, descricao: 'Perfil dos compradores e histórico de pagamentos', categoria: 'Clientes' },
    { id: 'lotes', nome: 'Lotes', icon: Package, descricao: 'Inventário completo e status dos itens', categoria: 'Operacional' },
    { id: 'performance', nome: 'Performance', icon: TrendingUp, descricao: 'Métricas de desempenho e análise de tendências', categoria: 'Análise' },
    { id: 'agenda', nome: 'Agenda', icon: Calendar, descricao: 'Cronograma de eventos e planejamento', categoria: 'Planejamento' }
  ];

  // Estatísticas rápidas
  const stats = {
    totalLeiloes: auctions?.filter(a => !a.arquivado).length || 0,
    leiloesAtivos: auctions?.filter(a => a.status === 'em_andamento').length || 0,
    totalReceita: auctions?.reduce((sum, a) => {
      const custos = typeof a.custos === 'string' ? 
        parseFloat(a.custos.replace(/[^\d,]/g, '').replace(',', '.')) || 0 : 
        a.custos || 0;
      return sum + custos;
    }, 0) || 0,
    totalArrematantes: auctions?.filter(a => a.arrematante && !a.arquivado).length || 0
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para abrir preview de relatório de leilões
  const openLeiloesPreview = () => {
    setPreviewType('leiloes');
    setIsPreviewModalOpen(true);
  };

  // Função para abrir preview de outros relatórios
  const openGenericPreview = (type: 'inadimplencia' | 'historico' | 'faturas') => {
    setPreviewType(type);
    setIsPreviewModalOpen(true);
  };

  // Função para gerar PDF de todos os leilões - usando o mesmo método que funciona
  const generateLeiloesReport = async () => {
    console.log('🔍 Iniciando geração do relatório de leilões...');
    console.log('📊 Leilões disponíveis:', auctions?.length);

    if (!auctions || auctions.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum leilão encontrado para gerar o relatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      
      // Filtrar apenas leilões não arquivados
      const leiloesAtivos = auctions.filter(a => !a.arquivado);
      console.log('📈 Leilões ativos (não arquivados):', leiloesAtivos.length);
      
      if (leiloesAtivos.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhum leilão ativo encontrado para gerar o relatório.",
          variant: "destructive",
        });
        return;
      }

      // Usar o mesmo método que funciona na página leilões
      // 1. Abrir modal temporário com o primeiro leilão
      setSelectedAuctionForExport(leiloesAtivos[0].id);
      setIsExportModalOpen(true);
      
      // 2. Aguardar renderização do componente React
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. Pegar o elemento que foi renderizado pelo React
      const element = document.getElementById('pdf-content');
      if (!element) {
        throw new Error('Elemento PDF não encontrado - modal não renderizou');
      }

      console.log('📄 Elemento encontrado:', element);
      console.log('📐 Dimensões:', element.offsetWidth, 'x', element.offsetHeight);

      // 4. Usar html2pdf importado estaticamente

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `relatorio-completo-leiloes-${new Date().toISOString().split('T')[0]}.pdf`,
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

      console.log('🔄 Iniciando conversão para PDF...');
      
      // 5. Gerar PDF do elemento renderizado pelo React (mesmo método que funciona)
      await html2pdf().set(opt).from(element).save();
      
      console.log('✅ PDF gerado com sucesso!');
      
      toast({
        title: "✅ Relatório Gerado com Sucesso!",
        description: `Relatório de leilão ${leiloesAtivos[0].identificacao || leiloesAtivos[0].id} foi baixado.`,
        duration: 4000,
      });
      
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error);
      toast({
        title: "Erro ao Gerar Relatório",
        description: "Ocorreu um erro ao gerar o relatório. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      // Sempre fechar o modal no final
      setIsExportModalOpen(false);
      setSelectedAuctionForExport("");
    }
  };

  // Função auxiliar para criar conteúdo PDF de um leilão específico
  const createPdfContentForAuction = (auction: any) => {
    const formatDate = (dateString?: string) => {
      if (!dateString) return 'Não informado';
      try {
        return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
      } catch {
        return 'Data inválida';
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'agendado': return 'Agendado';
        case 'em_andamento': return 'Em Andamento';
        case 'finalizado': return 'Finalizado';
        default: return status || 'Não informado';
      }
    };

    const getLocalLabel = (local: string) => {
      switch (local) {
        case 'presencial': return 'Presencial';
        case 'online': return 'Online';
        case 'hibrido': return 'Híbrido';
        default: return local || 'Não informado';
      }
    };

    const formatCurrency = (value: string | number | undefined) => {
      if (!value && value !== 0) return 'R$ 0,00';
      
      if (typeof value === 'number') {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      }
      
      if (typeof value === 'string') {
        if (value.startsWith('R$')) return value;
        const cleanValue = value.replace(/[^\d.,]/g, '');
        if (cleanValue.includes(',')) {
          const numericValue = parseFloat(cleanValue.replace(/\./g, '').replace(',', '.'));
          if (!isNaN(numericValue)) {
            return new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(numericValue);
          }
        } else if (cleanValue) {
          const numericValue = parseFloat(cleanValue);
          if (!isNaN(numericValue)) {
            return new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(numericValue);
          }
        }
        return `R$ ${value}`;
      }
      
      return 'R$ 0,00';
    };

    return `
      <div style="background: white; color: black;">
        <!-- Identificação do Leilão -->
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 16px; font-weight: bold; color: #1a1a1a; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 8px;">
            📋 IDENTIFICAÇÃO DO LEILÃO
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div><strong>Código:</strong> ${auction.identificacao || 'Não informado'}</div>
            <div><strong>Nome:</strong> ${auction.nome || 'Não informado'}</div>
            <div><strong>Status:</strong> ${getStatusLabel(auction.status)}</div>
            <div><strong>Local:</strong> ${getLocalLabel(auction.local)}</div>
            <div style="grid-column: 1 / -1;"><strong>Endereço:</strong> ${auction.endereco || 'Não informado'}</div>
          </div>
        </div>

        <!-- Cronograma -->
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 16px; font-weight: bold; color: #1a1a1a; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 8px;">
            📅 CRONOGRAMA
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div><strong>Data de Início:</strong> ${formatDate(auction.dataInicio)}</div>
            <div><strong>Data de Encerramento:</strong> ${formatDate(auction.dataEncerramento)}</div>
          </div>
        </div>

        ${auction.arrematante ? `
        <!-- Arrematante -->
        <div style="margin-bottom: 20px; background: #e8f5e8; padding: 15px; border-radius: 8px;">
          <h2 style="font-size: 16px; font-weight: bold; color: #2d5016; margin-bottom: 15px; border-bottom: 1px solid #c3e6c3; padding-bottom: 8px;">
            👤 ARREMATANTE
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div><strong>Nome:</strong> ${auction.arrematante.nome || 'Não informado'}</div>
            <div><strong>CPF/CNPJ:</strong> ${auction.arrematante.documento || 'Não informado'}</div>
            <div><strong>Email:</strong> ${auction.arrematante.email || 'Não informado'}</div>
            <div><strong>Telefone:</strong> ${auction.arrematante.telefone || 'Não informado'}</div>
            <div><strong>Valor Total:</strong> ${formatCurrency(auction.arrematante.valorPagar)}</div>
            <div><strong>Status Pagamento:</strong> ${auction.arrematante.pago ? '✅ Pago' : (isOverdue(auction.arrematante, auction) ? '🔴 ATRASADO' : '⏳ Pendente')}</div>
            ${auction.arrematante.endereco ? `<div style="grid-column: 1 / -1;"><strong>Endereço:</strong> ${auction.arrematante.endereco}</div>` : ''}
          </div>
        </div>
        ` : ''}

        ${auction.lotes && auction.lotes.length > 0 ? `
        <!-- Lotes -->
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 16px; font-weight: bold; color: #1a1a1a; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 8px;">
            📦 LOTES (${auction.lotes.length})
          </h2>
          <div style="space-y: 15px;">
            ${auction.lotes.map((lote: any) => `
              <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 8px;">Lote ${lote.numero}</h3>
                <p style="font-size: 12px; color: #666; margin-bottom: 8px;">${lote.descricao || 'Sem descrição'}</p>
                ${lote.mercadorias && lote.mercadorias.length > 0 ? `
                  <div style="font-size: 11px; color: #555;">
                    <strong>Mercadorias (${lote.mercadorias.length}):</strong><br>
                    ${lote.mercadorias.map((m: any) => `• ${m.nome || m.tipo} - ${m.descricao || 'Sem descrição'} ${m.valorNumerico ? `(${formatCurrency(m.valorNumerico)})` : ''}`).join('<br>')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${auction.historicoNotas && auction.historicoNotas.length > 0 ? `
        <!-- Observações -->
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 16px; font-weight: bold; color: #1a1a1a; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 8px;">
            📝 OBSERVAÇÕES
          </h2>
          <div style="background: #f8f9fa; padding: 12px; border-radius: 8px;">
            ${auction.historicoNotas.map((nota: string) => `<div style="margin-bottom: 8px; font-size: 12px;">• ${nota}</div>`).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  };

  const handleGerarRelatorio = async () => {
    if (!config.tipo) {
      alert("Selecione um tipo de relatório");
      return;
    }

    setIsGenerating(true);
    
    // Simular geração de relatório
    setTimeout(() => {
      setIsGenerating(false);
      alert(`Relatório ${tiposRelatorio.find(t => t.id === config.tipo)?.nome} gerado com sucesso!`);
    }, 2000);
  };

  // Função para gerar outros tipos de relatórios
  const generateGenericReport = async (type: 'inadimplencia' | 'historico' | 'faturas') => {
    if (!auctions || auctions.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum leilão encontrado para gerar o relatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      
      let titulo = '';
      let dadosRelatorio = '';
      
      if (type === 'inadimplencia') {
        titulo = 'RELATÓRIO DE INADIMPLÊNCIA';
        const inadimplentes = auctions.filter(auction => {
          if (!auction.arrematante || auction.arrematante.pago) return false;
          
          const now = new Date();
          
          // Verificar se está atrasado baseado no tipo de pagamento
          const loteArrematado = auction.arrematante?.loteId 
            ? auction.lotes?.find(lote => lote.id === auction.arrematante.loteId)
            : null;
          
          const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento;
          
          if (tipoPagamento === 'a_vista') {
            const dataVencimento = loteArrematado?.dataVencimentoVista || auction.dataVencimentoVista;
            if (dataVencimento) {
              const dueDate = new Date(dataVencimento);
              dueDate.setHours(23, 59, 59, 999);
              return now > dueDate;
            }
          }
          
          if (tipoPagamento === 'entrada_parcelamento') {
            const dataEntrada = loteArrematado?.dataEntrada || auction.dataEntrada;
            if (dataEntrada) {
              const entryDueDate = new Date(dataEntrada);
              entryDueDate.setHours(23, 59, 59, 999);
              if (now > entryDueDate) return true;
            }
          }
          
          // Para parcelamento, verificar primeira parcela
          if (auction.arrematante.mesInicioPagamento && auction.arrematante.diaVencimentoMensal) {
            try {
              let year: number, month: number;
              
              if (auction.arrematante.mesInicioPagamento.includes('-')) {
                [year, month] = auction.arrematante.mesInicioPagamento.split('-').map(Number);
              } else {
                year = new Date().getFullYear();
                month = parseInt(auction.arrematante.mesInicioPagamento);
              }
              
              const firstPaymentDate = new Date(year, month - 1, auction.arrematante.diaVencimentoMensal);
              firstPaymentDate.setHours(23, 59, 59, 999);
              
              if (now > firstPaymentDate && (auction.arrematante.parcelasPagas || 0) === 0) {
                return true;
              }
            } catch (error) {
              console.error('Erro ao calcular inadimplência:', error);
            }
          }
          
          return false;
        });
        
        dadosRelatorio = inadimplentes.map(auction => `
          <div style="margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; padding: 15px; page-break-inside: avoid;">
            <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #dc2626;">
              ${auction.identificacao ? `#${auction.identificacao}` : auction.nome || 'Leilão sem nome'}
            </h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 12px;">
              <div><strong>Arrematante:</strong> ${auction.arrematante?.nome || 'N/A'}</div>
              <div><strong>CPF/CNPJ:</strong> ${auction.arrematante?.documento || 'N/A'}</div>
              <div><strong>Telefone:</strong> ${auction.arrematante?.telefone || 'N/A'}</div>
              <div><strong>Valor Total:</strong> ${auction.arrematante?.valorPagar || 'N/A'}</div>
              <div><strong>Data do Leilão:</strong> ${auction.dataInicio ? new Date(auction.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</div>
              <div><strong>Parcelas Pagas:</strong> ${auction.arrematante?.parcelasPagas || 0} de ${auction.arrematante?.quantidadeParcelas || 0}</div>
            </div>
          </div>
        `).join('') || '<p style="text-align: center; color: #666; font-style: italic;">Nenhuma inadimplência encontrada.</p>';
        
      } else if (type === 'historico') {
        titulo = 'RELATÓRIO DE HISTÓRICO';
        const comArrematante = auctions.filter(a => a.arrematante && !a.arquivado);
        
        dadosRelatorio = comArrematante.map(auction => `
          <div style="margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; padding: 15px; page-break-inside: avoid;">
            <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">
              ${auction.identificacao ? `#${auction.identificacao}` : auction.nome || 'Leilão sem nome'}
            </h3>
            <div style="font-size: 12px;">
              <div style="margin-bottom: 10px;">
                <strong>Arrematante:</strong> ${auction.arrematante?.nome || 'N/A'}<br>
                <strong>Data:</strong> ${auction.dataInicio ? new Date(auction.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}<br>
                <strong>Status:</strong> ${auction.arrematante?.pago ? 'Pago' : (isOverdue(auction.arrematante, auction) ? 'ATRASADO' : 'Pendente')}
              </div>
              ${auction.historicoNotas && auction.historicoNotas.length > 0 ? `
                <div style="background: #f5f5f5; padding: 8px; border-radius: 4px;">
                  <strong>Observações:</strong><br>
                  ${auction.historicoNotas.map(nota => `• ${nota}`).join('<br>')}
                </div>
              ` : ''}
            </div>
          </div>
        `).join('') || '<p style="text-align: center; color: #666; font-style: italic;">Nenhum histórico encontrado.</p>';
        
      } else if (type === 'faturas') {
        titulo = 'RELATÓRIO DE FATURAS';
        const comFinanceiro = auctions.filter(a => a.arrematante && !a.arquivado);
        
        dadosRelatorio = comFinanceiro.map(auction => `
          <div style="margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; padding: 15px; page-break-inside: avoid;">
            <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">
              Fatura - ${auction.identificacao ? `#${auction.identificacao}` : auction.nome || 'Leilão sem nome'}
            </h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 12px;">
              <div><strong>Cliente:</strong> ${auction.arrematante?.nome || 'N/A'}</div>
              <div><strong>CPF/CNPJ:</strong> ${auction.arrematante?.documento || 'N/A'}</div>
              <div><strong>Valor Total:</strong> ${auction.arrematante?.valorPagar || 'N/A'}</div>
              <div><strong>Status:</strong> ${auction.arrematante?.pago ? 'Pago' : (isOverdue(auction.arrematante, auction) ? 'ATRASADO' : 'Pendente')}</div>
              <div><strong>Data Leilão:</strong> ${auction.dataInicio ? new Date(auction.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</div>
              <div><strong>Parcelas:</strong> ${auction.arrematante?.parcelasPagas || 0}/${auction.arrematante?.quantidadeParcelas || 0}</div>
            </div>
            ${auction.arrematante?.valorPagarNumerico && auction.arrematante?.quantidadeParcelas ? `
              <div style="margin-top: 10px; padding: 8px; background: #f0f9ff; border-radius: 4px; font-size: 11px;">
                <strong>Detalhamento:</strong><br>
                Valor por parcela: ${(auction.arrematante.valorPagarNumerico / auction.arrematante.quantidadeParcelas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<br>
                Dia vencimento: ${auction.arrematante?.diaVencimentoMensal || 'N/A'}
              </div>
            ` : ''}
          </div>
        `).join('') || '<p style="text-align: center; color: #666; font-style: italic;">Nenhuma fatura encontrada.</p>';
      }
      
      // Criar o elemento HTML para o relatório
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: black;">
          <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px;">
            <h1 style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin-bottom: 10px;">
              ${titulo}
            </h1>
            <p style="color: #666; font-size: 12px;">
              Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>
          
          ${dadosRelatorio}
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #333; text-align: center;">
            <div style="font-size: 10px; color: #666;">
              Página 1 de 1 - Data: ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(element);
      
      // Importar html2pdf dinamicamente
      const html2pdf = (await import('html2pdf.js')).default;

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `relatorio_${type}_${new Date().toISOString().split('T')[0]}.pdf`,
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

      await html2pdf().set(opt).from(element).save();
      
      // Limpar elemento temporário
      document.body.removeChild(element);
      
      toast({
        title: "Relatório Gerado com Sucesso!",
        description: `Relatório de ${type} foi baixado.`,
        duration: 4000,
      });
      
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro ao Gerar Relatório",
        description: "Ocorreu um erro ao gerar o relatório. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewRelatorio = () => {
    if (!config.tipo) {
      alert("Selecione um tipo de relatório");
      return;
    }
    
    alert(`Visualizando preview do relatório: ${tiposRelatorio.find(t => t.id === config.tipo)?.nome}`);
  };

  // Função para fazer download a partir do preview
  const handleDownloadFromPreview = async () => {
    setIsPreviewModalOpen(false);
    
    // Usar sempre o mesmo método que funciona para todos os tipos
    if (previewType === 'leiloes') {
      await generateLeiloesReport();
    } else {
      // Para inadimplência, histórico e faturas, usar o mesmo método
      await generateAnyReport(previewType);
    }
  };

  // Função unificada para gerar qualquer tipo de relatório usando o método que funciona
  const generateAnyReport = async (reportType: 'leiloes' | 'inadimplencia' | 'historico' | 'faturas') => {
    console.log(`🔍 Iniciando geração do relatório de ${reportType}...`);

    if (!auctions || auctions.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum leilão encontrado para gerar o relatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);

      // 1. Abrir modal temporário invisível
      setSelectedAuctionForExport(auctions[0]?.id || "temp");
      setIsExportModalOpen(true);
      
      // 2. Aguardar renderização do componente React
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. Pegar o elemento que foi renderizado pelo React
      const element = document.getElementById('pdf-content');
      if (!element) {
        throw new Error('Elemento PDF não encontrado - modal não renderizou');
      }

      console.log('📄 Elemento encontrado:', element);
      console.log('📐 Dimensões:', element.offsetWidth, 'x', element.offsetHeight);

      // 4. Usar html2pdf importado estaticamente

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`,
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

      console.log('🔄 Iniciando conversão para PDF...');
      
      // 5. Gerar PDF do elemento renderizado pelo React
      await html2pdf().set(opt).from(element).save();
      
      console.log('✅ PDF gerado com sucesso!');
      
      const typeNames = {
        'leiloes': 'leilões',
        'inadimplencia': 'inadimplência',
        'historico': 'histórico',
        'faturas': 'faturas'
      };
      
      toast({
        title: "✅ Relatório Gerado com Sucesso!",
        description: `Relatório de ${typeNames[reportType]} foi baixado.`,
        duration: 4000,
      });
      
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error);
      toast({
        title: "Erro ao Gerar Relatório",
        description: "Ocorreu um erro ao gerar o relatório. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      // Sempre fechar o modal no final
      setIsExportModalOpen(false);
      setSelectedAuctionForExport("");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Central de Relatórios</h1>
          <p className="text-muted-foreground mt-2">Gere relatórios detalhados e análises profissionais dos seus leilões</p>
        </div>
      </div>

      {/* Cards de Relatórios Rápidos */}
      <div className="space-y-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-2">
            <FileText className="h-5 w-5 text-gray-600" />
            Relatórios Rápidos
          </h2>
          <p className="text-muted-foreground text-sm">
            Baixe relatórios específicos com um clique
          </p>
        </div>
        
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card Relatório de Leilões */}
            <div className="relative p-8 hover:bg-gray-50/50 transition-colors group">
              {/* Pontos nos cantos */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-l-2 border-t-2 border-gray-400 border-dashed"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 border-r-2 border-t-2 border-gray-400 border-dashed"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-l-2 border-b-2 border-gray-400 border-dashed"></div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-r-2 border-b-2 border-gray-400 border-dashed"></div>
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 flex items-center justify-center">
                  <Gavel className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Leilões</h3>
                  <p className="text-xs text-gray-600">Relatório completo dos leilões</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-700"
                  onClick={() => openLeiloesPreview()}
                  disabled={isGenerating}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Gerando...' : 'Baixar Relatório'}
                </Button>
              </div>
            </div>

            {/* Card Relatório de Inadimplência */}
            <div className="relative p-8 hover:bg-gray-50/50 transition-colors group">
              {/* Pontos nos cantos */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-l-2 border-t-2 border-gray-400 border-dashed"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 border-r-2 border-t-2 border-gray-400 border-dashed"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-l-2 border-b-2 border-gray-400 border-dashed"></div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-r-2 border-b-2 border-gray-400 border-dashed"></div>
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Inadimplência</h3>
                  <p className="text-xs text-gray-600">Status de pagamentos em atraso</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-700"
                  onClick={() => openGenericPreview('inadimplencia')}
                  disabled={isGenerating}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Gerando...' : 'Baixar Relatório'}
                </Button>
              </div>
            </div>

            {/* Card Relatório de Histórico */}
            <div className="relative p-8 hover:bg-gray-50/50 transition-colors group">
              {/* Pontos nos cantos */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-l-2 border-t-2 border-gray-400 border-dashed"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 border-r-2 border-t-2 border-gray-400 border-dashed"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-l-2 border-b-2 border-gray-400 border-dashed"></div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-r-2 border-b-2 border-gray-400 border-dashed"></div>
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Histórico</h3>
                  <p className="text-xs text-gray-600">Histórico detalhado por cliente</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-700"
                  onClick={() => openGenericPreview('historico')}
                  disabled={isGenerating}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Gerando...' : 'Baixar Relatório'}
                </Button>
              </div>
            </div>

            {/* Card Relatório de Faturas */}
            <div className="relative p-8 hover:bg-gray-50/50 transition-colors group">
              {/* Pontos nos cantos */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-l-2 border-t-2 border-gray-400 border-dashed"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 border-r-2 border-t-2 border-gray-400 border-dashed"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-l-2 border-b-2 border-gray-400 border-dashed"></div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-r-2 border-b-2 border-gray-400 border-dashed"></div>
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Faturas</h3>
                  <p className="text-xs text-gray-600">Controle financeiro e cobrança</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-700"
                  onClick={() => openGenericPreview('faturas')}
                  disabled={isGenerating}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Gerando...' : 'Baixar Relatório'}
                </Button>
              </div>
            </div>
          </div>
                  </div>
                  
      <div>
        {/* Dashboard de Análise */}
        <div>
          <Card className="min-h-[480px]">
            <CardContent className="p-8">
              <div>
                {/* Gráfico */}
                <div>
                  <div className="bg-white p-4 h-full">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-medium text-gray-900 flex items-center" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', height: '40px' }}>
                        {config.periodo.inicio === 'trimestral' ? 'Faturamento & Despesas por Trimestre' : 
                         config.periodo.inicio === 'anual' ? 'Faturamento & Despesas' : 
                         config.periodo.inicio === 'personalizado' ? 'Faturamento & Despesas - Período Personalizado' :
                         'Faturamento & Despesas por Mês'}
                          </h3>

                      {config.periodo.inicio === 'personalizado' ? (
                        <div className="flex items-center bg-gray-100 rounded-lg p-2 gap-3" style={{ height: '48px' }}>
                          <button
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                            onClick={() => setConfig({
                              ...config,
                              periodo: { inicio: 'mensal', fim: 'mensal' },
                              filtros: { ...config.filtros, dataInicio: undefined, dataFim: undefined }
                            })}
                          >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar
                          </button>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium text-gray-700">De:</Label>
                    <StringDatePicker
                              value={config.filtros.dataInicio || ''}
                      onChange={(value) => setConfig({
                        ...config,
                                filtros: { ...config.filtros, dataInicio: value }
                      })}
                              placeholder="Data inicial"
                              className="text-sm h-8"
                    />
                  </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium text-gray-700">Até:</Label>
                    <StringDatePicker
                              value={config.filtros.dataFim || ''}
                      onChange={(value) => setConfig({
                        ...config,
                                filtros: { ...config.filtros, dataFim: value }
                      })}
                              placeholder="Data final"
                              className="text-sm h-8"
                    />
                  </div>
                </div>
                      ) : (
                        <div className="flex items-center bg-gray-100 rounded-lg p-1" style={{ height: '40px' }}>
                          <button
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              config.periodo.inicio === 'mensal' || !config.periodo.inicio
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                            onClick={() => setConfig({
                              ...config,
                              periodo: { inicio: 'mensal', fim: 'mensal' }
                            })}
                          >
                            Mensal
                          </button>
                          <button
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              config.periodo.inicio === 'trimestral'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                            onClick={() => setConfig({
                              ...config,
                              periodo: { inicio: 'trimestral', fim: 'trimestral' }
                            })}
                          >
                            Trimestral
                          </button>
                          <button
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              config.periodo.inicio === 'anual'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                            onClick={() => setConfig({
                        ...config,
                              periodo: { inicio: 'anual', fim: 'anual' }
                            })}
                          >
                            Anual
                          </button>
                          <button
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              config.periodo.inicio === 'personalizado'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                            onClick={() => setConfig({
                        ...config,
                              periodo: { inicio: 'personalizado', fim: 'personalizado' }
                            })}
                          >
                            Personalizado
                          </button>
                  </div>
                      )}
                </div>

                {/* Legenda */}
                <div className="flex items-center gap-6 mt-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                    <span className="text-sm text-gray-600 font-medium">Faturamento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-sm text-gray-600 font-medium">Despesas</span>
                  </div>
                </div>

                
                    <div className="h-96 mt-4">
                      <svg width="100%" height="100%" viewBox="0 0 1400 420" style={{ cursor: 'crosshair' }}>
                        {/* Grid horizontal - linhas sutis */}
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((line) => (
                          <line
                            key={line}
                            x1="30"
                            y1={25 + line * 50}
                            x2="1380"
                            y2={25 + line * 50}
                            stroke="#d1d5db"
                            strokeWidth="1"
                          />
                        ))}
                        
                        {/* Períodos - Labels dinâmicos baseados no tipo de gráfico */}
                        {(() => {
                          // Usar os mesmos dados calculados no gráfico
                          const tipoGrafico = config.periodo.inicio || 'mensal';
                          let labelsData = [];
                          
                          if (tipoGrafico === 'personalizado') {
                            const dataInicio = config.filtros.dataInicio ? new Date(config.filtros.dataInicio) : new Date(new Date().getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
                            const dataFim = config.filtros.dataFim ? new Date(config.filtros.dataFim) : new Date();
                            
                            const start = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
                            const end = new Date(dataFim.getFullYear(), dataFim.getMonth(), 1);
                            
                            const current = new Date(start);
                            while (current <= end) {
                              labelsData.push(current.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
                              current.setMonth(current.getMonth() + 1);
                            }
                          } else if (tipoGrafico === 'trimestral') {
                            const currentQuarter = Math.floor(new Date().getMonth() / 3);
                            for (let i = 7; i >= 0; i--) {
                              let quarter = currentQuarter - i;
                              let year = new Date().getFullYear();
                              
                              while (quarter < 0) {
                                quarter += 4;
                                year -= 1;
                              }
                              
                              labelsData.push(`${quarter + 1}º trim./${year.toString().slice(2)}`);
                            }
                          } else if (tipoGrafico === 'anual') {
                            const now = new Date();
                            for (let i = 9; i >= 0; i--) {
                              labelsData.push((now.getFullYear() - i).toString());
                            }
                          } else {
                            // Mensal
                            const now = new Date();
                            for (let i = 11; i >= 0; i--) {
                              const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
                              labelsData.push(monthStart.toLocaleDateString('pt-BR', { month: 'short' }));
                            }
                          }
                          
                          const quantidadePeriodos = labelsData.length;
                          const espacamentoX = quantidadePeriodos > 1 ? (1400 - 60) / (quantidadePeriodos - 1) : 0;
                          
                          return labelsData.map((label, i) => (
                            <text
                              key={i}
                              x={30 + (i * espacamentoX)}
                              y="405"
                              fill="#6B7280"
                              fontSize="14"
                              textAnchor="middle"
                              fontWeight="500"
                            >
                              {label}
                            </text>
                          ));
                        })()}
                        
                        {/* Dados do gráfico */}
                        {(() => {
                          const chartData = [];
                          const now = new Date();
                          const tipoGrafico = config.periodo.inicio || 'mensal';
                          
                          if (tipoGrafico === 'personalizado') {
                            // Período personalizado - por meses dentro do intervalo
                            const dataInicio = config.filtros.dataInicio ? new Date(config.filtros.dataInicio) : new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
                            const dataFim = config.filtros.dataFim ? new Date(config.filtros.dataFim) : now;
                            
                            const meses = [];
                            const start = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
                            const end = new Date(dataFim.getFullYear(), dataFim.getMonth(), 1);
                            
                            const current = new Date(start);
                            while (current <= end) {
                              const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
                              const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
                              
                              const monthAuctions = (auctions || []).filter(auction => {
                                const auctionDate = new Date(auction.dataInicio);
                                return auctionDate >= monthStart && auctionDate <= monthEnd && auctionDate >= dataInicio && auctionDate <= dataFim;
                              });
                              
                              chartData.push({
                                count: monthAuctions.length,
                                month: monthStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
                              });
                              
                              current.setMonth(current.getMonth() + 1);
                            }
                          } else if (tipoGrafico === 'trimestral') {
                            // Últimos 8 trimestres para linha mais larga
                            const currentQuarter = Math.floor(now.getMonth() / 3);
                            
                            for (let i = 7; i >= 0; i--) {
                              let quarter = currentQuarter - i;
                              let year = now.getFullYear();
                              
                              while (quarter < 0) {
                                quarter += 4;
                                year -= 1;
                              }
                              
                              const quarterStart = new Date(year, quarter * 3, 1);
                              const quarterEnd = new Date(year, (quarter + 1) * 3, 0);
                              
                              const quarterAuctions = (auctions || []).filter(auction => {
                                const auctionDate = new Date(auction.dataInicio);
                                return auctionDate >= quarterStart && auctionDate <= quarterEnd;
                              });
                              
                              chartData.push({
                                count: quarterAuctions.length,
                                month: `${quarter + 1}º trim./${year.toString().slice(2)}`
                              });
                            }
                          } else if (tipoGrafico === 'anual') {
                            // Últimos 10 anos para linha mais larga
                            for (let i = 9; i >= 0; i--) {
                              const yearStart = new Date(now.getFullYear() - i, 0, 1);
                              const yearEnd = new Date(now.getFullYear() - i + 1, 0, 0);
                              
                              const yearAuctions = (auctions || []).filter(auction => {
                                const auctionDate = new Date(auction.dataInicio);
                                return auctionDate >= yearStart && auctionDate <= yearEnd;
                              });
                              
                              chartData.push({
                                count: yearAuctions.length,
                                month: yearStart.getFullYear().toString()
                              });
                            }
                          } else {
                            // Mensal (padrão) - últimos 12 meses para linha mais larga
                            for (let i = 11; i >= 0; i--) {
                              const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
                              const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
                              
                              const monthAuctions = (auctions || []).filter(auction => {
                                const auctionDate = new Date(auction.dataInicio);
                                return auctionDate >= monthStart && auctionDate <= monthEnd;
                              });
                              
                              chartData.push({
                                count: monthAuctions.length,
                                month: monthStart.toLocaleDateString('pt-BR', { month: 'short' })
                              });
                            }
                          }
                          
                          const maxValue = Math.max(...chartData.map(d => d.count), 1);
                          const adjustedMax = Math.max(maxValue, 7); // Mesma escala ajustada dos labels
                          
                          return (
                            <>
                              
                              
                              {/* Gráfico com áreas preenchidas e tooltips */}
                              {(() => {
                                const [hoveredPoint, setHoveredPoint] = React.useState(null);
                                
                                // Calcular dados de faturamento e despesas REAIS baseado no período selecionado
                                const dadosGrafico = [];
                                const tipoGrafico = config.periodo.inicio || 'mensal';
                                
                                
                                // Função para calcular valores de um período específico
                                const calcularDadosPeriodo = (dataInicio, dataFim, label) => {
                                   // FATURAMENTO = Total já recebido (incluindo pagamentos parciais)
                                  const faturamentoPeriodo = auctions?.reduce((sum, auction) => {
                                    if (auction.arrematante && !auction.arquivado) {
                                      const dataLeilao = new Date(auction.dataInicio);
                                      if (dataLeilao >= dataInicio && dataLeilao <= dataFim) {
                                        const arrematante = auction.arrematante;
                                        const parcelasPagas = arrematante?.parcelasPagas || 0;
                                        
                                        // Se totalmente pago, contar valor total
                                        if (arrematante?.pago) {
                                          const valorTotal = arrematante?.valorPagarNumerico || 0;
                                        return sum + valorTotal;
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
                                              const parcelasEfetivasPagas = Math.max(0, parcelasPagas - 1);
                                              return sum + valorEntrada + (parcelasEfetivasPagas * valorPorParcela);
                                            }
                                          } else if (tipoPagamento === 'parcelamento' || !tipoPagamento) {
                                            // Para parcelamento simples
                                            const quantidadeParcelas = arrematante?.quantidadeParcelas || 1;
                                            const valorPorParcela = valorTotal / quantidadeParcelas;
                                            return sum + (parcelasPagas * valorPorParcela);
                                          } else if (tipoPagamento === 'a_vista') {
                                            // Para à vista, se parcelasPagas > 0, foi pago
                                            return sum + (parcelasPagas > 0 ? valorTotal : 0);
                                          }
                                        }
                                      }
                                    }
                                    return sum;
                                  }, 0) || 0;
                                  
                                  // DESPESAS = Custos totais dos leilões
                                  const despesasPeriodo = auctions?.reduce((sum, auction) => {
                                    if (!auction.arquivado) {
                                      const dataLeilao = new Date(auction.dataInicio);
                                      if (dataLeilao >= dataInicio && dataLeilao <= dataFim) {
                                        // Tentar múltiplas fontes de dados para custos
                                        let custos = 0;
                                        if (auction.custosNumerico !== undefined && auction.custosNumerico > 0) {
                                          custos = auction.custosNumerico;
                                        } else if (typeof auction.custos === 'number' && auction.custos > 0) {
                                          custos = auction.custos;
                                        } else if (typeof auction.custos === 'string' && auction.custos) {
                                          const parsed = parseFloat(auction.custos.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
                                          custos = parsed;
                                        }
                                        return sum + custos;
                                      }
                                    }
                                    return sum;
                                  }, 0) || 0;
                                  return {
                                    mes: label,
                                    faturamento: faturamentoPeriodo,
                                    despesas: despesasPeriodo
                                  };
                                };
                                
                                // Preparar dados baseado no tipo de gráfico
                                const now = new Date();
                                if (tipoGrafico === 'personalizado') {
                                  // Período personalizado - por meses dentro do intervalo
                                  const dataInicio = config.filtros.dataInicio ? new Date(config.filtros.dataInicio) : new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
                                  const dataFim = config.filtros.dataFim ? new Date(config.filtros.dataFim) : now;
                                  
                                  const start = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
                                  const end = new Date(dataFim.getFullYear(), dataFim.getMonth(), 1);
                                  
                                  const current = new Date(start);
                                  while (current <= end) {
                                    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
                                    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
                                    const label = monthStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                                    
                                    dadosGrafico.push(calcularDadosPeriodo(monthStart, monthEnd, label));
                                    current.setMonth(current.getMonth() + 1);
                                  }
                                } else if (tipoGrafico === 'trimestral') {
                                  // Últimos 8 trimestres
                                  const currentQuarter = Math.floor(now.getMonth() / 3);
                                  for (let i = 7; i >= 0; i--) {
                                    let quarter = currentQuarter - i;
                                    let year = now.getFullYear();
                                    
                                    while (quarter < 0) {
                                      quarter += 4;
                                      year -= 1;
                                    }
                                    
                                    const quarterStart = new Date(year, quarter * 3, 1);
                                    const quarterEnd = new Date(year, (quarter + 1) * 3, 0);
                                    const label = `${quarter + 1}º trim./${year.toString().slice(2)}`;
                                    
                                    dadosGrafico.push(calcularDadosPeriodo(quarterStart, quarterEnd, label));
                                  }
                                } else if (tipoGrafico === 'anual') {
                                  // Últimos 10 anos
                                  for (let i = 9; i >= 0; i--) {
                                    const yearStart = new Date(now.getFullYear() - i, 0, 1);
                                    const yearEnd = new Date(now.getFullYear() - i + 1, 0, 0);
                                    const label = yearStart.getFullYear().toString();
                                    
                                    dadosGrafico.push(calcularDadosPeriodo(yearStart, yearEnd, label));
                                  }
                                } else {
                                  // Mensal - período dinâmico baseado nos leilões existentes
                                  // Encontrar a data mais antiga e mais recente dos leilões
                                  let dataMinima = new Date();
                                  let dataMaxima = new Date();
                                  
                                  if (auctions && auctions.length > 0) {
                                    const datasLeiloes = auctions.map(a => new Date(a.dataInicio));
                                    dataMinima = new Date(Math.min(...datasLeiloes.map(d => d.getTime())));
                                    dataMaxima = new Date(Math.max(...datasLeiloes.map(d => d.getTime())));
                                    
                                    // Garantir pelo menos 12 meses de visualização
                                    const dozesMesesAtras = new Date(now.getFullYear(), now.getMonth() - 11, 1);
                                    if (dataMinima > dozesMesesAtras) dataMinima = dozesMesesAtras;
                                  } else {
                                    // Fallback: últimos 12 meses se não há leilões
                                    dataMinima = new Date(now.getFullYear(), now.getMonth() - 11, 1);
                                  }
                                  
                                  // Gerar períodos mensais do mínimo ao máximo
                                  const startMonth = new Date(dataMinima.getFullYear(), dataMinima.getMonth(), 1);
                                  const endMonth = new Date(dataMaxima.getFullYear(), dataMaxima.getMonth(), 1);
                                  
                                  const current = new Date(startMonth);
                                  const mesesParaMostrar = [];
                                  
                                  while (current <= endMonth) {
                                    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
                                    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
                                    const label = monthStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                                    
                                    mesesParaMostrar.push({ start: monthStart, end: monthEnd, label });
                                    current.setMonth(current.getMonth() + 1);
                                  }
                                  
                                  // Limitar a 24 períodos para não ficar muito longo
                                  const mesesLimitados = mesesParaMostrar.slice(-24);
                                  
                                  for (const periodo of mesesLimitados) {
                                    dadosGrafico.push(calcularDadosPeriodo(periodo.start, periodo.end, periodo.label));
                                  }
                                }
                                
                                // Usar dadosGrafico ao invés de dadosMensais
                                const dadosMensais = dadosGrafico;
                                
                                
                                // Função para converter valor em coordenada Y baseada na nova escala
                                const valorParaY = (valor) => {
                                  // Pontos de referência da escala: [valor, posição Y]
                                  const pontos = [
                                    [8000000, 25],   // R$ 8M → topo
                                    [6000000, 75],   // R$ 6M
                                    [4000000, 125],  // R$ 4M  
                                    [3000000, 175],  // R$ 3M
                                    [2000000, 225],  // R$ 2M
                                    [1000000, 275],  // R$ 1M
                                    [500000, 325],   // R$ 500k
                                    [0, 375]         // R$ 0 → base
                                  ];
                                  
                                  // Se o valor é exatamente um dos pontos de referência
                                  for (let i = 0; i < pontos.length; i++) {
                                    if (valor === pontos[i][0]) {
                                      return pontos[i][1];
                                    }
                                  }
                                  
                                  // Interpolação linear entre os pontos mais próximos
                                  for (let i = 0; i < pontos.length - 1; i++) {
                                    const [valorSuperior, ySuperior] = pontos[i];
                                    const [valorInferior, yInferior] = pontos[i + 1];
                                    
                                    if (valor <= valorSuperior && valor >= valorInferior) {
                                      const proporcao = (valor - valorInferior) / (valorSuperior - valorInferior);
                                      return yInferior - proporcao * (yInferior - ySuperior);
                                    }
                                  }
                                  
                                  // Se valor está acima de 8M, usar o topo
                                  if (valor > 8000000) return 25;
                                  
                                  // Se valor está abaixo de 0, usar a base
                                  return 375;
                                };
                                
                                // Configuração das barras baseado na quantidade de períodos
                                const quantidadePeriodos = dadosMensais.length;
                                const larguraDisponivel = 1400 - 60; // Total menos margens
                                const larguraSegmento = larguraDisponivel / quantidadePeriodos;
                                const larguraBarra = Math.min(larguraSegmento * 0.3, 50); // Cada barra individual
                                const espacamentoBarra = 6; // Espaço entre faturamento e despesas
                                
                                // Função para calcular posição X das barras
                                const calcularXBarra = (indicePeriodo, tipoFaturamento = true) => {
                                  const centroSegmento = 30 + (indicePeriodo * larguraSegmento) + (larguraSegmento / 2);
                                  const larguraConjunto = (larguraBarra * 2) + espacamentoBarra;
                                  const inicioConjunto = centroSegmento - (larguraConjunto / 2);
                                  
                                  return tipoFaturamento 
                                    ? inicioConjunto 
                                    : inicioConjunto + larguraBarra + espacamentoBarra;
                                };
                                
                                // Para posicionamento de tooltips e linha vertical
                                const calcularCentroPeriodo = (indicePeriodo) => {
                                  return 30 + (indicePeriodo * larguraSegmento) + (larguraSegmento / 2);
                                };
                                
                                
                                const formatCurrency = (value) => {
                                  return new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                  }).format(value);
                                };
                                
                                return (
                                  <>
                                    {/* Barras de Faturamento */}
                                    {dadosMensais.map((dados, i) => {
                                      const alturaFaturamento = 375 - valorParaY(dados.faturamento);
                                      return (
                                        <rect
                                          key={`faturamento-${i}`}
                                          x={calcularXBarra(i, true)}
                                          y={valorParaY(dados.faturamento)}
                                          width={larguraBarra}
                                          height={Math.max(alturaFaturamento, 3)} // Altura mínima de 3px para hover
                                          fill="#6366F1"
                                          fillOpacity={alturaFaturamento < 3 ? "0.3" : "1"} // Transparente se altura mínima
                                          rx="4"
                                          ry="4"
                                          stroke="none"
                                          onMouseEnter={() => setHoveredPoint({ index: i, ...dados })}
                                          onMouseLeave={() => setHoveredPoint(null)}
                                          style={{ cursor: 'crosshair' }}
                                        />
                                      );
                                    })}
                                    
                                    {/* Barras de Despesas */}
                                    {dadosMensais.map((dados, i) => {
                                      const alturaDespesas = 375 - valorParaY(dados.despesas);
                                      return (
                                        <rect
                                          key={`despesas-${i}`}
                                          x={calcularXBarra(i, false)}
                                          y={valorParaY(dados.despesas)}
                                          width={larguraBarra}
                                          height={Math.max(alturaDespesas, 3)} // Altura mínima de 3px para hover
                                          fill="#9CA3AF"
                                          fillOpacity={alturaDespesas < 3 ? "0.3" : "1"} // Transparente se altura mínima
                                          rx="4"
                                          ry="4"
                                          stroke="none"
                                          onMouseEnter={() => setHoveredPoint({ index: i, ...dados })}
                                          onMouseLeave={() => setHoveredPoint(null)}
                                          style={{ cursor: 'crosshair' }}
                                        />
                                      );
                                    })}
                                    
                                    
                                    {/* Áreas interativas para hover */}
                                    {dadosMensais.map((dados, i) => (
                                      <g key={i}>
                                        {/* Área invisível para hover cobrindo todo o segmento do período */}
                                        <rect
                                          x={30 + (i * larguraSegmento)}
                                          y="25"
                                          width={larguraSegmento}
                                          height="350"
                                          fill="transparent"
                                          onMouseEnter={() => setHoveredPoint({ index: i, ...dados })}
                                          onMouseLeave={() => setHoveredPoint(null)}
                                          style={{ cursor: 'crosshair' }}
                                        />
                                      </g>
                                    ))}
                                    
                                    {/* Linha vertical no hover */}
                                    {hoveredPoint && (
                                      <line
                                        x1={calcularCentroPeriodo(hoveredPoint.index)}
                                        y1="25"
                                        x2={calcularCentroPeriodo(hoveredPoint.index)}
                                        y2="375"
                                        stroke="#9CA3AF"
                                        strokeWidth="1.5"
                                        strokeDasharray="4,4"
                                      />
                                    )}
                                    
                                    {/* Tooltip */}
                                    {hoveredPoint && (
                                      <g>
                                        {(() => {
                                          const pontoX = calcularCentroPeriodo(hoveredPoint.index);
                                          const larguraGrafico = 1400;
                                          const metadeGrafico = larguraGrafico / 2;
                                          const larguraTooltip = 200;
                                          const alturaTooltip = 150; // Aumentado para acomodar lucro
                                          
                                          // Calcular lucro
                                          const lucro = hoveredPoint.faturamento - hoveredPoint.despesas;
                                          const corBolaLucro = lucro >= 0 ? "#059669" : "#DC2626"; // Verde escuro se positivo, vermelho escuro se negativo
                                          
                                          // Se estiver na metade direita, posicionar à esquerda do ponto
                                          const estaDoLadoDireito = pontoX > metadeGrafico;
                                          const tooltipX = estaDoLadoDireito 
                                            ? pontoX - larguraTooltip - 15  // À esquerda do ponto
                                            : pontoX + 5;                   // À direita do ponto
                                          
                                          const textoPrincipalX = tooltipX + (estaDoLadoDireito ? 175 : 25);
                                          const textoCirculoX = tooltipX + (estaDoLadoDireito ? 175 : 25);
                                          const textoLabelX = tooltipX + (estaDoLadoDireito ? 165 : 35);
                                          const textAnchor = estaDoLadoDireito ? "end" : "start";
                                          
                                          return (
                                            <>
                                              <rect
                                                x={tooltipX}
                                                y="4"
                                                width="200"
                                                height={alturaTooltip}
                                                rx="8"
                                                fill="white"
                                                fillOpacity="0.85"
                                                stroke="#E5E7EB"
                                                strokeWidth="1"
                                              />
                                              <text
                                                x={textoPrincipalX}
                                                y="35"
                                                fill="#111827"
                                                fontSize="15"
                                                fontWeight="600"
                                                textAnchor={textAnchor}
                                              >
                                                {hoveredPoint.mes}
                                              </text>
                                              <g>
                                                <circle
                                                  cx={textoCirculoX}
                                                  cy="60"
                                                  r="4"
                                                  fill="#6366F1"
                                                />
                                                <text
                                                  x={textoLabelX}
                                                  y="65"
                                                  fill="#111827"
                                                  fontSize="14"
                                                  fontWeight="500"
                                                  textAnchor={textAnchor}
                                                >
                                                  Faturamento: {formatCurrency(hoveredPoint.faturamento)}
                                                </text>
                                              </g>
                                              <g>
                                                <circle
                                                  cx={textoCirculoX}
                                                  cy="90"
                                                  r="4"
                                                  fill="#9CA3AF"
                                                />
                                                <text
                                                  x={textoLabelX}
                                                  y="95"
                                                  fill="#111827"
                                                  fontSize="14"
                                                  fontWeight="500"
                                                  textAnchor={textAnchor}
                                                >
                                                  Despesas: {formatCurrency(hoveredPoint.despesas)}
                                                </text>
                                              </g>
                                              <g>
                                                <circle
                                                  cx={textoCirculoX}
                                                  cy="120"
                                                  r="4"
                                                  fill={corBolaLucro}
                                                />
                                                <text
                                                  x={textoLabelX}
                                                  y="125"
                                                  fill="#111827"
                                                  fontSize="14"
                                                  fontWeight="600"
                                                  textAnchor={textAnchor}
                                                >
                                                  Lucro: {formatCurrency(Math.abs(lucro))}
                                                </text>
                                              </g>
                                            </>
                                          );
                                        })()}
                                      </g>
                                    )}
                                  </>
                                );
                              })()}
                              
                              {/* Labels do eixo Y */}
                              {[0, 1, 2, 3, 4, 5, 6, 7].map((tick) => {
                                // Valores com incrementos de 500k até 8M
                                const valoresFixos = ['R$ 0', 'R$ 500k', 'R$ 1M', 'R$ 2M', 'R$ 3M', 'R$ 4M', 'R$ 6M', 'R$ 8M'];
                                const value = valoresFixos[7 - tick]; // Inverter ordem para crescente
                                
                                return (
                                  <text
                                    key={tick}
                                    x="15"
                                    y={25 + tick * 50 + 4}
                                    fill="#64748b"
                                    fontSize="14"
                                    textAnchor="end"
                                  >
                                    {value}
                                  </text>
                                );
                              })}
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
      
      {/* Modal de Preview de Relatórios - igual ao da página Leilões */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exportar Relatório - {previewType === 'leiloes' ? 'Leilões' : previewType === 'inadimplencia' ? 'Inadimplência' : previewType === 'historico' ? 'Histórico' : 'Faturas'}</DialogTitle>
            <p className="text-sm text-gray-600">
              Visualize como ficará o relatório antes de baixar
            </p>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Tipo de Relatório */}
            <div>
              <Label htmlFor="report-type">Tipo de Relatório</Label>
              <Select value={previewType} onValueChange={(value) => setPreviewType(value as any)}>
                <SelectTrigger className="focus:ring-0 focus:ring-offset-0 focus:outline-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leiloes">
                    <div className="flex items-center gap-2">
                      <Gavel className="h-4 w-4" />
                      Relatório de Leilões
                    </div>
                  </SelectItem>
                  <SelectItem value="inadimplencia">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Relatório de Inadimplência
                    </div>
                  </SelectItem>
                  <SelectItem value="historico">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Relatório de Histórico
                    </div>
                  </SelectItem>
                  <SelectItem value="faturas">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Relatório de Faturas
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Tipo de Pagamento (apenas para inadimplência) */}
            {previewType === 'inadimplencia' && (
              <div>
                <Label htmlFor="payment-type-filter">Filtrar por Tipo de Pagamento</Label>
                <Select value={paymentTypeFilter} onValueChange={(value) => setPaymentTypeFilter(value as any)}>
                  <SelectTrigger className="focus:ring-0 focus:ring-offset-0 focus:outline-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Todos os tipos
                      </div>
                    </SelectItem>
                    <SelectItem value="a_vista">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        À vista
                      </div>
                    </SelectItem>
                    <SelectItem value="parcelamento">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Parcelamento
                      </div>
                    </SelectItem>
                    <SelectItem value="entrada_parcelamento">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Entrada + Parcelamento
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Preview do Relatório */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h3 className="font-medium text-gray-900">Pré-visualização do Relatório</h3>
                <p className="text-sm text-gray-600">Este será o conteúdo do arquivo PDF</p>
              </div>
              <div className="max-h-96 overflow-y-auto p-4">
                <ReportPreview type={previewType} auctions={auctions || []} paymentTypeFilter={paymentTypeFilter} />
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsPreviewModalOpen(false)}
                className="flex-1 hover:bg-gray-100 hover:text-gray-900"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleDownloadFromPreview()}
                disabled={isGenerating}
                className="flex-1 bg-black hover:bg-gray-800 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                {isGenerating ? 'Gerando...' : 'Gerar e Baixar PDF'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal temporário invisível para geração de PDF */}
      <Dialog open={isExportModalOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" style={{ display: 'none', visibility: 'hidden' }}>
          <DialogHeader style={{ display: 'none' }}>
            <DialogTitle>Gerando Relatório...</DialogTitle>
          </DialogHeader>
          
          {/* Renderizar ReportPreview para ter o mesmo layout do preview */}
          {selectedAuctionForExport && auctions && (
            <div id="pdf-content" style={{ display: 'block', visibility: 'visible' }}>
              <ReportPreview type={previewType} auctions={auctions.filter(a => !a.arquivado)} paymentTypeFilter={paymentTypeFilter} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente de Preview do Relatório
const ReportPreview = ({ type, auctions, paymentTypeFilter = 'todos' }: { 
  type: 'leiloes' | 'inadimplencia' | 'historico' | 'faturas', 
  auctions: any[], 
  paymentTypeFilter?: 'todos' | 'a_vista' | 'parcelamento' | 'entrada_parcelamento' 
}) => {
  if (!auctions || auctions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
        <div className="text-sm">Nenhum leilão encontrado para gerar o relatório.</div>
        <div className="text-xs text-gray-400 mt-2">Verifique se existem leilões cadastrados no sistema.</div>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    try {
      return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

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

  const formatCurrency = (value: string | number | undefined) => {
    if (!value && value !== 0) return 'R$ 0,00';
    
    if (typeof value === 'number') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    }
    
    if (typeof value === 'string') {
      // Se já tem formatação R$, usa parseCurrencyToNumber para converter corretamente
      if (value.startsWith('R$')) {
        const numericValue = parseCurrencyToNumber(value);
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(numericValue);
        }
      
      // Para strings sem R$, tenta converter diretamente
      const numericValue = parseCurrencyToNumber(`R$ ${value}`);
      if (!isNaN(numericValue) && numericValue > 0) {
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(numericValue);
        }
      
      // Se não conseguiu converter, adiciona R$ se não tiver
      return `R$ ${value}`;
    }
    
    return 'R$ 0,00';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'agendado': return 'AGENDADO';
      case 'em_andamento': return 'EM ANDAMENTO';
      case 'finalizado': return 'FINALIZADO';
      default: return status?.toUpperCase() || 'NÃO INFORMADO';
    }
  };

  const getLocalLabel = (local: string) => {
    switch (local) {
      case 'presencial': return 'PRESENCIAL';
      case 'online': return 'ONLINE';
      case 'hibrido': return 'HÍBRIDO';
      default: return local?.toUpperCase() || 'NÃO INFORMADO';
    }
  };

  if (type === 'leiloes') {
    const leiloesAtivos = auctions.filter(a => !a.arquivado);
    
    return (
      <div className="bg-white space-y-4 min-h-[600px] font-sans">
        {/* Cabeçalho Corporativo */}
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
          <h1 className="text-2xl font-light text-slate-900 tracking-wider uppercase mb-2">
            Relatório de Leilões
          </h1>
          <div className="text-sm text-slate-600 font-light space-y-1">
            <div className="border-b border-slate-200 pb-1 mb-1"></div>
            <div>Data de emissão: {new Date().toLocaleDateString('pt-BR')}</div>
            <div>Horário: {new Date().toLocaleTimeString('pt-BR')}</div>
            <div>Documento: Relatório executivo de leilões ativos</div>
            <div className="text-xs text-slate-500 mt-1">
              Total de registros: {leiloesAtivos.length} leilão(ões)
            </div>
          </div>
        </div>

        {/* Lista Detalhada dos Leilões */}
        <div className="space-y-4">
          <div className="border-b border-slate-300 pb-2">
            <h2 className="text-lg font-light text-slate-900 tracking-wide">
              Registros de Leilões
            </h2>
            <p className="text-sm text-slate-600 font-light mt-1">
              Detalhamento completo dos processos licitatórios
            </p>
          </div>
          
          {leiloesAtivos.map((auction, index) => (
            <div key={auction.id} className="border-l-4 border-slate-700 bg-white" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              {/* Cabeçalho do Leilão */}
              <div className="bg-slate-50 px-8 py-3 border-b border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-light text-slate-900 mb-1">
                      {auction.identificacao ? `Processo Nº ${auction.identificacao}` : (auction.nome || `Processo ${index + 1}`)}
                    </h3>
                    {auction.nome && auction.identificacao && (
                      <p className="text-sm text-slate-600 font-light">{auction.nome}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Status</div>
                    <div className={`text-sm font-medium mt-1 ${
                      auction.status === 'em_andamento' ? 'text-slate-700' :
                      auction.status === 'finalizado' ? 'text-slate-800' :
                      'text-slate-600'
                    }`}>
                      {getStatusLabel(auction.status)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Corpo do Leilão */}
              <div className="px-8 py-3 space-y-3">
                {/* Informações Básicas */}
                <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <h4 className="text-sm font-light text-slate-700 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                    Dados do Processo
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm font-light">
                    <div className="space-y-2">
                      <div className="flex"><span className="text-slate-500 w-32">Data de início:</span> <span className="text-slate-900">{formatDate(auction.dataInicio)}</span></div>
                      <div className="flex"><span className="text-slate-500 w-32">Encerramento:</span> <span className="text-slate-900">{formatDate(auction.dataEncerramento) || 'Não definida'}</span></div>
                      <div className="flex"><span className="text-slate-500 w-32">Modalidade:</span> <span className="text-slate-900">{getLocalLabel(auction.local)}</span></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-col"><span className="text-slate-500">Endereço:</span> <span className="text-slate-900 mt-1">{auction.endereco || 'Não informado'}</span></div>
                      <div className="flex"><span className="text-slate-500 w-32">Lotes:</span> <span className="text-slate-900">{auction.lotes?.length || 0} {(auction.lotes?.length || 0) === 1 ? 'item' : 'itens'}</span></div>
                      <div className="flex"><span className="text-slate-500 w-32">Custos:</span> <span className="text-slate-900">{formatCurrency(auction.custosNumerico || auction.custos)}</span></div>
                    </div>
                  </div>
                </div>

                {/* Informações do Arrematante */}
                {auction.arrematante && (
                  <div className="border-t border-slate-200 pt-3" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h4 className="text-sm font-light text-slate-700 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                      Arrematante
                    </h4>
                    <div className="bg-slate-50 border border-slate-200 p-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm font-light">
                        <div className="space-y-2">
                          <div className="flex"><span className="text-slate-500 w-24">Nome:</span> <span className="text-slate-900">{auction.arrematante.nome || 'Não informado'}</span></div>
                          <div className="flex"><span className="text-slate-500 w-24">Documento:</span> <span className="text-slate-900">{auction.arrematante.documento || 'Não informado'}</span></div>
                          <div className="flex"><span className="text-slate-500 w-24">Telefone:</span> <span className="text-slate-900">{auction.arrematante.telefone || 'Não informado'}</span></div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex"><span className="text-slate-500 w-24">Email:</span> <span className="text-slate-900">{auction.arrematante.email || 'Não informado'}</span></div>
                          <div className="flex"><span className="text-slate-500 w-24">Valor:</span> <span className="text-slate-900">{formatCurrency(auction.arrematante.valorPagarNumerico || auction.arrematante.valorPagar)}</span></div>
                          <div className="flex"><span className="text-slate-500 w-24">Situação:</span> 
                            <span className={`font-medium ${
                              auction.arrematante.pago 
                                ? 'text-slate-800' 
                                : isOverdue(auction.arrematante, auction) 
                                  ? 'text-red-700' 
                                  : 'text-slate-600'
                            }`}>
                              {auction.arrematante.pago 
                                ? 'Quitado' 
                                : isOverdue(auction.arrematante, auction) 
                                  ? 'ATRASADO' 
                                  : 'Pendente'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                      {auction.arrematante.endereco && (
                        <div className="mt-3 pt-2 border-t border-slate-300">
                          <div className="text-sm font-light">
                            <span className="text-slate-500">Endereço completo:</span><br />
                            <span className="text-slate-900 mt-1 block">{auction.arrematante.endereco}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Informações dos Lotes */}
                {auction.lotes && auction.lotes.length > 0 && (
                  <div className="border-t border-slate-200 pt-3" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h4 className="text-sm font-light text-slate-700 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                      Composição dos Lotes ({auction.lotes.length} {auction.lotes.length === 1 ? 'item' : 'itens'})
                    </h4>
                    <div className="space-y-2">
                      {auction.lotes.slice(0, 3).map((lote: any, loteIndex: number) => (
                        <div key={lote.id || loteIndex} className="bg-slate-50 border border-slate-200 p-2">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-light text-slate-900">Lote {lote.numero}</h5>
                            {lote.mercadorias && (
                              <span className="text-xs text-slate-600 bg-white px-2 py-1 border border-slate-300 font-light">
                                {lote.mercadorias.length} item(ns)
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-light text-slate-800">
                            <div className="mb-2">
                              <span className="text-slate-500">Descrição:</span><br />
                              <span className="text-slate-900">{lote.descricao || 'Não informada'}</span>
                            </div>
                            {lote.mercadorias && lote.mercadorias.length > 0 && (
                              <div>
                                <span className="text-slate-500">Itens componentes:</span>
                                <div className="ml-6 text-xs space-y-1 mt-1 text-slate-800">
                                  {lote.mercadorias.slice(0, 2).map((merc: any, mercIndex: number) => (
                                    <div key={mercIndex} className="flex justify-between border-b border-slate-200 pb-1">
                                      <span>{merc.nome || merc.tipo}</span>
                                      <span className="font-medium">{formatCurrency(merc.valorNumerico || merc.valor)}</span>
                                    </div>
                                  ))}
                                  {lote.mercadorias.length > 2 && (
                                    <div className="text-slate-500 text-center pt-1">
                                      ... e mais {lote.mercadorias.length - 2} item(ns)
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {auction.lotes.length > 3 && (
                        <div className="text-center text-sm text-slate-500 bg-slate-100 p-2 border border-slate-200 font-light">
                          O relatório completo incluirá os {auction.lotes.length - 3} lotes restantes
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {leiloesAtivos.length > 3 && (
            <div className="text-center bg-slate-50 border-2 border-slate-300 p-8 font-sans">
              <div className="text-lg font-light text-slate-900 tracking-wide">
                Documento Completo
              </div>
              <div className="text-sm text-slate-600 font-light mt-3 leading-relaxed">
                Esta visualização apresenta os primeiros 3 registros.
                <br />
                O documento final compreenderá a totalidade de {leiloesAtivos.length} processos licitatórios.
              </div>
            </div>
          )}

        {/* Logos Elionx e Arthur Lira */}
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
      </div>
    );
  }

  if (type === 'inadimplencia') {
    // Função para calcular dias de atraso
    const calcularDiasAtraso = (dataVencimento: string) => {
      const hoje = new Date();
      const vencimento = new Date(dataVencimento);
      vencimento.setHours(23, 59, 59, 999);
      
      if (hoje <= vencimento) return 0;
      
      const diffTime = hoje.getTime() - vencimento.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    // Lógica de inadimplência aprimorada para preview
    const inadimplentes = auctions.filter(auction => {
      if (!auction.arrematante || auction.arrematante.pago) return false;
      
      const now = new Date();
      const loteArrematado = auction.arrematante?.loteId 
        ? auction.lotes?.find(lote => lote.id === auction.arrematante.loteId)
        : null;
      
      const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento;
      
      // Aplicar filtro por tipo de pagamento
      if (paymentTypeFilter !== 'todos' && tipoPagamento !== paymentTypeFilter) {
        return false;
      }
      
      if (tipoPagamento === 'a_vista') {
        const dataVencimento = loteArrematado?.dataVencimentoVista || auction.dataVencimentoVista;
        if (dataVencimento) {
          const dueDate = new Date(dataVencimento);
          dueDate.setHours(23, 59, 59, 999);
          return now > dueDate;
        }
      }
      
      if (tipoPagamento === 'entrada_parcelamento') {
        const dataEntrada = loteArrematado?.dataEntrada || auction.dataEntrada;
        const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
        let isEntradaAtrasada = false;
        let isParcelaAtrasada = false;
        
        // Verificar entrada (só se não foi paga)
        if (dataEntrada && parcelasPagas === 0) {
          const entryDueDate = new Date(dataEntrada);
          entryDueDate.setHours(23, 59, 59, 999);
          isEntradaAtrasada = now > entryDueDate;
      }
      
        // Verificar primeira parcela (independente da entrada)
      if (auction.arrematante.mesInicioPagamento && auction.arrematante.diaVencimentoMensal) {
        try {
          let year: number, month: number;
          
          if (auction.arrematante.mesInicioPagamento.includes('-')) {
            [year, month] = auction.arrematante.mesInicioPagamento.split('-').map(Number);
          } else {
            year = new Date().getFullYear();
            month = parseInt(auction.arrematante.mesInicioPagamento);
          }
          
            const quantidadeParcelas = auction.arrematante?.quantidadeParcelas || 12;
            
            // Determinar a partir de qual parcela verificar
            let parcelaInicioIndex = 0;
            if (parcelasPagas > 0) {
              // Entrada foi paga, verificar a partir da próxima parcela não paga
              parcelaInicioIndex = parcelasPagas - 1; // -1 porque parcelasPagas inclui a entrada
            }
            
            // Verificar se há pelo menos uma parcela em atraso
            for (let i = parcelaInicioIndex; i < quantidadeParcelas; i++) {
              const parcelaDate = new Date(year, month - 1 + i, auction.arrematante.diaVencimentoMensal);
              parcelaDate.setHours(23, 59, 59, 999);
              
              if (now > parcelaDate) {
                isParcelaAtrasada = true;
                break; // Encontrou pelo menos uma parcela em atraso
              } else {
                // Se chegou em uma parcela que não está atrasada, para de verificar
                break;
              }
            }
          } catch (error) {
            console.error('Erro ao calcular inadimplência de parcela:', error);
          }
        }
        
        // Se entrada foi paga e não há parcelas atrasadas, não é inadimplente
        if (parcelasPagas > 0 && !isParcelaAtrasada) {
          return false;
        }
        
        return isEntradaAtrasada || isParcelaAtrasada;
      }
      
      // Para parcelamento simples
      if (tipoPagamento === 'parcelamento' && auction.arrematante.mesInicioPagamento && auction.arrematante.diaVencimentoMensal) {
        try {
          let year: number, month: number;
          
          if (auction.arrematante.mesInicioPagamento.includes('-')) {
            [year, month] = auction.arrematante.mesInicioPagamento.split('-').map(Number);
          } else {
            year = new Date().getFullYear();
            month = parseInt(auction.arrematante.mesInicioPagamento);
          }
          
          const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
          const quantidadeParcelas = auction.arrematante?.quantidadeParcelas || 12;
          
          // Verificar se há pelo menos uma parcela em atraso
          for (let i = parcelasPagas; i < quantidadeParcelas; i++) {
            const parcelaDate = new Date(year, month - 1 + i, auction.arrematante.diaVencimentoMensal);
            parcelaDate.setHours(23, 59, 59, 999);
            
            if (now > parcelaDate) {
              return true; // Encontrou pelo menos uma parcela em atraso
            } else {
              // Se chegou em uma parcela que não está atrasada, para de verificar
              break;
            }
          }
        } catch (error) {
          console.error('Erro ao calcular inadimplência:', error);
        }
      }
      
      return false;
    }).map(auction => {
      // Enriquecer dados com informações de inadimplência
      const loteArrematado = auction.arrematante?.loteId 
        ? auction.lotes?.find(lote => lote.id === auction.arrematante.loteId)
        : null;
      
      const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento;
      const valorTotal = auction.arrematante?.valorPagarNumerico || auction.arrematante?.valorPagar || 0;
      
      let detalhesInadimplencia = {
        tipoAtraso: '',
        valorEmAtraso: 0,
        dataVencimento: '',
        diasAtraso: 0,
        proximoVencimento: '',
        valorEntrada: 0,
        valorParcela: 0,
        parcelasAtrasadas: 0
      };

      if (tipoPagamento === 'a_vista') {
        const dataVencimento = loteArrematado?.dataVencimentoVista || auction.dataVencimentoVista;
        if (dataVencimento) {
          detalhesInadimplencia = {
            tipoAtraso: 'Pagamento à Vista',
            valorEmAtraso: valorTotal,
            dataVencimento: dataVencimento,
            diasAtraso: calcularDiasAtraso(dataVencimento),
            proximoVencimento: dataVencimento,
            valorEntrada: 0,
            valorParcela: 0,
            parcelasAtrasadas: 1
          };
        }
      } else if (tipoPagamento === 'entrada_parcelamento') {
        const dataEntrada = loteArrematado?.dataEntrada || auction.dataEntrada;
        const valorEntrada = auction.arrematante?.valorEntrada ? 
          (typeof auction.arrematante.valorEntrada === 'string' ? 
            parseCurrencyToNumber(auction.arrematante.valorEntrada) : 
            auction.arrematante.valorEntrada) : 
          valorTotal * 0.3;
        
        const valorRestante = valorTotal - valorEntrada;
        const quantidadeParcelas = auction.arrematante?.quantidadeParcelas || 12;
        const valorPorParcela = valorRestante / quantidadeParcelas;
        const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
        
        const hoje = new Date();
        let isEntradaAtrasada = false;
        let isParcelaAtrasada = false;
        let dataVencimentoParcela = '';
        
        // Verificar se entrada está atrasada (só se não foi paga)
        if (dataEntrada && parcelasPagas === 0) {
          const vencimentoEntrada = new Date(dataEntrada);
          vencimentoEntrada.setHours(23, 59, 59, 999);
          isEntradaAtrasada = hoje > vencimentoEntrada;
        }
        
        // Verificar quantas parcelas estão atrasadas
        let parcelasAtrasadasCount = 0;
        let valorTotalParcelasAtrasadas = 0;
        let dataPrimeiraParcelaAtrasada = '';
        
        if (auction.arrematante?.mesInicioPagamento && auction.arrematante?.diaVencimentoMensal) {
          try {
            let year: number, month: number;
            
            if (auction.arrematante.mesInicioPagamento.includes('-')) {
              [year, month] = auction.arrematante.mesInicioPagamento.split('-').map(Number);
            } else {
              year = new Date().getFullYear();
              month = parseInt(auction.arrematante.mesInicioPagamento);
            }
            
            // Determinar a partir de qual parcela verificar
            let parcelaInicioIndex = 0;
            if (parcelasPagas > 0) {
              // Entrada foi paga, verificar a partir da próxima parcela não paga
              parcelaInicioIndex = parcelasPagas - 1; // -1 porque parcelasPagas inclui a entrada
            }
            
            // Verificar todas as parcelas que deveriam ter sido pagas até hoje
            for (let i = parcelaInicioIndex; i < quantidadeParcelas; i++) {
              const parcelaDate = new Date(year, month - 1 + i, auction.arrematante.diaVencimentoMensal);
              parcelaDate.setHours(23, 59, 59, 999);
              
              if (hoje > parcelaDate) {
                parcelasAtrasadasCount++;
                valorTotalParcelasAtrasadas += valorPorParcela;
                
                // Guardar a data da primeira parcela atrasada
                if (parcelasAtrasadasCount === 1) {
                  dataPrimeiraParcelaAtrasada = parcelaDate.toISOString().split('T')[0];
                }
              } else {
                // Se chegou em uma parcela que não está atrasada, para de contar
                break;
              }
            }
            
            if (parcelasAtrasadasCount > 0) {
              isParcelaAtrasada = true;
              dataVencimentoParcela = dataPrimeiraParcelaAtrasada;
            }
          } catch (error) {
            console.error('Erro ao calcular vencimento de parcela:', error);
          }
        }
        
        // Determinar qual atraso priorizar e calcular valor total em atraso
        if (isEntradaAtrasada && isParcelaAtrasada) {
          // Ambos em atraso - somar entrada + todas as parcelas atrasadas
          const dataEntradaDate = new Date(dataEntrada);
          const dataParcelaDate = new Date(dataVencimentoParcela);
          const dataMaisAntiga = dataEntradaDate < dataParcelaDate ? dataEntrada : dataVencimentoParcela;
          
          detalhesInadimplencia = {
            tipoAtraso: `Entrada + ${parcelasAtrasadasCount} Parcela${parcelasAtrasadasCount > 1 ? 's' : ''} em Atraso`,
            valorEmAtraso: valorEntrada + valorTotalParcelasAtrasadas,
            dataVencimento: dataMaisAntiga,
            diasAtraso: calcularDiasAtraso(dataMaisAntiga),
            proximoVencimento: dataMaisAntiga,
            valorEntrada: valorEntrada,
            valorParcela: valorPorParcela,
            parcelasAtrasadas: 1 + parcelasAtrasadasCount // entrada + parcelas
          };
        } else if (isEntradaAtrasada) {
          detalhesInadimplencia = {
            tipoAtraso: 'Entrada em Atraso',
            valorEmAtraso: valorEntrada,
            dataVencimento: dataEntrada,
            diasAtraso: calcularDiasAtraso(dataEntrada),
            proximoVencimento: dataEntrada,
            valorEntrada: valorEntrada,
            valorParcela: valorPorParcela,
            parcelasAtrasadas: 1
          };
        } else if (isParcelaAtrasada && dataVencimentoParcela) {
          detalhesInadimplencia = {
            tipoAtraso: `${parcelasAtrasadasCount} Parcela${parcelasAtrasadasCount > 1 ? 's' : ''} em Atraso`,
            valorEmAtraso: valorTotalParcelasAtrasadas,
            dataVencimento: dataVencimentoParcela,
            diasAtraso: calcularDiasAtraso(dataVencimentoParcela),
            proximoVencimento: dataVencimentoParcela,
            valorEntrada: valorEntrada,
            valorParcela: valorPorParcela,
            parcelasAtrasadas: parcelasAtrasadasCount
          };
        }
      } else {
        // Parcelamento simples
        if (auction.arrematante.mesInicioPagamento && auction.arrematante.diaVencimentoMensal) {
          try {
            let year: number, month: number;
            
            if (auction.arrematante.mesInicioPagamento.includes('-')) {
              [year, month] = auction.arrematante.mesInicioPagamento.split('-').map(Number);
            } else {
              year = new Date().getFullYear();
              month = parseInt(auction.arrematante.mesInicioPagamento);
            }
            
            const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
            const quantidadeParcelas = auction.arrematante?.quantidadeParcelas || 12;
            const valorPorParcela = valorTotal / quantidadeParcelas;
            
            // Contar todas as parcelas em atraso
            let parcelasAtrasadasCount = 0;
            let valorTotalParcelasAtrasadas = 0;
            let dataPrimeiraParcelaAtrasada = '';
            
            const hoje = new Date();
            
            // Verificar todas as parcelas que deveriam ter sido pagas até hoje
            for (let i = parcelasPagas; i < quantidadeParcelas; i++) {
              const parcelaDate = new Date(year, month - 1 + i, auction.arrematante.diaVencimentoMensal);
              parcelaDate.setHours(23, 59, 59, 999);
              
              if (hoje > parcelaDate) {
                parcelasAtrasadasCount++;
                valorTotalParcelasAtrasadas += valorPorParcela;
                
                // Guardar a data da primeira parcela atrasada
                if (parcelasAtrasadasCount === 1) {
                  dataPrimeiraParcelaAtrasada = parcelaDate.toISOString().split('T')[0];
                }
              } else {
                // Se chegou em uma parcela que não está atrasada, para de contar
                break;
              }
            }
            
            if (parcelasAtrasadasCount > 0) {
              detalhesInadimplencia = {
                tipoAtraso: `${parcelasAtrasadasCount} Parcela${parcelasAtrasadasCount > 1 ? 's' : ''} em Atraso`,
                valorEmAtraso: valorTotalParcelasAtrasadas,
                dataVencimento: dataPrimeiraParcelaAtrasada,
                diasAtraso: calcularDiasAtraso(dataPrimeiraParcelaAtrasada),
                proximoVencimento: dataPrimeiraParcelaAtrasada,
                valorEntrada: 0,
                valorParcela: valorPorParcela,
                parcelasAtrasadas: parcelasAtrasadasCount
              };
            }
          } catch (error) {
            console.error('Erro ao calcular detalhes de inadimplência:', error);
          }
        }
      }

      return {
        ...auction,
        detalhesInadimplencia
      };
    });

    // Calcular estatísticas gerais
    const valorTotalInadimplencia = inadimplentes.reduce((sum, auction) => 
      sum + (auction.detalhesInadimplencia?.valorEmAtraso || 0), 0);
    
    const diasAtrasoMedio = inadimplentes.length > 0 ? 
      inadimplentes.reduce((sum, auction) => sum + (auction.detalhesInadimplencia?.diasAtraso || 0), 0) / inadimplentes.length : 0;

    return (
      <div className="bg-white space-y-4 min-h-[600px] font-sans">
        {/* Cabeçalho Corporativo Aprimorado */}
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
          <h1 className="text-2xl font-light text-slate-900 tracking-wider uppercase mb-2">
            Relatório Detalhado de Inadimplência {paymentTypeFilter !== 'todos' && 
              `- ${paymentTypeFilter === 'a_vista' ? 'À Vista' : 
                   paymentTypeFilter === 'parcelamento' ? 'Parcelamento' : 
                   'Entrada + Parcelamento'}`
            }
          </h1>
          <div className="text-sm text-slate-600 font-light space-y-1">
            <div className="border-b border-slate-200 pb-1 mb-1"></div>
            <div>Data de emissão: {new Date().toLocaleDateString('pt-BR')}</div>
            <div>Horário: {new Date().toLocaleTimeString('pt-BR')}</div>
            <div>Documento: Análise completa de pendências financeiras 
              {paymentTypeFilter !== 'todos' && ` (${
                paymentTypeFilter === 'a_vista' ? 'pagamento à vista' : 
                paymentTypeFilter === 'parcelamento' ? 'pagamento parcelado' : 
                'pagamento entrada + parcelamento'
              })`}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Total de inadimplentes: {inadimplentes.length} registro(s) • 
              Valor total em atraso: {formatCurrency(valorTotalInadimplencia)} • 
              Média de atraso: {Math.round(diasAtrasoMedio)} dias
            </div>
          </div>
        </div>

        {/* Resumo Executivo */}
        {inadimplentes.length > 0 && (
          <div className="bg-slate-50 border-2 border-slate-300 p-6 mb-6">
            <h2 className="text-lg font-light text-slate-900 tracking-wide mb-4 border-b border-slate-300 pb-2">
              Resumo Executivo da Inadimplência
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
              <div className="text-center">
                <div className="text-2xl font-light text-red-800">{inadimplentes.length}</div>
                <div className="text-xs text-slate-600 uppercase tracking-wider">Total Casos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-light text-red-800">{formatCurrency(valorTotalInadimplencia)}</div>
                <div className="text-xs text-slate-600 uppercase tracking-wider">Valor em Atraso</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-light text-red-800">{Math.round(diasAtrasoMedio)}</div>
                <div className="text-xs text-slate-600 uppercase tracking-wider">Dias Médio Atraso</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-light text-red-800">
                  {inadimplentes.filter(a => a.detalhesInadimplencia?.diasAtraso > 30).length}
                </div>
                <div className="text-xs text-slate-600 uppercase tracking-wider">Casos Críticos (+30d)</div>
              </div>
            </div>
          </div>
        )}

        {/* Lista Detalhada de Inadimplentes */}
        {inadimplentes.length > 0 ? (
          <div className="space-y-6">
            <div className="border-b border-slate-300 pb-2">
              <h2 className="text-lg font-light text-slate-900 tracking-wide">
                Análise Detalhada dos Casos de Inadimplência
              </h2>
              <p className="text-sm text-slate-600 font-light mt-1">
                Informações completas sobre cada devedor e status dos pagamentos em atraso
              </p>
            </div>
            
            {inadimplentes.slice(0, 3).map((auction) => (
              <div key={auction.id} className="border-l-4 border-red-800 bg-white shadow-sm">
                {/* Cabeçalho do Caso */}
                <div className="bg-red-50 px-8 py-6 border-b border-red-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-light text-slate-900 mb-2">
                        {auction.identificacao ? `Processo Nº ${auction.identificacao}` : (auction.nome || 'Processo sem identificação')}
                      </h3>
                      <p className="text-sm text-red-700 font-medium">
                        {auction.detalhesInadimplencia?.tipoAtraso} • 
                        {auction.detalhesInadimplencia?.diasAtraso} dias de atraso
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 uppercase tracking-wider">Gravidade</div>
                      <div className={`text-sm font-medium mt-1 ${
                        auction.detalhesInadimplencia?.diasAtraso > 60 ? 'text-red-900' :
                        auction.detalhesInadimplencia?.diasAtraso > 30 ? 'text-red-700' :
                        'text-red-600'
                      }`}>
                        {auction.detalhesInadimplencia?.diasAtraso > 60 ? 'CRÍTICA' :
                         auction.detalhesInadimplencia?.diasAtraso > 30 ? 'ALTA' : 'MODERADA'}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="px-8 py-6 space-y-6">
                  {/* Informações do Devedor */}
                  <div>
                    <h4 className="text-sm font-light text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                      Identificação do Devedor
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-light">
                      <div className="space-y-3">
                        <div className="flex"><span className="text-slate-500 w-24">Nome:</span> <span className="text-slate-900 font-medium">{auction.arrematante?.nome || 'Não informado'}</span></div>
                        <div className="flex"><span className="text-slate-500 w-24">Documento:</span> <span className="text-slate-900">{auction.arrematante?.documento || 'Não informado'}</span></div>
                        <div className="flex"><span className="text-slate-500 w-24">Telefone:</span> <span className="text-slate-900">{auction.arrematante?.telefone || 'Não informado'}</span></div>
                        <div className="flex"><span className="text-slate-500 w-24">Email:</span> <span className="text-slate-900">{auction.arrematante?.email || 'Não informado'}</span></div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex"><span className="text-slate-500 w-24">Data Leilão:</span> <span className="text-slate-900">{formatDate(auction.dataInicio)}</span></div>
                        <div className="flex"><span className="text-slate-500 w-24">Valor Total:</span> <span className="text-slate-900 font-medium">{formatCurrency(auction.arrematante?.valorPagarNumerico || auction.arrematante?.valorPagar)}</span></div>
                        {(() => {
                          const loteComprado = auction.arrematante?.loteId 
                            ? auction.lotes?.find(lote => lote.id === auction.arrematante.loteId)
                            : null;
                          return loteComprado ? (
                            <div className="flex"><span className="text-slate-500 w-24">Lote:</span> <span className="text-slate-900">#{loteComprado.numero} - {loteComprado.descricao || 'Sem descrição'}</span></div>
                          ) : null;
                        })()}
                        <div className="flex"><span className="text-slate-500 w-24">Modalidade:</span> <span className="text-slate-900">
                          {(() => {
                            const loteComprado = auction.arrematante?.loteId 
                              ? auction.lotes?.find(lote => lote.id === auction.arrematante.loteId)
                              : null;
                            const tipoPagamento = loteComprado?.tipoPagamento || auction.tipoPagamento;
                            switch (tipoPagamento) {
                              case 'a_vista': return 'À vista';
                              case 'parcelamento': return 'Parcelamento';
                              case 'entrada_parcelamento': return 'Entrada + Parcelamento';
                              default: return 'Não definido';
                            }
                          })()}
                        </span></div>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes da Inadimplência */}
                  <div>
                    <h4 className="text-sm font-light text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                      Análise da Inadimplência
                    </h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Valor em Atraso</div>
                          <div className="text-lg font-medium text-slate-800">
                            {formatCurrency(auction.detalhesInadimplencia?.valorEmAtraso)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Data de Vencimento</div>
                          <div className="text-lg font-medium text-slate-900">
                            {auction.detalhesInadimplencia?.dataVencimento ? 
                              formatDate(auction.detalhesInadimplencia.dataVencimento) : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Dias em Atraso</div>
                          <div className="text-lg font-medium text-slate-800">
                            {auction.detalhesInadimplencia?.diasAtraso} dias
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Informações de Pagamento Específicas */}
                  {(() => {
                    const loteComprado = auction.arrematante?.loteId 
                      ? auction.lotes?.find(lote => lote.id === auction.arrematante.loteId)
                      : null;
                    const tipoPagamento = loteComprado?.tipoPagamento || auction.tipoPagamento;
                    
                    if (tipoPagamento === 'entrada_parcelamento') {
                      // Obter dados necessários
                      const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
                      const quantidadeParcelas = auction.arrematante?.quantidadeParcelas || 12;
                      
                      // Determinar status da entrada
                      const dataEntrada = loteComprado?.dataEntrada || auction.dataEntrada;
                      const hoje = new Date();
                      let statusEntrada = 'Não informado';
                      let corStatusEntrada = 'text-slate-900';
                      
                      if (dataEntrada) {
                        const vencimentoEntrada = new Date(dataEntrada);
                        vencimentoEntrada.setHours(23, 59, 59, 999);
                        
                        // Verificar se entrada foi paga (parcelasPagas > 0)
                        if (parcelasPagas > 0) {
                          statusEntrada = 'Pago';
                          corStatusEntrada = 'text-green-700';
                        } else if (hoje > vencimentoEntrada) {
                          statusEntrada = 'ATRASADO';
                          corStatusEntrada = 'text-red-700';
                        } else {
                          statusEntrada = 'Pendente';
                          corStatusEntrada = 'text-orange-600';
                        }
                      }
                      
                      // Calcular próximo vencimento de parcela
                      const mesInicio = auction.arrematante?.mesInicioPagamento;
                      const diaVencimento = auction.arrematante?.diaVencimentoMensal || 15;
                      let proximaParcelaData = 'N/A';
                      let statusProximaParcela = 'Aguardando entrada';
                      
                      if (mesInicio) {
                        try {
                          const [ano, mes] = mesInicio.split('-').map(Number);
                          
                          if (parcelasPagas === 0) {
                            // Entrada ainda não foi paga, verificar se primeira parcela também está em atraso
                            const dataPrimeiraParcela = new Date(ano, mes - 1, diaVencimento);
                            proximaParcelaData = formatDate(dataPrimeiraParcela.toISOString().split('T')[0]);
                            
                            // Verificar se ambos estão em atraso
                            if (statusEntrada === 'ATRASADO' && hoje > dataPrimeiraParcela) {
                              statusProximaParcela = 'ATRASADO';
                            } else if (statusEntrada === 'ATRASADO') {
                              statusProximaParcela = 'Aguardando entrada (em atraso)';
                            } else if (hoje > dataPrimeiraParcela) {
                              statusProximaParcela = 'ATRASADO';
                            } else {
                              statusProximaParcela = 'Aguardando entrada';
                            }
                          } else {
                            // Entrada foi paga, calcular próxima parcela
                            const proximaParcelaIndex = parcelasPagas - 1; // -1 porque parcelasPagas inclui entrada
                            
                            if (proximaParcelaIndex < quantidadeParcelas) {
                              const dataProximaParcela = new Date(ano, mes - 1 + proximaParcelaIndex, diaVencimento);
                              proximaParcelaData = formatDate(dataProximaParcela.toISOString().split('T')[0]);
                              
                              if (hoje > dataProximaParcela) {
                                statusProximaParcela = 'ATRASADO';
                              } else {
                                statusProximaParcela = 'Pendente';
                              }
                            } else {
                              proximaParcelaData = 'Todas pagas';
                              statusProximaParcela = 'Concluído';
                            }
                          }
                        } catch (error) {
                          console.error('Erro ao calcular próxima parcela:', error);
                        }
                      }

                      return (
                        <div>
                          <h4 className="text-sm font-light text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                            Detalhamento Entrada + Parcelamento
                          </h4>
                          
                          {/* Informações da Entrada - só mostrar se estiver atrasada */}
                          {statusEntrada !== 'Pago' && (
                            <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 mb-4">
                              <h5 className="text-sm font-medium text-slate-800 mb-3 border-b border-slate-200 pb-1">
                                Status da Entrada
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Valor da Entrada</div>
                                  <div className="text-base font-medium text-slate-900">
                                    {formatCurrency(auction.detalhesInadimplencia?.valorEntrada)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Data de Vencimento</div>
                                  <div className="text-base font-medium text-slate-900">
                                    {dataEntrada ? formatDate(dataEntrada) : 'N/A'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status da Entrada</div>
                                  <div className={`text-base font-medium ${corStatusEntrada}`}>
                                    {statusEntrada}
                                    {statusEntrada === 'ATRASADO' && dataEntrada && (
                                      <span className="block text-xs text-slate-500 mt-1">
                                        {calcularDiasAtraso(dataEntrada)} dias de atraso
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Informações das Parcelas */}
                          <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
                            <h5 className="text-sm font-medium text-slate-800 mb-3 border-b border-slate-200 pb-1">
                              Status das Parcelas (após entrada)
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                              <div className="space-y-3">
                                <div className="flex"><span className="text-slate-500 w-32">Valor por Parcela:</span> <span className="text-slate-900 font-medium">{formatCurrency(auction.detalhesInadimplencia?.valorParcela)}</span></div>
                                <div className="flex"><span className="text-slate-500 w-32">Total de Parcelas:</span> <span className="text-slate-900">{auction.arrematante?.quantidadeParcelas || 0} parcelas</span></div>
                                <div className="flex"><span className="text-slate-500 w-32">Dia Vencimento:</span> <span className="text-slate-900">Dia {auction.arrematante?.diaVencimentoMensal || 'N/A'}</span></div>
                              </div>
                              <div className="space-y-3">
                                <div className="flex"><span className="text-slate-500 w-32">Parcelas Pagas:</span> <span className="text-slate-900">{(auction.arrematante?.parcelasPagas || 0) > 0 ? (auction.arrematante.parcelasPagas - 1) : 0} de {auction.arrematante?.quantidadeParcelas || 0}</span></div>
                                <div className="flex"><span className="text-slate-500 w-32">Parcelas Restantes:</span> <span className="text-slate-900">{auction.arrematante?.quantidadeParcelas - ((auction.arrematante?.parcelasPagas || 0) > 0 ? (auction.arrematante.parcelasPagas - 1) : 0) || 0}</span></div>
                                <div className="flex"><span className="text-slate-500 w-32">Próxima Parcela:</span> <span className="text-slate-900">{proximaParcelaData}</span></div>
                                <div className="flex"><span className="text-slate-500 w-32">Status:</span> <span className={`${statusProximaParcela === 'ATRASADO' ? 'text-red-700' : statusProximaParcela === 'Pendente' ? 'text-orange-600' : statusProximaParcela === 'Concluído' ? 'text-green-700' : 'text-slate-900'}`}>{statusProximaParcela}</span></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    } else if (tipoPagamento === 'parcelamento') {
                      // Calcular próxima parcela para parcelamento simples
                      const mesInicio = auction.arrematante?.mesInicioPagamento;
                      const diaVencimento = auction.arrematante?.diaVencimentoMensal || 15;
                      const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
                      const quantidadeParcelas = auction.arrematante?.quantidadeParcelas || 12;
                      let proximaParcelaData = 'N/A';
                      let statusProximaParcela = 'N/A';
                      
                      if (mesInicio) {
                        try {
                          const [ano, mes] = mesInicio.split('-').map(Number);
                          
                          if (parcelasPagas < quantidadeParcelas) {
                            const dataProximaParcela = new Date(ano, mes - 1 + parcelasPagas, diaVencimento);
                            proximaParcelaData = formatDate(dataProximaParcela.toISOString().split('T')[0]);
                            
                            const hoje = new Date();
                            if (hoje > dataProximaParcela) {
                              statusProximaParcela = 'ATRASADO';
                            } else {
                              statusProximaParcela = 'Pendente';
                            }
                          } else {
                            proximaParcelaData = 'Todas pagas';
                            statusProximaParcela = 'Concluído';
                          }
                        } catch (error) {
                          console.error('Erro ao calcular próxima parcela:', error);
                        }
                      }
                      
                      return (
                        <div>
                          <h4 className="text-sm font-light text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                            Status do Parcelamento
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div className="space-y-3">
                              <div className="flex"><span className="text-slate-500 w-32">Valor por Parcela:</span> <span className="text-slate-900 font-medium">{formatCurrency(auction.detalhesInadimplencia?.valorParcela)}</span></div>
                              <div className="flex"><span className="text-slate-500 w-32">Parcelas Pagas:</span> <span className="text-slate-900">{auction.arrematante?.parcelasPagas || 0} de {auction.arrematante?.quantidadeParcelas || 0}</span></div>
                              <div className="flex"><span className="text-slate-500 w-32">Próxima Parcela:</span> <span className="text-slate-900">{proximaParcelaData}</span></div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex"><span className="text-slate-500 w-32">Dia Vencimento:</span> <span className="text-slate-900">Dia {auction.arrematante?.diaVencimentoMensal || 'N/A'}</span></div>
                              <div className="flex"><span className="text-slate-500 w-32">Mês Início:</span> <span className="text-slate-900">{auction.arrematante?.mesInicioPagamento || 'N/A'}</span></div>
                              <div className="flex"><span className="text-slate-500 w-32">Status:</span> <span className={`${statusProximaParcela === 'ATRASADO' ? 'text-red-700' : statusProximaParcela === 'Pendente' ? 'text-orange-600' : statusProximaParcela === 'Concluído' ? 'text-green-700' : 'text-slate-900'}`}>{statusProximaParcela}</span></div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                </div>
              </div>
            ))}
            
            {inadimplentes.length > 3 && (
              <div className="text-center bg-slate-50 border-2 border-slate-300 p-8 font-sans">
                <div className="text-lg font-light text-slate-900 tracking-wide">
                  Documento Completo - Análise Detalhada
                </div>
                <div className="text-sm text-slate-600 font-light mt-3 leading-relaxed">
                  Esta visualização apresenta os primeiros 3 casos com análise detalhada.
                  <br />
                  O relatório completo incluirá todos os {inadimplentes.length} casos identificados com o mesmo nível de detalhamento.
                  <br />
                  <span className="text-xs text-slate-500 mt-2 block">
                    Total em atraso: {formatCurrency(valorTotalInadimplencia)} • 
                    Média de atraso: {Math.round(diasAtrasoMedio)} dias • 
                    Casos críticos: {inadimplentes.filter(a => a.detalhesInadimplencia?.diasAtraso > 30).length}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center bg-green-50 border-2 border-green-300 p-12 font-sans">
            <div className="text-lg font-light text-green-900 tracking-wide">✓ Situação Regularizada</div>
            <div className="text-sm text-green-700 font-light mt-3 leading-relaxed">
              Nenhuma inadimplência identificada no sistema.
              <br />
              Todos os compromissos financeiros encontram-se em situação regular.
              <br />
              <span className="text-xs text-green-600 mt-2 block">
                Sistema analisado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
              </span>
            </div>
          </div>
        )}

        {/* Logos Elionx e Arthur Lira */}
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
  }

  if (type === 'historico') {
    const comHistorico = auctions.filter(a => a.arrematante && !a.arquivado);
    const totalTransacoes = comHistorico.reduce((sum, a) => sum + (a.historicoNotas?.length || 0), 0);
    const valorTotalNegociado = comHistorico.reduce((sum, a) => {
       // Incluir apenas valores já recebidos (contratos pagos)
       if (a.arrematante?.pago) {
         const valor = a.arrematante?.valorPagarNumerico || 
           parseFloat(a.arrematante?.valorPagar?.replace(/[^\d,]/g, '').replace(',', '.') || '0');
      return sum + valor;
       }
       return sum;
    }, 0);

    return (
      <div className="bg-white space-y-4 min-h-[600px] font-sans">
        {/* Cabeçalho Corporativo */}
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
          <h1 className="text-2xl font-light text-slate-900 tracking-wider uppercase mb-2">
            Relatório de Histórico de Arrematantes
          </h1>
          <div className="text-sm text-slate-600 font-light space-y-1">
            <div className="border-b border-slate-200 pb-1 mb-1"></div>
            <div>Relatório informativo sobre arrematantes e contratos vinculados</div>
            <div>Data de emissão: {new Date().toLocaleDateString('pt-BR')}</div>
            <div>Horário: {new Date().toLocaleTimeString('pt-BR')}</div>
            <div className="text-xs text-slate-500 mt-1">
              Total de registros: {comHistorico.length} transação(ões)
            </div>
          </div>
        </div>

        {/* Histórico de Transações */}
        {comHistorico.length > 0 ? (
          <div className="space-y-4">
            <div className="border-b border-slate-300 pb-2">
              <h2 className="text-lg font-light text-slate-900 tracking-wide">
                Registros de Transações
              </h2>
              <p className="text-sm text-slate-600 font-light mt-1">
                Histórico cronológico de arrematações realizadas
              </p>
            </div>
            
              {comHistorico.slice(0, 3).map((auction) => (
                <div key={auction.id} className="border-l-4 border-slate-600 bg-white">
                  <div className="bg-slate-50 px-8 py-6 border-b border-slate-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-light text-slate-900 mb-2">
                        {auction.identificacao ? `Processo Nº ${auction.identificacao}` : (auction.nome || 'Processo sem identificação')}
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 uppercase tracking-wider">Situação</div>
                      <div className={`text-sm font-medium mt-1 ${
                        auction.arrematante?.pago 
                          ? 'text-green-800' 
                          : isOverdue(auction.arrematante, auction) 
                            ? 'text-red-800' 
                            : 'text-amber-700'
                      }`}>
                        {auction.arrematante?.pago 
                          ? 'Quitado' 
                          : isOverdue(auction.arrematante, auction) 
                            ? 'ATRASADO' 
                            : 'Pendente'
                        }
                      </div>
                    </div>
                  </div>
                </div>
                
                  <div className="px-8 py-6 space-y-6">
                    {/* Identificação do Arrematante */}
                    <div>
                      <h4 className="text-sm font-light text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                        Identificação do Arrematante
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-light">
                        <div className="space-y-3">
                          <div className="flex"><span className="text-slate-500 w-32">Nome Completo:</span> <span className="text-slate-900 font-medium">{auction.arrematante?.nome || 'Não informado'}</span></div>
                          <div className="flex"><span className="text-slate-500 w-32">Documento:</span> <span className="text-slate-900">{auction.arrematante?.documento || 'Não informado'}</span></div>
                          <div className="flex"><span className="text-slate-500 w-32">Email:</span> <span className="text-slate-900">{auction.arrematante?.email || 'Não informado'}</span></div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex"><span className="text-slate-500 w-32">Telefone:</span> <span className="text-slate-900">{auction.arrematante?.telefone || 'Não informado'}</span></div>
                          <div className="flex"><span className="text-slate-500 w-32">Total de Contratos:</span> <span className="text-slate-900">1</span></div>
                          <div className="flex"><span className="text-slate-500 w-32">Valor Total:</span> <span className="text-slate-900 font-medium">{formatCurrency(auction.arrematante?.valorPagar)}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Contrato Vinculado */}
                    <div className="border-t border-slate-200 pt-6">
                      <h4 className="text-sm font-light text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                        Contrato Vinculado
                      </h4>
                      <div className="bg-slate-50 border border-slate-200 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-light">
                          <div className="space-y-3">
                            <div><span className="text-slate-500">Leilão:</span><br /><span className="text-slate-900 font-medium">{auction.nome || 'Nome não informado'}</span></div>
                            <div><span className="text-slate-500">Código:</span><br /><span className="text-slate-900">{auction.identificacao || 'Não informado'}</span></div>
                            <div><span className="text-slate-500">Data do Leilão:</span><br /><span className="text-slate-900">{formatDate(auction.dataInicio)}</span></div>
                          </div>
                          <div className="space-y-3">
                            <div><span className="text-slate-500">Valor Total:</span><br /><span className="text-slate-900 font-medium">{formatCurrency(auction.arrematante?.valorPagar)}</span></div>
                            <div><span className="text-slate-500">Status:</span><br /><span className={`font-medium ${auction.arrematante?.pago ? 'text-green-700' : 'text-red-700'}`}>{auction.arrematante?.pago ? 'Quitado' : 'Inadimplente'}</span></div>
                            <div><span className="text-slate-500">Modalidade:</span><br /><span className="text-slate-900">{(() => {
                              const loteArrematado = auction.arrematante?.loteId 
                                ? auction.lotes?.find(lote => lote.id === auction.arrematante.loteId)
                                : null;
                              const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento;
                              
                              switch (tipoPagamento) {
                                case 'a_vista':
                                  return 'Pagamento à Vista';
                                case 'entrada_parcelamento':
                                  return 'Entrada + Parcelamento';
                                case 'parcelamento':
                                  return 'Parcelamento';
                                default:
                                  return 'Não definido';
                              }
                            })()}</span></div>
                          </div>
                        </div>
                        {(() => {
                          const loteComprado = auction.arrematante?.loteId 
                            ? auction.lotes?.find(lote => lote.id === auction.arrematante.loteId)
                            : null;
                          return loteComprado ? (
                            <div className="mt-4 pt-4 border-t border-slate-300">
                              <div className="text-sm font-light">
                                <span className="text-slate-500">Lote Arrematado:</span><br />
                                <span className="text-slate-900">Lote {loteComprado.numero} - {loteComprado.descricao || 'Sem descrição'}</span>
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>

                    {/* Perfil de Risco */}
                    <div className="border-t border-slate-200 pt-6">
                      <h4 className="text-sm font-light text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                        Perfil de Risco
                      </h4>
                      <div className="bg-slate-50 border border-slate-200 p-4">
                        {(() => {
                          // Lógica de cálculo de risco similar à inadimplência, incluindo valor em atraso
                          const arrematante = auction.arrematante;
                          const parcelasPagas = arrematante?.parcelasPagas || 0;
                          const quantidadeParcelas = arrematante?.quantidadeParcelas || 1;
                          
                          // Verificar se está em atraso (usando função isOverdue completa)
                          const isCurrentlyOverdue = isOverdue(arrematante, auction);
                          const isNewContract = parcelasPagas === 0; // Contrato novo/inicial
                          
                          // Calcular valor em atraso baseado no tipo de pagamento e parcelas específicas atrasadas
                          const valorTotal = arrematante?.valorPagarNumerico || 
                            (typeof arrematante?.valorPagar === 'number' ? arrematante.valorPagar : 
                             (typeof arrematante?.valorPagar === 'string' ? parseFloat(arrematante.valorPagar.replace(/[^\d,]/g, '').replace(',', '.')) || 0 : 0));
                          
                          let valorEmAtraso = 0;
                          let parcelasAtrasadasCount = 0;
                          let diasAtrasoMaximo = 0;
                          
                          if (isCurrentlyOverdue) {
                            const loteArrematado = arrematante?.loteId 
                              ? auction.lotes?.find(lote => lote.id === arrematante.loteId)
                              : null;
                            const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento;
                            const hoje = new Date();
                            
                            if (tipoPagamento === 'a_vista') {
                              valorEmAtraso = valorTotal; // Todo o valor está em atraso
                              parcelasAtrasadasCount = 1;
                              
                              // Calcular dias de atraso para à vista
                              const dataVencimento = loteArrematado?.dataVencimentoVista || auction.dataVencimentoVista;
                              if (dataVencimento) {
                                const vencimento = new Date(dataVencimento);
                                diasAtrasoMaximo = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
                              }
                            } else if (tipoPagamento === 'entrada_parcelamento') {
                              // Para entrada + parcelamento, calcular parcelas específicas atrasadas
                              const valorEntrada = arrematante?.valorEntrada ? 
                                (typeof arrematante.valorEntrada === 'string' ? 
                                  parseFloat(arrematante.valorEntrada.replace(/[^\d,]/g, '').replace(',', '.')) : 
                                  arrematante.valorEntrada) : 
                                valorTotal * 0.3;
                              const valorRestante = valorTotal - valorEntrada;
                              const valorPorParcela = valorRestante / quantidadeParcelas;
                              
                              // Verificar se entrada está atrasada
                              if (parcelasPagas === 0) {
                                const dataEntrada = loteArrematado?.dataEntrada || auction.dataEntrada;
                                if (dataEntrada) {
                                  const vencimentoEntrada = new Date(dataEntrada);
                                  if (hoje > vencimentoEntrada) {
                                    valorEmAtraso += valorEntrada;
                                    parcelasAtrasadasCount++;
                                    diasAtrasoMaximo = Math.max(diasAtrasoMaximo, 
                                      Math.floor((hoje.getTime() - vencimentoEntrada.getTime()) / (1000 * 60 * 60 * 24)));
                                  }
                                }
                            } else {
                                // Entrada paga, verificar parcelas atrasadas
                                const mesInicio = arrematante?.mesInicioPagamento;
                                const diaVencimento = arrematante?.diaVencimentoMensal;
                                
                                if (mesInicio && diaVencimento) {
                                  const [startYear, startMonth] = mesInicio.split('-').map(Number);
                                  const parcelasEfetivasPagas = parcelasPagas - 1; // -1 porque entrada conta
                                  
                                  for (let i = 0; i < quantidadeParcelas; i++) {
                                    const parcelaDate = new Date(startYear, startMonth - 1 + i, diaVencimento);
                                    parcelaDate.setHours(23, 59, 59, 999);
                                    
                                    if (hoje > parcelaDate && i >= parcelasEfetivasPagas) {
                                      valorEmAtraso += valorPorParcela;
                                      parcelasAtrasadasCount++;
                                      const diasAtraso = Math.floor((hoje.getTime() - parcelaDate.getTime()) / (1000 * 60 * 60 * 24));
                                      diasAtrasoMaximo = Math.max(diasAtrasoMaximo, diasAtraso);
                                    }
                                  }
                                }
                              }
                            } else {
                              // Para parcelamento simples
                              const valorPorParcela = valorTotal / quantidadeParcelas;
                              const mesInicio = arrematante?.mesInicioPagamento;
                              const diaVencimento = arrematante?.diaVencimentoMensal;
                              
                              if (mesInicio && diaVencimento) {
                                const [startYear, startMonth] = mesInicio.split('-').map(Number);
                                
                                for (let i = parcelasPagas; i < quantidadeParcelas; i++) {
                                  const parcelaDate = new Date(startYear, startMonth - 1 + i, diaVencimento);
                                  parcelaDate.setHours(23, 59, 59, 999);
                                  
                                  if (hoje > parcelaDate) {
                                    valorEmAtraso += valorPorParcela;
                                    parcelasAtrasadasCount++;
                                    const diasAtraso = Math.floor((hoje.getTime() - parcelaDate.getTime()) / (1000 * 60 * 60 * 24));
                                    diasAtrasoMaximo = Math.max(diasAtrasoMaximo, diasAtraso);
                                  } else {
                                    break; // Para quando encontra uma não atrasada
                                  }
                                }
                              }
                            }
                          }
                          
                          // Usar dados reais de parcelas atrasadas para classificação de risco
                          const totalLateEpisodes = parcelasAtrasadasCount; // Número atual de parcelas atrasadas
                          const avgDelayDays = diasAtrasoMaximo; // Maior número de dias de atraso entre as parcelas
                          
                          // Definir faixas de valor para classificação
                          const isHighValueOverdue = valorEmAtraso > 500000; // Acima de R$ 500.000
                          const isMediumValueOverdue = valorEmAtraso > 200000 && valorEmAtraso <= 500000; // R$ 200.000 - R$ 500.000
                          const isLowValueOverdue = valorEmAtraso <= 200000; // Até R$ 200.000
                          
                          let riskLevel = 'BAIXO';
                          let riskClass = 'bg-slate-50 border-slate-300 text-slate-700';
                          let riskText = 'baixo';
                          
                          if (isCurrentlyOverdue) {
                            // Risco ALTO: Múltiplos critérios severos baseados em parcelas atrasadas
                            if (isHighValueOverdue || // Valor alto em atraso
                                parcelasAtrasadasCount >= 3 || // 3 ou mais parcelas atrasadas
                                (parcelasAtrasadasCount >= 2 && avgDelayDays > 30) || // 2+ parcelas com atraso longo
                                (isMediumValueOverdue && parcelasAtrasadasCount >= 2) || // Valor médio + múltiplas parcelas
                                avgDelayDays > 60) { // Atraso muito longo (mais de 2 meses)
                              riskLevel = 'ALTO';
                              riskClass = 'bg-slate-200 border-slate-500 text-slate-900';
                              riskText = 'alto';
                            }
                            // Risco MÉDIO: Critérios moderados baseados em parcelas atrasadas
                            else if (isMediumValueOverdue || // Valor médio em atraso
                                     parcelasAtrasadasCount >= 2 || // 2 ou mais parcelas atrasadas
                                     (parcelasAtrasadasCount >= 1 && avgDelayDays > 30) || // 1 parcela com atraso longo
                                     (isLowValueOverdue && avgDelayDays > 15)) { // Valor baixo mas atraso significativo
                              riskLevel = 'MÉDIO';
                              riskClass = 'bg-slate-100 border-slate-400 text-slate-800';
                              riskText = 'médio';
                            }
                            // Risco BAIXO: Primeira parcela atrasada, valores baixos, atrasos curtos
                            else {
                              riskLevel = 'BAIXO';
                              riskClass = 'bg-slate-50 border-slate-300 text-slate-700';
                              riskText = 'baixo';
                            }
                          } else {
                            // Se está quitado, risco baixo
                            riskLevel = 'BAIXO';
                            riskClass = 'bg-slate-50 border-slate-300 text-slate-700';
                            riskText = 'baixo';
                          }
                          
                          return (
                            <>
                              <div className={`text-center py-2 px-4 rounded mb-4 text-sm font-medium border font-mono tracking-wider ${riskClass}`}>
                                RISCO {riskLevel}
                              </div>
                              <div className="text-sm font-light text-slate-700 leading-relaxed">
                                <p className="mb-4">
                                  <strong>Dados Consolidados:</strong> O arrematante {arrematante?.nome || 'identificado'} possui risco classificado como {riskText} baseado nos dados históricos de pagamentos. Este relatório consolida 1 contrato com valor total de {formatCurrency(arrematante?.valorPagar)}.{' '}
                                  {(() => {
                                    // Verificar tipo de pagamento
                                    const loteArrematado = arrematante?.loteId 
                                      ? auction.lotes?.find(lote => lote.id === arrematante.loteId)
                                      : null;
                                    const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento;
                                    
                                    if (tipoPagamento === 'a_vista') {
                                      return parcelasPagas > 0 ? 
                                        'Pagamento à vista foi processado' : 
                                        'Pagamento à vista ainda não processado, em período de vencimento';
                                    } else {
                                      if (tipoPagamento === 'entrada_parcelamento') {
                                        if (parcelasPagas > 0) {
                                          return `Foram registrados ${parcelasPagas} pagamentos (entrada + ${parcelasPagas - 1} parcela${parcelasPagas > 2 ? 's' : ''}) de um total de ${quantidadeParcelas + 1} pagamentos programados (entrada + ${quantidadeParcelas} parcelas)`;
                                        } else {
                                          return `Foram processados entrada e ${quantidadeParcelas} parcelas para pagamento, porém nenhum pagamento foi registrado até o momento`;
                                        }
                                    } else {
                                      return parcelasPagas > 0 ? 
                                        `Foram registrados ${parcelasPagas} pagamentos de um total de ${quantidadeParcelas} parcelas programadas` : 
                                          `Foram processadas ${quantidadeParcelas} parcelas para pagamento, porém nenhum pagamento foi registrado até o momento`;
                                      }
                                    }
                                  })()}.
                                </p>
                                
                                {/* Informações sobre parcelas atrasadas para cálculo de risco */}
                                {isCurrentlyOverdue && (
                                  <p className="mb-4">
                                    <strong>Análise de Risco:</strong> O cálculo de risco considera {parcelasAtrasadasCount} parcela{parcelasAtrasadasCount > 1 ? 's' : ''} atualmente em atraso, com valor total de {formatCurrency(valorEmAtraso)} em débito.{' '}
                                    {diasAtrasoMaximo > 0 && (
                                      <>O maior período de atraso registrado é de {diasAtrasoMaximo} dias. </>
                                    )}
                                    {parcelasAtrasadasCount >= 3 ? 
                                      'O elevado número de parcelas em atraso resulta em classificação de risco alto.' :
                                      parcelasAtrasadasCount >= 2 ?
                                        'Múltiplas parcelas em atraso indicam risco médio a alto.' :
                                        diasAtrasoMaximo > 30 ?
                                          'Atraso prolongado indica necessidade de atenção.' :
                                          'Situação de atraso recente com risco controlado.'
                                    }
                                  </p>
                                )}
                                <p>
                                  <strong>Situação Atual:</strong> {(() => {
                                    // Verificar tipo de pagamento para texto adaptativo
                                    const loteArrematado = arrematante?.loteId 
                                      ? auction.lotes?.find(lote => lote.id === arrematante.loteId)
                                      : null;
                                    const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento;
                                    
                                    // Função para calcular data de vencimento baseada no tipo de pagamento
                                    const getVencimentoDate = () => {
                                      try {
                                        switch (tipoPagamento) {
                                          case 'a_vista': {
                                            const dataVencimento = loteArrematado?.dataVencimentoVista || auction.dataVencimentoVista;
                                            if (dataVencimento) {
                                              const [year, month, day] = dataVencimento.split('-').map(Number);
                                              return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
                                            }
                                            return null;
                                          }
                                          case 'entrada_parcelamento': {
                                            if (parcelasPagas === 0) {
                                              // Primeira parcela (entrada)
                                              const dataEntrada = loteArrematado?.dataEntrada || auction.dataEntrada;
                                              if (dataEntrada) {
                                                const [year, month, day] = dataEntrada.split('-').map(Number);
                                                return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
                                              }
                                            } else {
                                              // Parcelas regulares após entrada
                                              const mesInicio = arrematante?.mesInicioPagamento || auction.mesInicioPagamento;
                                              const diaVencimento = arrematante?.diaVencimentoMensal || auction.diaVencimentoPadrao;
                                              if (mesInicio && diaVencimento) {
                                                const [startYear, startMonth] = mesInicio.split('-').map(Number);
                                                const vencimentoDate = new Date(startYear, startMonth - 1 + (parcelasPagas - 1), diaVencimento);
                                                return vencimentoDate.toLocaleDateString('pt-BR');
                                              }
                                            }
                                            return null;
                                          }
                                          case 'parcelamento':
                                          default: {
                                            const mesInicio = arrematante?.mesInicioPagamento || auction.mesInicioPagamento;
                                            const diaVencimento = arrematante?.diaVencimentoMensal || auction.diaVencimentoPadrao;
                                            if (mesInicio && diaVencimento) {
                                              const [startYear, startMonth] = mesInicio.split('-').map(Number);
                                              const vencimentoDate = new Date(startYear, startMonth - 1 + parcelasPagas, diaVencimento);
                                              return vencimentoDate.toLocaleDateString('pt-BR');
                                            }
                                            return null;
                                          }
                                        }
                                      } catch (error) {
                                        console.error('Erro ao calcular data de vencimento:', error);
                                        return null;
                                      }
                                    };
                                    
                                    const dataVencimento = getVencimentoDate();
                                    const vencimentoText = dataVencimento ? ` com vencimento em ${dataVencimento}` : '';
                                    
                                    if (arrematante?.pago) {
                                      return tipoPagamento === 'a_vista' ? 
                                        `Pagamento à vista foi quitado dentro do prazo estabelecido${dataVencimento ? ` (vencimento: ${dataVencimento})` : ''}.` :
                                        'Todos os pagamentos parcelados foram processados com sucesso.';
                                    } else if (isNewContract) {
                                      if (tipoPagamento === 'a_vista') {
                                        const status = !arrematante?.pago && isCurrentlyOverdue ? 'em atraso' : 'pendente';
                                        return `O pagamento à vista de ${formatCurrency(arrematante?.valorPagar)} encontra-se ${status}${vencimentoText}.`;
                                      } else {
                                        const status = !arrematante?.pago && isCurrentlyOverdue ? 'em atraso' : 'pendente de quitação';
                                        // Calcular valor correto considerando múltiplas parcelas em atraso
                                        const valorTotal = arrematante?.valorPagarNumerico || 
                                          (typeof arrematante?.valorPagar === 'number' ? arrematante.valorPagar : 
                                           (typeof arrematante?.valorPagar === 'string' ? parseFloat(arrematante.valorPagar.replace(/[^\d,]/g, '').replace(',', '.')) || 0 : 0));
                                        
                                        const loteArrematado = arrematante?.loteId 
                                          ? auction.lotes?.find(lote => lote.id === arrematante.loteId)
                                          : null;
                                        const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento;
                                        
                                        if (tipoPagamento === 'entrada_parcelamento') {
                                          const valorEntrada = arrematante?.valorEntrada ? 
                                            (typeof arrematante.valorEntrada === 'string' ? 
                                              parseFloat(arrematante.valorEntrada.replace(/[^\d,]/g, '').replace(',', '.')) : 
                                              arrematante.valorEntrada) : 
                                            valorTotal * 0.3;
                                          const valorRestante = valorTotal - valorEntrada;
                                          const valorPorParcela = valorRestante / quantidadeParcelas;
                                          
                                          // Calcular quantas parcelas estão em atraso
                                          let parcelasEmAtraso = 0;
                                          let entradaEmAtraso = false;
                                          
                                          try {
                                            const hoje = new Date();
                                            
                                            // Verificar entrada
                                            const dataEntrada = loteArrematado?.dataEntrada || auction.dataEntrada;
                                            if (dataEntrada && parcelasPagas === 0) {
                                              const vencimentoEntrada = new Date(dataEntrada);
                                              vencimentoEntrada.setHours(23, 59, 59, 999);
                                              entradaEmAtraso = hoje > vencimentoEntrada;
                                            }
                                            
                                            // Verificar parcelas
                                            if (arrematante?.mesInicioPagamento && arrematante?.diaVencimentoMensal) {
                                              const [year, month] = arrematante.mesInicioPagamento.split('-').map(Number);
                                              const parcelaInicioIndex = parcelasPagas > 0 ? parcelasPagas - 1 : 0;
                                              
                                              for (let i = parcelaInicioIndex; i < quantidadeParcelas; i++) {
                                                const parcelaDate = new Date(year, month - 1 + i, arrematante.diaVencimentoMensal);
                                                parcelaDate.setHours(23, 59, 59, 999);
                                                
                                                if (hoje > parcelaDate) {
                                                  parcelasEmAtraso++;
                                                } else {
                                                  break;
                                                }
                                              }
                                            }
                                          } catch (error) {
                                            console.error('Erro ao calcular parcelas em atraso:', error);
                                          }
                                          
                                          if (entradaEmAtraso && parcelasEmAtraso > 0) {
                                            const valorTotalEmAtraso = valorEntrada + (parcelasEmAtraso * valorPorParcela);
                                            return `O contrato de entrada + parcelamento encontra-se em período crítico. Registra-se a entrada (${formatCurrency(valorEntrada)}) e ${parcelasEmAtraso} parcela${parcelasEmAtraso > 1 ? 's' : ''} (${formatCurrency(parcelasEmAtraso * valorPorParcela)}) em atraso, totalizando ${formatCurrency(valorTotalEmAtraso)} ${status}.`;
                                          } else if (entradaEmAtraso) {
                                            return `O contrato de entrada + parcelamento encontra-se em período inicial. Registra-se a entrada com valor de ${formatCurrency(valorEntrada)} ${status}.`;
                                          } else if (parcelasEmAtraso > 0) {
                                            return `O contrato de entrada + parcelamento encontra-se em período crítico. Registra-se ${parcelasEmAtraso} parcela${parcelasEmAtraso > 1 ? 's' : ''} com valor total de ${formatCurrency(parcelasEmAtraso * valorPorParcela)} ${status}.`;
                                          } else {
                                            return `O contrato de entrada + parcelamento encontra-se em período inicial. Próximo vencimento${vencimentoText} com valor de ${formatCurrency(parcelasPagas === 0 ? valorEntrada : valorPorParcela)} ${status}.`;
                                          }
                                        } else {
                                          // Parcelamento simples
                                          const valorPorParcela = valorTotal / quantidadeParcelas;
                                          
                                          // Calcular quantas parcelas estão em atraso
                                          let parcelasEmAtraso = 0;
                                          
                                          try {
                                            const hoje = new Date();
                                            if (arrematante?.mesInicioPagamento && arrematante?.diaVencimentoMensal) {
                                              const [year, month] = arrematante.mesInicioPagamento.split('-').map(Number);
                                              
                                              for (let i = parcelasPagas; i < quantidadeParcelas; i++) {
                                                const parcelaDate = new Date(year, month - 1 + i, arrematante.diaVencimentoMensal);
                                                parcelaDate.setHours(23, 59, 59, 999);
                                                
                                                if (hoje > parcelaDate) {
                                                  parcelasEmAtraso++;
                                                } else {
                                                  break;
                                                }
                                              }
                                            }
                                          } catch (error) {
                                            console.error('Erro ao calcular parcelas em atraso:', error);
                                          }
                                          
                                          if (parcelasEmAtraso > 1) {
                                            return `O contrato de parcelamento encontra-se em período crítico. Registram-se ${parcelasEmAtraso} parcelas com valor total de ${formatCurrency(parcelasEmAtraso * valorPorParcela)} ${status}.`;
                                          } else if (parcelasEmAtraso === 1) {
                                            return `O contrato de parcelamento encontra-se em período inicial. Registra-se a Parcela #${parcelasPagas + 1}${vencimentoText} com valor de ${formatCurrency(valorPorParcela)} ${status}.`;
                                          } else {
                                            return `O contrato de parcelamento encontra-se em período inicial. Próxima Parcela #${parcelasPagas + 1}${vencimentoText} com valor de ${formatCurrency(valorPorParcela)} ${status}.`;
                                          }
                                        }
                                      }
                                    } else {
                                      const statusTexto = isCurrentlyOverdue ? 
                                        { vista: 'atraso que deve ser regularizado', parcelamento: 'atrasos que requerem acompanhamento' } :
                                        { vista: 'pendência que deve ser regularizada', parcelamento: 'pendências que requerem acompanhamento' };
                                      return tipoPagamento === 'a_vista' ?
                                        `Pagamento à vista apresenta ${statusTexto.vista}${vencimentoText}.` :
                                        `Contrato de parcelamento apresenta ${statusTexto.parcelamento}${vencimentoText}.`;
                                    }
                                  })()}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  

                  {/* Informações do Relatório */}
                  <div className="border-t border-slate-200 pt-6">
                    <h4 className="text-sm font-light text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                      Informações do Relatório
                    </h4>
                    <div className="bg-slate-50 border border-slate-200 p-4 text-sm font-light text-slate-700 leading-relaxed">
                      <p className="mb-3">
                        <strong>Escopo do Relatório:</strong> Este documento consolida dados de 1 contrato no valor total de {formatCurrency(auction.arrematante?.valorPagar)} vinculado ao arrematante {auction.arrematante?.nome || 'identificado'}. O período do relatório compreende informações do leilão realizado em {formatDate(auction.dataInicio)}.
                      </p>
                      <p className="mb-3">
                        <strong>Critérios de Classificação:</strong> O perfil de risco foi determinado com base nos seguintes parâmetros: status de pagamento atual, histórico de transações e informações consolidadas do contrato vinculado.
                      </p>
                      <p className="text-xs text-slate-500">
                        <strong>Data de Geração:</strong> {new Date().toLocaleDateString('pt-BR', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })} às {new Date().toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                        <br />
                        Documento gerado automaticamente a partir da base de dados do sistema de gestão de leilões. As informações apresentadas refletem os registros disponíveis na data de geração do relatório.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {comHistorico.length > 3 && (
              <div className="text-center bg-slate-50 border-2 border-slate-300 p-8 font-sans">
                <div className="text-lg font-light text-slate-900 tracking-wide">
                  Documento Completo
                </div>
                <div className="text-sm text-slate-600 font-light mt-3 leading-relaxed">
                  Esta visualização apresenta os primeiros 3 registros.
                  <br />
                  O documento final compreenderá o histórico de todas as {comHistorico.length} transações.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center bg-slate-50 border-2 border-slate-300 p-12 font-sans">
            <div className="text-lg font-light text-slate-900 tracking-wide">Nenhum Histórico Encontrado</div>
            <div className="text-sm text-slate-600 font-light mt-3 leading-relaxed">
              Não há transações com arrematantes registradas no sistema.
            </div>
          </div>
        )}

        {/* Logos Elionx e Arthur Lira */}
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
  }

  if (type === 'faturas') {
    const comFaturas = auctions.filter(a => a.arrematante && !a.arquivado);
    const faturasPagas = comFaturas.filter(a => a.arrematante?.pago);
    const faturasReceber = comFaturas.filter(a => !a.arrematante?.pago);
    const valorTotalReceber = faturasReceber.reduce((sum, a) => {
      const valor = parseFloat(a.arrematante?.valorPagar?.replace(/[^\d,]/g, '').replace(',', '.') || '0');
      return sum + valor;
    }, 0);
    const valorTotalRecebido = faturasPagas.reduce((sum, a) => {
      const valor = parseFloat(a.arrematante?.valorPagar?.replace(/[^\d,]/g, '').replace(',', '.') || '0');
      return sum + valor;
    }, 0);

    return (
      <div className="bg-white space-y-4 min-h-[600px] font-sans">
        {/* Cabeçalho Corporativo */}
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
          <h1 className="text-2xl font-light text-slate-900 tracking-wider uppercase mb-2">
            Relatório Financeiro
          </h1>
          <div className="text-sm text-slate-600 font-light space-y-1">
            <div className="border-b border-slate-200 pb-1 mb-1"></div>
            <div>Data de emissão: {new Date().toLocaleDateString('pt-BR')}</div>
            <div>Horário: {new Date().toLocaleTimeString('pt-BR')}</div>
            <div>Documento: Posicionamento de contas a receber</div>
            <div className="text-xs text-slate-500 mt-1">
              Total de faturas: {comFaturas.length} registro(s)
            </div>
          </div>
        </div>

        {/* Controle de Faturas */}
        {comFaturas.length > 0 ? (
          <div className="space-y-4">
            <div className="border-b border-slate-300 pb-2">
              <h2 className="text-lg font-light text-slate-900 tracking-wide">
                Controle de Recebíveis
              </h2>
              <p className="text-sm text-slate-600 font-light mt-1">
                Posicionamento detalhado das obrigações financeiras
              </p>
            </div>
            
            {comFaturas.slice(0, 3).map((auction, index) => (
              <div key={auction.id} className="border-l-4 border-green-700 bg-white">
                <div className="bg-green-50 px-8 py-6 border-b border-green-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-light text-slate-900 mb-2">
                        Fatura {index + 1} - {auction.identificacao ? `Processo Nº ${auction.identificacao}` : (auction.nome || 'Sem identificação')}
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 uppercase tracking-wider">Situação</div>
                      <div className={`text-sm font-medium mt-1 ${
                        auction.arrematante?.pago 
                          ? 'text-green-800' 
                          : isOverdue(auction.arrematante, auction) 
                            ? 'text-red-800' 
                            : 'text-amber-700'
                      }`}>
                        {auction.arrematante?.pago 
                          ? 'Quitada' 
                          : isOverdue(auction.arrematante, auction) 
                            ? 'ATRASADO' 
                            : 'Em aberto'
                        }
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="px-8 py-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-light text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                      Dados da Obrigação
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-light">
                      <div className="space-y-3">
                        <div className="flex"><span className="text-slate-500 w-24">Cliente:</span> <span className="text-slate-900">{auction.arrematante?.nome || 'Não informado'}</span></div>
                        <div className="flex"><span className="text-slate-500 w-24">Documento:</span> <span className="text-slate-900">{auction.arrematante?.documento || 'Não informado'}</span></div>
                        <div className="flex"><span className="text-slate-500 w-24">Data:</span> <span className="text-slate-900">{formatDate(auction.dataInicio)}</span></div>
                        <div className="flex"><span className="text-slate-500 w-24">Telefone:</span> <span className="text-slate-900">{auction.arrematante?.telefone || 'Não informado'}</span></div>
                        {(() => {
                          const loteComprado = auction.arrematante?.loteId 
                            ? auction.lotes?.find(lote => lote.id === auction.arrematante.loteId)
                            : null;
                          return loteComprado ? (
                            <div className="flex"><span className="text-slate-500 w-24">Lote:</span> <span className="text-slate-900">Lote {loteComprado.numero} - {loteComprado.descricao || 'Sem descrição'}</span></div>
                          ) : null;
                        })()}
                      </div>
                      <div className="space-y-3">
                        <div className="flex"><span className="text-slate-500 w-24">Valor:</span> <span className="text-slate-900 font-medium">{formatCurrency(auction.arrematante?.valorPagarNumerico || auction.arrematante?.valorPagar)}</span></div>
                        <div className="flex"><span className="text-slate-500 w-24">Modalidade:</span> <span className="text-slate-900">{(() => {
                          const loteArrematado = auction.arrematante?.loteId 
                            ? auction.lotes?.find(lote => lote.id === auction.arrematante.loteId)
                            : null;
                          const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento;
                          
                          switch (tipoPagamento) {
                            case 'a_vista':
                              return 'Pagamento à Vista';
                            case 'entrada_parcelamento':
                              return 'Entrada + Parcelamento';
                            case 'parcelamento':
                              return 'Parcelamento';
                            default:
                              return 'Não definido';
                          }
                        })()}</span></div>
                        {(() => {
                          const loteComprado = auction.arrematante?.loteId 
                            ? auction.lotes?.find(lote => lote.id === auction.arrematante.loteId)
                            : null;
                          const tipoPagamento = loteComprado?.tipoPagamento || auction.tipoPagamento;
                          
                          if (tipoPagamento === 'a_vista') {
                            return null; // Não mostrar parcelas para pagamento à vista
                          }
                          
                          const valorTotal = auction.arrematante?.valorPagarNumerico || 
                            (typeof auction.arrematante?.valorPagar === 'number' ? auction.arrematante.valorPagar : 
                             (typeof auction.arrematante?.valorPagar === 'string' ? parseFloat(auction.arrematante.valorPagar.replace(/[^\d,]/g, '').replace(',', '.')) || 0 : 0));
                          const quantidadeParcelas = auction.arrematante?.quantidadeParcelas || 12;
                          const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
                          
                          if (tipoPagamento === 'entrada_parcelamento') {
                            // Para entrada + parcelamento
                            const valorEntrada = auction.arrematante?.valorEntrada ? 
                              (typeof auction.arrematante.valorEntrada === 'string' ? 
                                parseFloat(auction.arrematante.valorEntrada.replace(/[^\d,]/g, '').replace(',', '.')) : 
                                auction.arrematante.valorEntrada) : 
                              valorTotal * 0.3;
                            const valorRestante = valorTotal - valorEntrada;
                            const valorPorParcela = valorRestante / quantidadeParcelas;
                            
                            return (
                              <>
                                <div className="flex"><span className="text-slate-500 w-24">Entrada:</span> <span className="text-slate-900 font-medium">{formatCurrency(valorEntrada)} {parcelasPagas > 0 ? '(Paga)' : '(Pendente)'}</span></div>
                                <div className="flex"><span className="text-slate-500 w-24">Parcelas:</span> <span className="text-slate-900">{quantidadeParcelas} × {formatCurrency(valorPorParcela)}</span></div>
                                <div className="flex"><span className="text-slate-500 w-24">Pagas:</span> <span className="text-slate-900">{Math.max(0, parcelasPagas - 1)} de {quantidadeParcelas} parcelas</span></div>
                              </>
                            );
                          } else {
                            // Para parcelamento simples
                            const valorPorParcela = valorTotal / quantidadeParcelas;
                            
                            return (
                              <>
                                <div className="flex"><span className="text-slate-500 w-24">Parcelas:</span> <span className="text-slate-900">{quantidadeParcelas} × {formatCurrency(valorPorParcela)}</span></div>
                                <div className="flex"><span className="text-slate-500 w-24">Pagas:</span> <span className="text-slate-900">{parcelasPagas} de {quantidadeParcelas}</span></div>
                              </>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  {auction.arrematante?.endereco && (
                    <div className="border-t border-slate-200 pt-6">
                      <h4 className="text-sm font-light text-slate-700 uppercase tracking-wider mb-3 border-b border-slate-200 pb-2">
                        Endereço de Cobrança
                      </h4>
                      <div className="bg-slate-50 border border-slate-200 p-4 text-sm font-light text-slate-800">
                        {auction.arrematante.endereco}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {comFaturas.length > 3 && (
              <div className="text-center bg-slate-50 border-2 border-slate-300 p-8 font-sans">
                <div className="text-lg font-light text-slate-900 tracking-wide">
                  Documento Completo
                </div>
                <div className="text-sm text-slate-600 font-light mt-3 leading-relaxed">
                  Esta visualização apresenta as primeiras 3 faturas.
                  <br />
                  O documento final compreenderá todas as {comFaturas.length} obrigações financeiras.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center bg-slate-50 border-2 border-slate-300 p-12 font-sans">
            <div className="text-lg font-light text-slate-900 tracking-wide">Nenhuma Fatura Encontrada</div>
            <div className="text-sm text-slate-600 font-light mt-3 leading-relaxed">
              Não há obrigações financeiras registradas no sistema.
            </div>
          </div>
        )}

        {/* Logos Elionx e Arthur Lira */}
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
  }

  return null;
};

export default Relatorios;
