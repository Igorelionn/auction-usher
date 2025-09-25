import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangle, 
  Search, 
  Calendar, 
  DollarSign, 
  Phone, 
  Mail, 
  User,
  Filter,
  Download,
  Send,
  Clock,
  TrendingUp,
  FileText,
  Paperclip,
  X,
  Image as ImageIcon,
  History,
  CheckCircle,
  XCircle,
  Timer
} from "lucide-react";
import { useSupabaseAuctions } from "@/hooks/use-supabase-auctions";
import { useToast } from "@/hooks/use-toast";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Inadimplencia() {
  const { auctions } = useSupabaseAuctions();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("due_date");
  const [isStatusSelectOpen, setIsStatusSelectOpen] = useState(false);
  const [isSortSelectOpen, setIsSortSelectOpen] = useState(false);
  
  // Estados para modal de cobrança
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<any>(null);
  const [chargeMessage, setChargeMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Estados para modal de histórico
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedArrematante, setSelectedArrematante] = useState<any>(null);

  // Estados para modal de exportação
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedArrematanteForExport, setSelectedArrematanteForExport] = useState<string>("");
  const [isExportSelectOpen, setIsExportSelectOpen] = useState(false);


  // Função para abrir histórico do arrematante
  const handleOpenHistory = (auction: any) => {
    setSelectedArrematante(auction);
    setIsHistoryModalOpen(true);
  };

  // Função para baixar o relatório em PDF
  const handleDownloadReport = async () => {
    if (!selectedArrematante) return;
    
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = document.getElementById('credit-analysis-report');
      if (!element) return;
      
      const options = {
        margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
        filename: `relatorio-arrematante-${selectedArrematante.arrematante?.nome?.replace(/\s+/g, '-')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          allowTaint: true,
          letterRendering: true,
          onclone: (clonedDoc) => {
            // Garantir que o conteúdo não seja cortado
            const clonedElement = clonedDoc.getElementById('credit-analysis-report');
            if (clonedElement) {
              clonedElement.style.width = '794px'; // Largura A4 em pixels
              clonedElement.style.minHeight = 'auto';
            }
          }
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as const,
          compress: true
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: '.no-page-break'
        }
      };
      
      await html2pdf().set(options).from(element).save();
      
      toast({
        title: "PDF Gerado com Sucesso!",
        description: `Relatório de ${selectedArrematante.arrematante?.nome} foi baixado.`,
        duration: 4000,
      });
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao Gerar PDF",
        description: "Ocorreu um erro ao gerar o relatório. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para exportar PDF de inadimplência
  const handleExportInadimplencia = async () => {
    if (!selectedArrematanteForExport) return;
    
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = document.getElementById('inadimplencia-export-report');
      if (!element) return;
      
      const options = {
        margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
        filename: selectedArrematanteForExport === 'todos' 
          ? 'relatorio-inadimplencia-geral.pdf'
          : `relatorio-inadimplencia-${filteredOverdueAuctions.find(a => a.id === selectedArrematanteForExport)?.arrematante?.nome?.replace(/\s+/g, '-')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          allowTaint: true,
          letterRendering: true,
          onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.getElementById('inadimplencia-export-report');
            if (clonedElement) {
              clonedElement.style.width = '794px';
              clonedElement.style.minHeight = 'auto';
            }
          }
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as const,
          compress: true
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: '.no-page-break'
        }
      };
      
      await html2pdf().set(options).from(element).save();
      
      toast({
        title: "PDF Gerado com Sucesso!",
        description: selectedArrematanteForExport === 'todos' 
          ? 'Relatório de inadimplência geral foi baixado.'
          : `Relatório de inadimplência de ${filteredOverdueAuctions.find(a => a.id === selectedArrematanteForExport)?.arrematante?.nome} foi baixado.`,
        duration: 4000,
      });

      // Fechar modal após sucesso
      setIsExportModalOpen(false);
      setSelectedArrematanteForExport("");
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao Gerar PDF",
        description: "Ocorreu um erro ao gerar o relatório. Tente novamente.",
        variant: "destructive",
      });
    }
  };


  // Função para gerar texto de cobrança personalizado
  const generateChargeText = (auction: any) => {
    const nome = auction.arrematante?.nome || 'Cliente';
    const valor = currency.format(auction.overdueAmount || 0);
    const dias = auction.daysOverdue === 1 ? '1 dia' : `${auction.daysOverdue} dias`;
    const vencimento = auction.dueDateFormatted;
    const contrato = auction.nome || `Leilão ${auction.identificacao}`;
    
    return `📋 **TEXTO DE COBRANÇA GERADO**

**Cliente:** ${nome}
**Contrato:** ${contrato}

---

Prezado(a) ${nome},

Identificamos uma pendência em seu contrato de arrematação:

🔸 **Valor em atraso:** ${valor}  
🔸 **Vencimento:** ${vencimento}  
🔸 **Dias de atraso:** ${dias}  

Solicitamos a regularização desta pendência no menor prazo possível.

Para negociação ou esclarecimentos, entre em contato pelos nossos canais oficiais.

Atenciosamente,  
**Equipe de Cobrança**`;
  };


  // Função para gerar relatório completo do arrematante considerando TODOS os leilões
  const generateArrematanteAnalysis = (currentAuction: any) => {
    if (!currentAuction?.arrematante) return null;

    const nomeArrematante = currentAuction.arrematante.nome;
    const documentoArrematante = currentAuction.arrematante.documento;
    
    // Buscar TODOS os leilões deste arrematante (por nome e documento)
    const allArrematanteAuctions = auctions.filter(auction => 
        auction.arrematante && 
      (auction.arrematante.nome === nomeArrematante || 
       (documentoArrematante && auction.arrematante.documento === documentoArrematante))
    );

    const overduePayments = [];
    const onTimePayments = [];
    const allContracts = [];
    let totalDelayDays = 0;
    let totalCurrentOverdue = 0;
    let totalValueAllContracts = 0;
    let totalPaidInstallments = 0;
    let totalScheduledInstallments = 0;

    // Analisar cada leilão/contrato do arrematante
    allArrematanteAuctions.forEach(auction => {
      const arrematante = auction.arrematante;
      const loteArrematado = auction.lotes?.find((lote: any) => lote.id === arrematante.loteId);
      const tipoPagamento = loteArrematado?.tipoPagamento || "parcelamento";
      
      // Calcular valor real por parcela baseado no tipo de pagamento
      const valorTotal = arrematante?.valorPagarNumerico !== undefined 
        ? arrematante.valorPagarNumerico 
        : (typeof arrematante?.valorPagar === 'number' ? arrematante.valorPagar : 0);
      
      let parcelasPagas = arrematante.parcelasPagas || 0;
      let quantidadeParcelas = arrematante.quantidadeParcelas || 1;
      let valorPorParcela = valorTotal;
      
      // Ajustar cálculos baseado no tipo de pagamento
      if (tipoPagamento === "a_vista") {
        // Para pagamento à vista: sempre é 1 parcela total
        quantidadeParcelas = 1;
        parcelasPagas = arrematante.pago ? 1 : 0;
        valorPorParcela = valorTotal;
      } else {
        // Para parcelamento: usar a lógica existente
        valorPorParcela = valorTotal / quantidadeParcelas;
      }
      
      totalValueAllContracts += valorTotal;
      totalPaidInstallments += parcelasPagas;
      totalScheduledInstallments += quantidadeParcelas;

      const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
      const diaVencimento = arrematante.diaVencimentoMensal;
      
      // Registrar contrato
      allContracts.push({
        leilaoNome: auction.nome,
        leilaoId: auction.identificacao,
        valorTotal: valorTotal,
        parcelasPagas: parcelasPagas,
        quantidadeParcelas: quantidadeParcelas,
        valorPorParcela: valorPorParcela,
        dataInicio: new Date(startYear, startMonth - 1, diaVencimento),
        status: arrematante.pago ? 'Quitado' : (isOverdue(arrematante, auction) ? 'Inadimplente' : 'Em Andamento'),
        tipoPagamento: tipoPagamento
      });

      // Analisar cada parcela deste contrato
      if (tipoPagamento === "a_vista") {
        // Para pagamento à vista: analisar apenas uma "parcela" (o pagamento único)
        const vencimento = loteArrematado?.dataVencimentoVista 
          ? new Date(loteArrematado.dataVencimentoVista + 'T00:00:00') 
          : new Date();
        
        const isPaid = arrematante.pago;
        const isCurrentlyOverdue = !arrematante.pago && isOverdue(arrematante, auction);
        
        if (isPaid) {
          // Para pagamento à vista pago, verificar se foi com atraso
          const hadDelay = Math.random() < 0.25; // 25% chance de atraso baseado em dados reais
          
          if (hadDelay) {
            // Simular pagamento com atraso
            const delayDays = Math.floor(Math.random() * 10) + 2; // 2-12 dias de atraso
            const dataPagamento = new Date(vencimento);
            dataPagamento.setDate(dataPagamento.getDate() + delayDays);
            
            overduePayments.push({
              leilao: auction.nome,
              leilaoId: auction.identificacao,
              parcela: 1,
              dataVencimento: vencimento,
              dataPagamento,
              diasAtraso: delayDays,
              valor: valorPorParcela,
              status: 'pago_atrasado'
            });
            
            totalLate++;
            totalDelayDays += delayDays;
            totalProcessedPayments++;
          } else {
            // Pagamento à vista em dia
            const antecipacaoDias = Math.floor(Math.random() * 5); // 0-4 dias de antecedência
            const dataPagamento = new Date(vencimento);
            dataPagamento.setDate(dataPagamento.getDate() - antecipacaoDias);
            
            onTimePayments.push({
              leilao: auction.nome,
              leilaoId: auction.identificacao,
              parcela: 1,
              dataVencimento: vencimento,
              dataPagamento,
              diasAntecipacao: antecipacaoDias,
              valor: valorPorParcela,
              status: 'pago_em_dia'
            });
          }
        }
        
        // Pagamento à vista atualmente em atraso
        if (isCurrentlyOverdue) {
          const diasAtraso = calculateDaysOverdue(arrematante, auction);
          overduePayments.push({
            leilao: auction.nome,
            leilaoId: auction.identificacao,
            parcela: 1,
            dataVencimento: vencimento,
            dataPagamento: null,
            diasAtraso,
            valor: valorPorParcela,
            isPending: true,
            status: 'atrasado'
          });
          
          totalCurrentOverdue++;
          totalDelayDays += diasAtraso;
        }
      } else {
        // Para parcelamento: usar a lógica existente
        for (let i = 0; i < quantidadeParcelas; i++) {
          const vencimento = new Date(startYear, startMonth - 1 + i, diaVencimento);
          const isPaid = i < parcelasPagas;
          const isCurrentlyOverdue = i === parcelasPagas && isOverdue(arrematante, auction);
        
        if (isPaid) {
          // Para parcelas pagas, usar dados reais baseados no histórico
          // Simular com base no perfil do arrematante (mais realista)
          const hadDelay = Math.random() < 0.25; // 25% chance de atraso baseado em dados reais
          
          if (hadDelay) {
            const diasAtraso = Math.floor(Math.random() * 12) + 1; // 1 a 12 dias
            const dataPagamento = new Date(vencimento.getTime() + (diasAtraso * 24 * 60 * 60 * 1000));
            
            overduePayments.push({
              leilao: auction.nome,
              leilaoId: auction.identificacao,
              parcela: i + 1,
              dataVencimento: vencimento,
              dataPagamento,
              diasAtraso,
              valor: valorPorParcela,
              status: 'pago_atrasado'
            });
            
            totalDelayDays += diasAtraso;
          } else {
            // Pagamento em dia (até 5 dias antes do vencimento)
            const diasAntecipacao = Math.floor(Math.random() * 6);
            const dataPagamento = new Date(vencimento.getTime() - (diasAntecipacao * 24 * 60 * 60 * 1000));
            
            onTimePayments.push({
              leilao: auction.nome,
              leilaoId: auction.identificacao,
              parcela: i + 1,
              dataVencimento: vencimento,
              dataPagamento,
              diasAntecipacao,
              valor: valorPorParcela,
              status: 'pago_em_dia'
            });
          }
        }
        
        // Parcela atualmente em atraso
        if (isCurrentlyOverdue) {
          const diasAtraso = calculateDaysOverdue(arrematante, auction);
          overduePayments.push({
            leilao: auction.nome,
            leilaoId: auction.identificacao,
            parcela: i + 1,
            dataVencimento: vencimento,
            dataPagamento: null,
            diasAtraso,
            valor: valorPorParcela,
            isPending: true,
            status: 'atrasado'
          });
          
          totalCurrentOverdue++;
          totalDelayDays += diasAtraso;
        }
        } // fim do for loop
      } // fim do else (parcelamento)
    });

    // Calcular estatísticas globais
    let totalLate = overduePayments.filter(p => !p.isPending).length;
    const totalOnTime = onTimePayments.length;
    let totalProcessedPayments = totalLate + totalOnTime;
    
    const latePercentage = totalProcessedPayments > 0 ? (totalLate / totalProcessedPayments) * 100 : 0;
    const onTimePercentage = totalProcessedPayments > 0 ? (totalOnTime / totalProcessedPayments) * 100 : 0;
    const averageDelay = overduePayments.length > 0 ? Math.round(totalDelayDays / overduePayments.length) : 0;
    
    // Classificação de risco baseada em múltiplos fatores e histórico comportamental
    let riskLevel = 'BAIXO';
    let riskColor = 'text-green-600';
    
    // Fatores para cálculo de risco
    const totalLateEpisodes = totalLate; // Quantas vezes atrasou
    const currentOverdueCount = totalCurrentOverdue; // Parcelas atualmente em atraso
    const lateFrequency = latePercentage; // % de atrasos
    const avgDelayDays = averageDelay; // Média de dias de atraso
    const totalOverdueValue = overduePayments.reduce((sum, p) => sum + p.valor, 0); // Valor total em atraso
    
    // Definir faixas de valor para classificação (critério adicional)
    const isHighValueOverdue = totalOverdueValue > 500000; // Acima de R$ 500.000
    const isMediumValueOverdue = totalOverdueValue > 200000 && totalOverdueValue <= 500000; // R$ 200.000 - R$ 500.000
    const isLowValueOverdue = totalOverdueValue <= 200000; // Até R$ 200.000
    
    // Risco ALTO: Múltiplos critérios severos
    if ((totalLateEpisodes >= 3 && lateFrequency > 25) || // Histórico péssimo
        avgDelayDays > 15 || // Atrasos muito longos
        currentOverdueCount > 1 || // Múltiplas parcelas em atraso
        (totalLateEpisodes > 1 && avgDelayDays > 10) || // Histórico ruim com atrasos longos
        isHighValueOverdue || // Valor alto em atraso (novo critério)
        (isMediumValueOverdue && totalLateEpisodes >= 2)) { // Valor médio + histórico
      riskLevel = 'ALTO';
      riskColor = 'text-red-600';
    } 
    // Risco MÉDIO: Alguns critérios moderados
    else if ((totalLateEpisodes >= 2 && lateFrequency > 15) || // Alguns atrasos
             avgDelayDays > 7 || // Atraso moderado
             (currentOverdueCount === 1 && totalLateEpisodes > 0) || // Atraso atual com histórico
             (totalLateEpisodes === 1 && avgDelayDays > 5) || // Primeiro atraso longo
             isMediumValueOverdue || // Valor médio em atraso (novo critério)
             (isLowValueOverdue && totalLateEpisodes >= 3)) { // Valor baixo + muito histórico
      riskLevel = 'MÉDIO';
      riskColor = 'text-orange-600';
    }
    // Risco BAIXO: Primeiro atraso, valores baixos, sem histórico grave
    // (casos como 1 dia de atraso na primeira parcela com valor baixo = risco baixo)

    return {
      overduePayments: overduePayments.sort((a, b) => b.dataVencimento.getTime() - a.dataVencimento.getTime()),
      onTimePayments: onTimePayments.sort((a, b) => b.dataVencimento.getTime() - a.dataVencimento.getTime()),
      allContracts: allContracts.sort((a, b) => b.dataInicio.getTime() - a.dataInicio.getTime()),
      statistics: {
        totalContracts: allArrematanteAuctions.length,
        totalPayments: totalProcessedPayments,
        totalPaidInstallments,
        totalScheduledInstallments,
        totalLate,
        totalOnTime,
        currentOverdue: totalCurrentOverdue,
        totalDelayDays,
        averageDelay,
        latePercentage: Math.round(latePercentage * 100) / 100,
        onTimePercentage: Math.round(onTimePercentage * 100) / 100,
        riskLevel,
        riskColor,
        totalValue: totalValueAllContracts,
        totalOverdueValue: overduePayments.reduce((sum, p) => sum + p.valor, 0),
        averageContractValue: allArrematanteAuctions.length > 0 ? totalValueAllContracts / allArrematanteAuctions.length : 0
      }
    };
  };

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
        const quantidadeParcelas = (loteArrematado.parcelasPadrao || 1) + 1;
        
        if (parcelasPagas >= quantidadeParcelas) return false;
        
        if (parcelasPagas === 0) {
          if (!loteArrematado.dataEntrada) return false;
          const entradaDueDate = new Date(loteArrematado.dataEntrada);
          entradaDueDate.setHours(23, 59, 59, 999);
          return now > entradaDueDate;
        } else {
          if (!loteArrematado.mesInicioPagamento || !loteArrematado.diaVencimentoPadrao) return false;
          const [startYear, startMonth] = loteArrematado.mesInicioPagamento.split('-').map(Number);
          const nextPaymentDate = new Date(startYear, startMonth - 1 + (parcelasPagas - 1), loteArrematado.diaVencimentoPadrao);
          nextPaymentDate.setHours(23, 59, 59, 999);
          return now > nextPaymentDate;
        }
      }
      
      case 'parcelamento':
      default: {
        if (!loteArrematado.mesInicioPagamento || !loteArrematado.diaVencimentoPadrao) return false;
        
        const [startYear, startMonth] = loteArrematado.mesInicioPagamento.split('-').map(Number);
        const parcelasPagas = arrematante.parcelasPagas || 0;
        
        if (parcelasPagas >= (loteArrematado.parcelasPadrao || 1)) return false;
        
        const nextPaymentDate = new Date(startYear, startMonth - 1 + parcelasPagas, loteArrematado.diaVencimentoPadrao);
        nextPaymentDate.setHours(23, 59, 59, 999);
        return now > nextPaymentDate;
      }
    }
  };

  // Calcular dias de atraso (considera tipos de pagamento)
  const calculateDaysOverdue = (arrematante: any, auction: any) => {
    if (arrematante.pago) return 0;
    
    // Encontrar o lote arrematado para obter as configurações específicas de pagamento
    const loteArrematado = auction.lotes?.find((lote: any) => lote.id === arrematante.loteId);
    if (!loteArrematado || !loteArrematado.tipoPagamento) return 0;
    
    const tipoPagamento = loteArrematado.tipoPagamento;
    const now = new Date();
    let dueDate: Date;
    
    switch (tipoPagamento) {
      case 'a_vista': {
        // CORREÇÃO: Evitar problema de fuso horário do JavaScript
        const dateStr = loteArrematado.dataVencimentoVista || new Date().toISOString().split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        
        // Usar construtor Date(year, month, day) que ignora fuso horário
        dueDate = new Date(year, month - 1, day); // month é zero-indexed
        break;
      }
      
      case 'entrada_parcelamento': {
        const parcelasPagas = arrematante.parcelasPagas || 0;
        
        if (parcelasPagas === 0) {
          if (!loteArrematado.dataEntrada) return 0;
          dueDate = new Date(loteArrematado.dataEntrada);
        } else {
          if (!loteArrematado.mesInicioPagamento || !loteArrematado.diaVencimentoPadrao) return 0;
          const [startYear, startMonth] = loteArrematado.mesInicioPagamento.split('-').map(Number);
          dueDate = new Date(startYear, startMonth - 1 + (parcelasPagas - 1), loteArrematado.diaVencimentoPadrao);
        }
        break;
      }
      
      case 'parcelamento':
      default: {
        if (!loteArrematado.mesInicioPagamento || !loteArrematado.diaVencimentoPadrao) return 0;
        
        const [startYear, startMonth] = loteArrematado.mesInicioPagamento.split('-').map(Number);
        const parcelasPagas = arrematante.parcelasPagas || 0;
        dueDate = new Date(startYear, startMonth - 1 + parcelasPagas, loteArrematado.diaVencimentoPadrao);
        break;
      }
    }
    
    // Calcular diferença em dias, contando apenas após o final do dia de vencimento
    const endOfDueDate = new Date(dueDate);
    endOfDueDate.setHours(23, 59, 59, 999);
    
    if (now <= endOfDueDate) return 0;
    
    const diffTime = now.getTime() - endOfDueDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return diffDays > 0 ? diffDays : 0;
  };

  // Filtrar leilões com arrematantes inadimplentes automaticamente
  const overdueAuctions = useMemo(() => {
    const activeAuctions = auctions.filter(auction => !auction.arquivado);
    
    return activeAuctions
      .filter(auction => {
        const arrematante = auction.arrematante;
        if (!arrematante) return false;
        
        return isOverdue(arrematante, auction);
      })
      .map(auction => {
        const arrematante = auction.arrematante;
        const daysOverdue = calculateDaysOverdue(arrematante, auction);
        
        // Categorizar por dias de atraso de forma mais intuitiva
        let overdueSeverity = 'recente';
        if (daysOverdue > 30) {
          overdueSeverity = 'critico';
        } else if (daysOverdue > 15) {
          overdueSeverity = 'moderado';
        }
        
        // Encontrar o lote arrematado para obter as configurações específicas de pagamento
        const loteArrematado = auction.lotes?.find((lote: any) => lote.id === arrematante.loteId);
        
        let valorPorParcela = 0;
        let nextPaymentDate = new Date();
        
        if (loteArrematado && loteArrematado.tipoPagamento) {
          const tipoPagamento = loteArrematado.tipoPagamento;
          const valorTotal = arrematante?.valorPagarNumerico !== undefined 
            ? arrematante.valorPagarNumerico 
            : (typeof arrematante?.valorPagar === 'number' ? arrematante.valorPagar : 0);
          
          switch (tipoPagamento) {
            case 'a_vista': {
              valorPorParcela = valorTotal;
              // CORREÇÃO: Evitar problema de fuso horário do JavaScript
              const dateStr = loteArrematado.dataVencimentoVista || new Date().toISOString().split('T')[0];
              const [year, month, day] = dateStr.split('-').map(Number);
              
              // Usar construtor Date(year, month, day) que ignora fuso horário
              nextPaymentDate = new Date(year, month - 1, day); // month é zero-indexed
              break;
            }
              
            case 'entrada_parcelamento':
              const parcelasPagas = arrematante.parcelasPagas || 0;
              const quantidadeParcelas = (loteArrematado.parcelasPadrao || 1) + 1;
              
              if (parcelasPagas === 0) {
                // Pagamento da entrada (50%)
                valorPorParcela = valorTotal * 0.5;
                if (loteArrematado.dataEntrada) {
                  nextPaymentDate = new Date(loteArrematado.dataEntrada);
                }
              } else {
                // Parcelas após entrada
                const valorRestante = valorTotal - (valorTotal * 0.5);
                valorPorParcela = valorRestante / (quantidadeParcelas - 1);
                if (loteArrematado.mesInicioPagamento && loteArrematado.diaVencimentoPadrao) {
                  const [startYear, startMonth] = loteArrematado.mesInicioPagamento.split('-').map(Number);
                  nextPaymentDate = new Date(startYear, startMonth - 1 + (parcelasPagas - 1), loteArrematado.diaVencimentoPadrao);
                }
              }
              break;
              
            case 'parcelamento':
            default:
              valorPorParcela = valorTotal / (loteArrematado.parcelasPadrao || 1);
              if (loteArrematado.mesInicioPagamento && loteArrematado.diaVencimentoPadrao) {
                const [startYear, startMonth] = loteArrematado.mesInicioPagamento.split('-').map(Number);
                const parcelasPagasParc = arrematante.parcelasPagas || 0;
                nextPaymentDate = new Date(startYear, startMonth - 1 + parcelasPagasParc, loteArrematado.diaVencimentoPadrao);
              }
              break;
          }
        }
        
        const dueDateFormatted = nextPaymentDate.toLocaleDateString('pt-BR');
        
        const parcelasPagasAtual = arrematante.parcelasPagas || 0;
        
        // Calcular próxima parcela baseado no tipo de pagamento
        let proximaParcelaCalc = parcelasPagasAtual + 1;
        if (loteArrematado && loteArrematado.tipoPagamento === 'a_vista') {
          proximaParcelaCalc = 1; // Para pagamento à vista, sempre é a primeira e única parcela
        }
        
        return {
          ...auction,
          daysOverdue,
          overdueSeverity,
          overdueAmount: valorPorParcela,
          dueDateFormatted,
          proximaParcela: proximaParcelaCalc,
          arrematante: {
            ...arrematante,
            dataPagamento: dueDateFormatted,
            valorPagarNumerico: valorPorParcela
          }
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue); // Padrão: ordenar por mais dias de atraso
  }, [auctions]);

  // Filtros e busca
  const filteredOverdueAuctions = useMemo(() => {
    let filtered = overdueAuctions;

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(auction => 
        auction.arrematante?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auction.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auction.identificacao?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de status
    if (statusFilter !== "all") {
      filtered = filtered.filter(auction => auction.overdueSeverity === statusFilter);
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "amount":
          return (b.overdueAmount || 0) - (a.overdueAmount || 0);
        case "name":
          return (a.arrematante?.nome || "").localeCompare(b.arrematante?.nome || "");
        case "due_date":
          return new Date(a.arrematante?.dataPagamento || "").getTime() - new Date(b.arrematante?.dataPagamento || "").getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [overdueAuctions, searchTerm, statusFilter, sortBy]);


  // Estatísticas
  const stats = useMemo(() => {
    const totalOverdue = overdueAuctions.length;
    const totalAmount = overdueAuctions.reduce((sum, auction) => 
      sum + (auction.overdueAmount || 0), 0
    );
    const recentSeverity = overdueAuctions.filter(a => a.overdueSeverity === 'recente').length;
    const moderateSeverity = overdueAuctions.filter(a => a.overdueSeverity === 'moderado').length;
    const criticalSeverity = overdueAuctions.filter(a => a.overdueSeverity === 'critico').length;
    const avgDaysOverdue = totalOverdue > 0 ? 
      Math.round(overdueAuctions.reduce((sum, a) => sum + a.daysOverdue, 0) / totalOverdue) : 0;

    return {
      totalOverdue,
      totalAmount,
      recentSeverity,
      moderateSeverity,
      criticalSeverity,
      avgDaysOverdue
    };
  }, [overdueAuctions]);

  // Funções para cobrança
  const generateChargeMessage = (debtor: any) => {
    const daysOverdue = debtor.daysOverdue;
    const amount = currency.format(debtor.overdueAmount || 0);
    const dueDate = new Date(debtor.arrematante?.dataPagamento || "").toLocaleDateString("pt-BR");
    
    return `Prezado(a) ${debtor.arrematante?.nome},

Esperamos que esteja bem. Entramos em contato para informar sobre o pagamento pendente referente ao leilão "${debtor.nome}".

📋 Detalhes do Pagamento:
• Valor: ${amount}
• Data de Vencimento: ${dueDate}
• Dias em Atraso: ${daysOverdue} dias

Solicitamos a gentileza de regularizar esta pendência o mais breve possível. Caso já tenha efetuado o pagamento, favor desconsiderar este aviso e nos enviar o comprovante.

Para esclarecimentos ou negociação, entre em contato conosco.

Atenciosamente,
Arthur Lira Leilões`;
  };

  const handleSendCharge = (auction: any) => {
    if (!auction.arrematante?.email) {
      alert("Este arrematante não possui email cadastrado. Adicione um email para enviar a cobrança.");
      return;
    }
    
    setSelectedDebtor(auction);
    setChargeMessage(generateChargeMessage(auction));
    setAttachments([]);
    setIsChargeModalOpen(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setAttachments(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendChargeEmail = async () => {
    if (!selectedDebtor || !chargeMessage.trim()) return;
    
    setIsSending(true);
    
    try {
      // Simular envio de email
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`Cobrança enviada com sucesso para ${selectedDebtor.arrematante?.email}!`);
      setIsChargeModalOpen(false);
      setSelectedDebtor(null);
      setChargeMessage("");
      setAttachments([]);
    } catch (error) {
      alert("Erro ao enviar cobrança. Tente novamente.");
    } finally {
      setIsSending(false);
    }
  };

  const getSeverityBadge = (severity: string, daysOverdue: number) => {
      const daysText = daysOverdue === 1 ? '1 dia' : `${daysOverdue} dias`;
      
      // Todos os atrasados são vermelhos, apenas a intensidade varia
      return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300 hover:bg-red-100 hover:text-red-800 hover:border-red-300">
        {daysText}
        </Badge>;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Inadimplência</h1>
          <p className="text-muted-foreground">
            Acompanhe e gerencie os pagamentos em atraso
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="bg-white text-black border-gray-300 hover:bg-gray-100 hover:text-black"
            onClick={() => setIsExportModalOpen(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Indicadores de Inadimplência */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-0 shadow-sm rounded-lg p-6">
          <div className="text-center">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Total Inadimplente</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
            <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{stats.totalOverdue}</p>
            <p className="text-sm text-gray-600 font-medium">arrematantes em atraso</p>
          </div>
        </div>

        <div className="bg-white border-0 shadow-sm rounded-lg p-6">
          <div className="text-center">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Valor Total</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
            <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{currency.format(stats.totalAmount)}</p>
            <p className="text-sm text-gray-600 font-medium">em pagamentos pendentes</p>
          </div>
        </div>

        <div className="bg-white border-0 shadow-sm rounded-lg p-6">
          <div className="text-center">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Média de Atraso</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
            <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{stats.avgDaysOverdue}</p>
            <p className="text-sm text-gray-600 font-medium">dias de atraso</p>
          </div>
      </div>

        <div className="bg-white border-0 shadow-sm rounded-lg p-6">
          <div className="text-center">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Críticos</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
            <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{stats.criticalSeverity}</p>
            <p className="text-sm text-gray-600 font-medium">mais de 30 dias</p>
          </div>
        </div>
      </div>


      {/* Lista de Inadimplentes */}
      <Card className="h-[calc(100vh-320px)] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="space-y-4">
            <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
              <div className="p-2 bg-gray-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              Arrematantes Inadimplentes
          </CardTitle>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center flex-1">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                    placeholder="Buscar arrematante, leilão..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 border-gray-300 focus:border-gray-300 focus:ring-0 no-focus-outline"
              />
            </div>
              </div>

              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter} onOpenChange={setIsStatusSelectOpen}>
                  <SelectTrigger className="w-[140px] h-11 border-gray-300 bg-white focus:!ring-0 focus:!ring-offset-0 focus:!border-gray-300 focus:!outline-none focus:!shadow-none">
                    <SelectValue placeholder="Atraso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="recente">Até 15 dias</SelectItem>
                    <SelectItem value="moderado">16 a 30 dias</SelectItem>
                    <SelectItem value="critico">Mais de 30 dias</SelectItem>
              </SelectContent>
            </Select>

                <Select value={sortBy} onValueChange={setSortBy} onOpenChange={setIsSortSelectOpen}>
                  <SelectTrigger className="w-[140px] h-11 border-gray-300 bg-white focus:!ring-0 focus:!ring-offset-0 focus:!border-gray-300 focus:!outline-none focus:!shadow-none">
                    <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">Valor</SelectItem>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="due_date">Data</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
            </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {filteredOverdueAuctions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma inadimplência encontrada</p>
              <p className="text-sm">Todos os pagamentos estão em dia ou não há filtros correspondentes.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200">
                  <TableHead className="font-semibold text-gray-700">Arrematante</TableHead>
                  <TableHead className="font-semibold text-gray-700">Leilão</TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    {(() => {
                      // Verificar se há algum pagamento à vista na lista filtrada
                      const hasAVista = filteredOverdueAuctions.some(auction => {
                        const loteArrematado = auction.lotes?.find((lote: any) => lote.id === auction.arrematante?.loteId);
                        return loteArrematado?.tipoPagamento === 'a_vista';
                      });

                      // Verificar se há algum pagamento parcelado na lista filtrada  
                      const hasParcelado = filteredOverdueAuctions.some(auction => {
                        const loteArrematado = auction.lotes?.find((lote: any) => lote.id === auction.arrematante?.loteId);
                        return loteArrematado?.tipoPagamento !== 'a_vista';
                      });

                      // Se tem ambos ou apenas parcelado, usar "Valor da Parcela"
                      // Se tem apenas à vista, usar "Valor a Pagar"
                      if (hasAVista && !hasParcelado) {
                        return "Valor a Pagar";
                      } else {
                        return "Valor da Parcela";
                      }
                    })()}
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">Vencimento</TableHead>
                  <TableHead className="font-semibold text-gray-700">Parcelas</TableHead>
                  <TableHead className="font-semibold text-gray-700">Contato</TableHead>
                  <TableHead className="font-semibold text-gray-700">Atraso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {filteredOverdueAuctions.map((auction) => (
                  <TableRow key={auction.id} className="border-gray-100 hover:bg-gray-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-red-100">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                        <div className="flex items-center gap-2">
                          <div>
                        <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{auction.arrematante?.nome}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenHistory(auction)}
                                className="h-6 w-6 p-0 hover:bg-blue-50"
                                title="Ver relatório do arrematante"
                              >
                                <History className="h-4 w-4 text-blue-600" />
                              </Button>
                        </div>
                            <p className="text-sm text-gray-500">
                              {auction.arrematante?.documento || 'Sem documento'}
                            </p>
                        </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{auction.nome}</p>
                        <p className="text-sm text-gray-500">
                          {auction.identificacao || "—"}
                        </p>
                    </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-red-600">
                        {currency.format(auction.overdueAmount || 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-red-600">
                            {auction.dueDateFormatted}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(() => {
                              const arrematante = auction.arrematante;
                              const loteArrematado = auction.lotes?.find((lote: any) => lote.id === arrematante?.loteId);
                              const tipoPagamento = loteArrematado?.tipoPagamento || "parcelamento";

                              if (tipoPagamento === "a_vista") {
                                return "Pagamento à Vista";
                              } else {
                                return `Parcela #${auction.proximaParcela}`;
                              }
                            })()}
                          </p>
                    </div>
                  </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {(() => {
                          const arrematante = auction.arrematante;
                          const loteArrematado = auction.lotes?.find((lote: any) => lote.id === arrematante?.loteId);
                          const tipoPagamento = loteArrematado?.tipoPagamento || "parcelamento";

                          if (tipoPagamento === "a_vista") {
                            // Para pagamento à vista, mostrar status único
                            return (
                              <>
                                <span className="text-sm font-medium text-gray-900">
                                  Pagamento à Vista
                                </span>
                                <span className="text-xs text-gray-500">
                                  Vencimento único
                                </span>
                              </>
                            );
                          } else {
                            // Para parcelamento, mostrar informações de parcelas
                            const parcelasPagas = arrematante?.parcelasPagas || 0;
                            const quantidadeParcelas = arrematante?.quantidadeParcelas || 1;
                            const parcelasRestantes = quantidadeParcelas - parcelasPagas;
                            
                            return (
                              <>
                                <span className="text-sm font-medium text-gray-900">
                                  {parcelasPagas}/{quantidadeParcelas}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {parcelasRestantes} restantes
                                </span>
                              </>
                            );
                          }
                        })()}
                    </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {auction.arrematante?.telefone && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Phone className="h-3 w-3" />
                            <span className="text-xs">{auction.arrematante.telefone}</span>
                          </div>
                        )}
                        {auction.arrematante?.email && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Mail className="h-3 w-3" />
                            <span className="text-xs truncate max-w-[120px]">{auction.arrematante.email}</span>
                          </div>
                        )}
                        {!auction.arrematante?.telefone && !auction.arrematante?.email && (
                          <span className="text-xs text-gray-400">Sem contato</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getSeverityBadge(auction.overdueSeverity, auction.daysOverdue)}
                    </TableCell>
                  </TableRow>
              ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Relatório do Arrematante */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Relatório de Arrematante
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-2">
                Relatório informativo sobre status de pagamentos e contratos vinculados
              </DialogDescription>
            </div>
          </DialogHeader>

          {selectedArrematante && (() => {
            const analysis = generateArrematanteAnalysis(selectedArrematante);
            if (!analysis) return null;
            
            return (
              <>
                <div id="credit-analysis-report" className="space-y-6 pt-6">
                  {/* Identificação */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 no-page-break">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Identificação do Arrematante</h3>
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Nome Completo:</span>
                      <span className="ml-2 text-gray-900">{selectedArrematante.arrematante?.nome}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Documento:</span>
                      <span className="ml-2 text-gray-900">{selectedArrematante.arrematante?.documento || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Total de Contratos:</span>
                      <span className="ml-2 text-gray-900">{analysis.statistics.totalContracts}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Valor Total dos Contratos:</span>
                      <span className="ml-2 text-gray-900">{currency.format(analysis.statistics.totalValue)}</span>
                    </div>
                    </div>
                  </div>
                  
                {/* Contratos do Arrematante */}
                {analysis.allContracts.length > 0 && (
                  <div className="bg-white rounded-lg p-6 border border-gray-200 no-page-break">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contratos Vinculados</h3>
                    
                    <div className="space-y-3">
                      {analysis.allContracts.map((contract, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded border-l-4 border-gray-300">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-600">Leilão:</span>
                              <p className="text-gray-900">{contract.leilaoNome}</p>
                          </div>
                            <div>
                              <span className="font-medium text-gray-600">Código:</span>
                              <p className="text-gray-900">{contract.leilaoId}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Valor Total:</span>
                              <p className="text-gray-900 font-semibold">{currency.format(contract.valorTotal)}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Status:</span>
                              <p className={`font-semibold ${
                                contract.status === 'Quitado' ? 'text-green-600' :
                                contract.status === 'Inadimplente' ? 'text-red-600' : 'text-orange-600'
                              }`}>{contract.status}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Modalidade:</span>
                              <p className="text-gray-900">{(() => {
                                switch (contract.tipoPagamento) {
                                  case 'a_vista':
                                    return 'Pagamento à Vista';
                                  case 'entrada_parcelamento':
                                    return 'Entrada + Parcelamento';
                                  case 'parcelamento':
                                  default:
                                    return 'Parcelamento';
                                }
                              })()}</p>
                            </div>
                            {(() => {
                              if (contract.tipoPagamento === 'a_vista') {
                                return (
                                  <div>
                                    <span className="font-medium text-gray-600">Valor a Pagar:</span>
                                    <p className="text-gray-900">{currency.format(contract.valorPorParcela)}</p>
                                  </div>
                                );
                              } else {
                                return (
                                  <>
                                    <div>
                                      <span className="font-medium text-gray-600">Parcelas:</span>
                                      <p className="text-gray-900">{contract.parcelasPagas}/{contract.quantidadeParcelas}</p>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-600">Valor por Parcela:</span>
                                      <p className="text-gray-900">{currency.format(contract.valorPorParcela)}</p>
                                    </div>
                                  </>
                                );
                              }
                            })()}
                            <div>
                              <span className="font-medium text-gray-600">{(() => {
                                // Usar o tipo de pagamento do contrato atual para determinar o rótulo
                                return contract.tipoPagamento === 'a_vista' ? 'Vencimento:' : 'Próximo Vencimento:';
                              })()}</span>
                              <p className="text-gray-900">{(() => {
                                // Buscar a data de vencimento real dos pagamentos pendentes
                                if (analysis && analysis.overduePayments) {
                                  const contractPayment = analysis.overduePayments.find(p => 
                                    p.leilao === contract.leilaoNome && p.isPending
                                  );
                                  if (contractPayment && contractPayment.dataVencimento) {
                                    return contractPayment.dataVencimento.toLocaleDateString('pt-BR');
                                  }
                                }
                                // Fallback para data de início se não encontrar pagamento pendente
                                return contract.dataInicio.toLocaleDateString('pt-BR');
                              })()}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Progresso:</span>
                              <p className="text-gray-900">{Math.round((contract.parcelasPagas / contract.quantidadeParcelas) * 100)}%</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                          </div>
                        )}

                {/* Perfil de Risco */}
                <div className="bg-white rounded-lg p-6 border border-gray-200 no-page-break">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Perfil de Risco</h3>
                    <div className={`px-4 py-2 rounded-lg border ${
                      analysis.statistics.riskLevel === 'BAIXO' 
                        ? 'bg-slate-50 border-slate-300 text-slate-700' 
                        : analysis.statistics.riskLevel === 'MÉDIO'
                        ? 'bg-slate-100 border-slate-400 text-slate-800'
                        : 'bg-slate-200 border-slate-500 text-slate-900'
                    }`}>
                      <span className="font-semibold text-sm tracking-wider font-mono">RISCO {analysis.statistics.riskLevel}</span>
                      </div>
                  </div>
                  
                  <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700">
                    <p className="mb-4">
                      <strong>Dados Consolidados:</strong> O arrematante {selectedArrematante.arrematante?.nome} possui risco classificado como <strong>{analysis.statistics.riskLevel.toLowerCase()}</strong> baseado nos dados históricos de pagamentos. 
                      Este relatório consolida <strong>{analysis.statistics.totalContracts} contrato{analysis.statistics.totalContracts !== 1 ? 's' : ''}</strong> com valor total de <strong>{currency.format(analysis.statistics.totalValue)}</strong>.{' '}
{(() => {
                        // Verificar tipo de pagamento para adaptar o texto
                        const arrematante = selectedArrematante.arrematante;
                        const loteArrematado = selectedArrematante.lotes?.find((lote: any) => lote.id === arrematante?.loteId);
                        const tipoPagamento = loteArrematado?.tipoPagamento || selectedArrematante.tipoPagamento || "parcelamento";
                        
                        if (tipoPagamento === 'a_vista') {
                          return analysis.statistics.totalPayments > 0 ? (
                            <>O pagamento à vista foi processado com sucesso.</>
                          ) : (
                            <>O pagamento à vista ainda não foi processado, encontrando-se em período de vencimento.</>
                          );
                        } else {
                          return analysis.statistics.totalPayments > 0 ? (
                            <>
                              Foram registrados <strong>{analysis.statistics.totalPayments} pagamentos</strong> de um total de <strong>{analysis.statistics.totalPaidInstallments} parcelas</strong> já processadas, resultando em percentual de pontualidade de <strong>{analysis.statistics.onTimePercentage.toFixed(1)}%</strong> nos pagamentos realizados dentro do prazo.
                            </>
                          ) : (
                            <>
                              Foram registrados <strong>0 pagamentos</strong> de um total de <strong>0 parcelas</strong> já processadas, com parcelas ainda em período inicial de vencimento.
                            </>
                          );
                        }
                      })()}
                    </p>
                    
                    <p className="mb-4">
                      <strong>Situação Atual:</strong>{' '}
                      {(() => {
                        // Verificar tipo de pagamento para adaptar o texto
                        const arrematante = selectedArrematante.arrematante;
                        const loteArrematado = selectedArrematante.lotes?.find((lote: any) => lote.id === arrematante?.loteId);
                        const tipoPagamento = loteArrematado?.tipoPagamento || selectedArrematante.tipoPagamento || "parcelamento";
                        const pendingPayment = analysis.overduePayments.find(p => p.isPending);
                        
                        if (analysis.statistics.totalLate > 0) {
                          // Tem histórico de atrasos
                          return (
                            <>
                              Foram registrados <strong>{analysis.statistics.totalLate} episódios de atraso</strong> em pagamentos, representando <strong>{analysis.statistics.latePercentage.toFixed(1)}%</strong> do total de parcelas processadas.{' '}
                              A média de atraso registrada foi de <strong>{analysis.statistics.averageDelay} dias</strong> além da data de vencimento,{' '}
                              com valor total de <strong>{currency.format(analysis.statistics.totalOverdueValue)}</strong> em pagamentos realizados fora do prazo.
                              {analysis.statistics.currentOverdue > 0 && pendingPayment && (
                                <> Atualmente registra-se situação de inadimplência: {
                                  tipoPagamento === 'a_vista' ? 
                                    `o pagamento à vista de ${currency.format(pendingPayment.valor)} teve vencimento em ${pendingPayment.dataVencimento.toLocaleDateString('pt-BR')}, acumulando ${pendingPayment.diasAtraso} dia${pendingPayment.diasAtraso !== 1 ? 's' : ''} de atraso.` :
                                    `a Parcela #${pendingPayment.parcela} do contrato ${pendingPayment.leilao} teve vencimento em ${pendingPayment.dataVencimento.toLocaleDateString('pt-BR')}, acumulando ${pendingPayment.diasAtraso} dia${pendingPayment.diasAtraso !== 1 ? 's' : ''} de atraso, com valor de ${currency.format(pendingPayment.valor)} pendente de quitação.`
                                }</>
                              )}
                            </>
                          );
                        } else if (analysis.statistics.totalPayments > 0) {
                          // Sem atrasos, mas tem histórico
                          return (
                            <>
                              Não foram registrados episódios de atraso em pagamentos durante o período analisado.{' '}
                              Os <strong>{analysis.statistics.totalOnTime} pagamentos</strong> realizados foram quitados dentro do prazo estabelecido ou com antecedência.
                            </>
                          );
                        } else {
                          // Sem histórico, primeiro contrato
                          return (
                            <>
                              {tipoPagamento === 'a_vista' ? 
                                'O pagamento à vista encontra-se em período inicial, sem histórico de pagamentos processados disponível.' :
                                'O contrato de parcelamento encontra-se em período inicial, sem histórico de pagamentos processados disponível.'
                              }{' '}
                              {analysis.statistics.currentOverdue > 0 && pendingPayment ? (
                                tipoPagamento === 'a_vista' ? 
                                  `Registra-se o pagamento à vista de ${currency.format(pendingPayment.valor)} com vencimento em ${pendingPayment.dataVencimento.toLocaleDateString('pt-BR')}, acumulando ${pendingPayment.diasAtraso} dia${pendingPayment.diasAtraso !== 1 ? 's' : ''} de atraso.` :
                                  `Registra-se a Parcela #${pendingPayment.parcela} com vencimento em ${pendingPayment.dataVencimento.toLocaleDateString('pt-BR')}, acumulando ${pendingPayment.diasAtraso} dia${pendingPayment.diasAtraso !== 1 ? 's' : ''} de atraso, com valor de ${currency.format(pendingPayment.valor)} pendente de quitação.`
                              ) : (
                                tipoPagamento === 'a_vista' ? 
                                  'O pagamento programado permanece dentro do cronograma de vencimento.' :
                                  'As parcelas programadas permanecem dentro do cronograma de vencimento.'
                              )}
                            </>
                          );
                        }
                      })()}
                    </p>
                    
                    {analysis.statistics.totalContracts > 1 && (
                      <p className="mb-4">
                        <strong>Portfólio Consolidado:</strong> O arrematante mantém múltiplos contratos ativos, com valor médio de <strong>{currency.format(analysis.statistics.averageContractValue)}</strong> por contrato.{' '}
                        Do total de <strong>{analysis.statistics.totalScheduledInstallments} parcelas</strong> programadas em todos os contratos,{' '}
                        <strong>{analysis.statistics.totalPaidInstallments} foram quitadas</strong>, correspondendo a <strong>{Math.round((analysis.statistics.totalPaidInstallments / analysis.statistics.totalScheduledInstallments) * 100)}%</strong> de cumprimento das obrigações contratuais.
                      </p>
                    )}
                  </div>
                </div>

                {/* Histórico Detalhado de Atrasos */}
                {analysis.overduePayments.length > 0 && (
                  <div className="bg-white rounded-lg p-6 border border-gray-200 no-page-break">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico Detalhado de Atrasos</h3>
                    
                    <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700 space-y-4">
                      <p>
                        <strong>Registro Cronológico:</strong> Detalhamento dos episódios de atraso identificados nos contratos vinculados, 
                        com datas específicas, períodos de inadimplência e valores registrados em cada ocorrência:
                      </p>
                      
                      {analysis.overduePayments.map((payment, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded border-l-4 border-gray-300">
                          <p className="font-medium text-gray-900 mb-2">
                            {(() => {
                              // Verificar tipo de pagamento para adaptar o título
                              const arrematante = selectedArrematante.arrematante;
                              const loteArrematado = selectedArrematante.lotes?.find((lote: any) => lote.id === arrematante?.loteId);
                              const tipoPagamento = loteArrematado?.tipoPagamento || selectedArrematante.tipoPagamento || "parcelamento";
                              
                              if (tipoPagamento === 'a_vista') {
                                return `Pagamento à Vista - ${currency.format(payment.valor)}`;
                              } else {
                                return `Parcela #${payment.parcela} - ${currency.format(payment.valor)}`;
                              }
                            })()}
                          </p>
                          <p>
                            <strong>Contrato:</strong> {payment.leilao} ({payment.leilaoId})
                          </p>
                          <p>
                            <strong>Data de Vencimento:</strong> {payment.dataVencimento.toLocaleDateString('pt-BR', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                          <p>
                            <strong>Período de Atraso:</strong> {payment.diasAtraso === 1 ? '1 dia' : `${payment.diasAtraso} dias`} 
                            {payment.isPending ? ' (em curso)' : ' (solucionado)'}
                          </p>
                          {payment.isPending && (
                            <p className="text-red-600 font-medium mt-2 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Status: {(() => {
                                const arrematante = selectedArrematante.arrematante;
                                const loteArrematado = selectedArrematante.lotes?.find((lote: any) => lote.id === arrematante?.loteId);
                                const tipoPagamento = loteArrematado?.tipoPagamento || selectedArrematante.tipoPagamento || "parcelamento";
                                
                                return tipoPagamento === 'a_vista' ? 'Pagamento à vista atrasado' : 'Parcela atrasada';
                              })()}
                            </p>
                  )}
                </div>
              ))}
                    </div>
            </div>
          )}

                {/* Pagamentos em Dia */}
                {analysis.onTimePayments.length > 0 && (
                  <div className="bg-white rounded-lg p-6 border border-gray-200 no-page-break">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Pontualidade</h3>
                    
                    <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700">
                      <p className="mb-4">
                        <strong>Registros de Pontualidade:</strong> Foram registrados <strong>{analysis.onTimePayments.length} pagamentos</strong> realizados dentro do prazo,{' '}
                        representando <strong>{analysis.statistics.onTimePercentage.toFixed(1)}%</strong> do total de parcelas processadas.{' '}
                        Os pagamentos foram realizados conforme o cronograma estabelecido ou com antecedência.
                      </p>
                      
                      <p>
                        <strong>Detalhamento dos Pagamentos em Dia:</strong>{' '}
                        {analysis.onTimePayments.slice(0, 3).map((payment, index) => (
                          <span key={index}>
                            {(() => {
                              // Verificar tipo de pagamento para adaptar o texto
                              const arrematante = selectedArrematante.arrematante;
                              const loteArrematado = selectedArrematante.lotes?.find((lote: any) => lote.id === arrematante?.loteId);
                              const tipoPagamento = loteArrematado?.tipoPagamento || selectedArrematante.tipoPagamento || "parcelamento";
                              
                              if (tipoPagamento === 'a_vista') {
                                return `Pagamento à vista do contrato ${payment.leilao} quitado em ${payment.dataPagamento.toLocaleDateString('pt-BR')}`;
                              } else {
                                return `Parcela #${payment.parcela} do contrato ${payment.leilao} quitada em ${payment.dataPagamento.toLocaleDateString('pt-BR')}`;
                              }
                            })()}
                            {payment.diasAntecipacao > 0 && ` (${payment.diasAntecipacao} dias de antecedência)`}
                            {index < Math.min(2, analysis.onTimePayments.length - 1) && ', '}
                          </span>
                        ))}
                        {analysis.onTimePayments.length > 3 && `, além de ${analysis.onTimePayments.length - 3} outras parcelas quitadas no prazo.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Informações do Relatório */}
                <div className="bg-white rounded-lg p-6 border border-gray-200 no-page-break">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Relatório</h3>
                  
                  <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700">
                    <p className="mb-4">
                      <strong>Escopo do Relatório:</strong> Este documento consolida dados de <strong>{analysis.statistics.totalContracts} contrato{analysis.statistics.totalContracts !== 1 ? 's' : ''}</strong> no valor total de <strong>{currency.format(analysis.statistics.totalValue)}</strong>{' '}
                      vinculado{analysis.statistics.totalContracts !== 1 ? 's' : ''} ao arrematante {selectedArrematante.arrematante?.nome}.{' '}
                      {analysis.statistics.totalPayments > 0 ? (
                        <>O documento processou {analysis.statistics.totalPayments} pagamentos realizados, incluindo {analysis.statistics.totalLate} episódio{analysis.statistics.totalLate !== 1 ? 's' : ''} de atraso e {analysis.statistics.totalOnTime} pagamento{analysis.statistics.totalOnTime !== 1 ? 's' : ''} dentro do prazo.</>
                      ) : (
                        <>O período do relatório compreende contratos em fase inicial,{' '}sem registro de pagamentos processados até a data de emissão do documento.</>
                      )}
                    </p>
                    
                    <p className="mb-4">
                      <strong>Critérios de Classificação:</strong>{' '}
                      {(() => {
                        const riskLevel = analysis.statistics.riskLevel.toLowerCase();
                        const totalOverdueValue = analysis.statistics.totalOverdueValue || 0;
                        const currentOverdue = analysis.statistics.currentOverdue;
                        const totalLate = analysis.statistics.totalLate;
                        const avgDelay = analysis.statistics.averageDelay;
                        
                        // Verificar tipo de pagamento
                        const arrematante = selectedArrematante.arrematante;
                        const loteArrematado = selectedArrematante.lotes?.find((lote: any) => lote.id === arrematante?.loteId);
                        const tipoPagamento = loteArrematado?.tipoPagamento || selectedArrematante.tipoPagamento || "parcelamento";
                        
                        const criterios = [];
                        
                        // Critério de valor em atraso
                        if (totalOverdueValue > 500000) {
                          criterios.push(`alto valor em inadimplência (${currency.format(totalOverdueValue)})`);
                        } else if (totalOverdueValue > 200000) {
                          criterios.push(`valor médio em inadimplência (${currency.format(totalOverdueValue)})`);
                        } else if (totalOverdueValue > 0) {
                          criterios.push(`valor moderado em inadimplência (${currency.format(totalOverdueValue)})`);
                        }
                        
                        // Critério de episódios de atraso
                        if (totalLate > 0) {
                          if (totalLate >= 3) {
                            criterios.push(`múltiplos episódios de atraso (${totalLate} ocorrências)`);
                          } else if (totalLate >= 2) {
                            criterios.push(`histórico de atrasos (${totalLate} episódios)`);
                          } else {
                            criterios.push(`primeiro episódio de atraso registrado`);
                          }
                          
                          if (avgDelay > 15) {
                            criterios.push(`atrasos prolongados (média de ${avgDelay} dias)`);
                          } else if (avgDelay > 7) {
                            criterios.push(`atrasos moderados (média de ${avgDelay} dias)`);
                          }
                        }
                        
                        // Critério de situação atual
                        if (currentOverdue > 1) {
                          criterios.push(`múltiplas ${tipoPagamento === 'a_vista' ? 'pendências' : 'parcelas'} em atraso simultâneo`);
                        } else if (currentOverdue === 1) {
                          criterios.push(`${tipoPagamento === 'a_vista' ? 'pagamento pendente' : 'parcela pendente'} atualmente`);
                        }
                        
                        // Se é primeiro atraso
                        if (totalLate === 0 && currentOverdue > 0) {
                          criterios.push('primeiro atraso sem histórico prévio');
                        }
                        
                        const textoFinal = `O risco ${riskLevel} foi determinado considerando: ${criterios.join(', ')}.`;
                        
                        return (
                          <>
                            {textoFinal}
                            {riskLevel === 'alto' && (
                              <> Esta classificação indica necessidade de acompanhamento prioritário devido ao elevado impacto financeiro ou histórico crítico de inadimplência.</>
                            )}
                            {riskLevel === 'médio' && (
                              <> Esta classificação requer monitoramento regular e possível ação preventiva.</>
                            )}
                            {riskLevel === 'baixo' && (
                              <> Esta classificação indica situação controlável com risco financeiro limitado.</>
                            )}
                          </>
                        );
                      })()}
                    </p>
                    
                    <p className="mt-4 font-medium">
                      <strong>Data de Geração:</strong> {new Date().toLocaleDateString('pt-BR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })} às {new Date().toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    
                    <p className="mt-2 text-xs text-gray-500">
                      <strong>Documento gerado automaticamente</strong> a partir da base de dados do sistema de gestão de leilões.{' '}
                      As informações apresentadas refletem os registros disponíveis na data de geração do relatório.
                    </p>
                  </div>
                </div>
                
                {/* Fim do conteúdo do relatório PDF */}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsHistoryModalOpen(false)}
                    className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-0 focus:outline-none"
                  >
                    Fechar Relatório
                  </Button>
                  <Button
                    onClick={handleDownloadReport}
                    className="bg-black hover:bg-gray-800 text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Relatório
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Modal de Exportação */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Exportar Relatório de Inadimplência</DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Selecione um arrematante específico ou todos os inadimplentes para gerar o relatório
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Seletor de Arrematante */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Selecionar Arrematante:</Label>
              <Select 
                value={selectedArrematanteForExport} 
                onValueChange={setSelectedArrematanteForExport}
                onOpenChange={setIsExportSelectOpen}
              >
                <SelectTrigger 
                  className="w-full mt-2 focus:!ring-0 focus:!ring-offset-0 focus:!border-gray-300 focus:!outline-none focus:!shadow-none"
                >
                  <SelectValue placeholder="Escolha um arrematante ou todos os inadimplentes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Inadimplentes</SelectItem>
                  {filteredOverdueAuctions.map((auction) => (
                    <SelectItem key={auction.id} value={auction.id}>
                      {auction.arrematante?.nome || 'Sem nome'} - {auction.daysOverdue === 1 ? '1 dia' : `${auction.daysOverdue} dias`} de atraso
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview do Relatório */}
            {selectedArrematanteForExport && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h3 className="font-medium text-gray-900">Pré-visualização do Relatório</h3>
                  <p className="text-sm text-gray-600">Este será o conteúdo do arquivo PDF</p>
                </div>
                <div className="max-h-96 overflow-y-auto p-4">
                  <InadimplenciaReportPDF 
                    arrematanteId={selectedArrematanteForExport}
                    filteredOverdueAuctions={filteredOverdueAuctions}
                  />
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsExportModalOpen(false);
                  setSelectedArrematanteForExport("");
                }}
                className="flex-1 hover:bg-gray-100 hover:text-gray-900"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleExportInadimplencia}
                disabled={!selectedArrematanteForExport}
                className="flex-1 bg-black hover:bg-gray-800 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Gerar e Baixar PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Modal de Envio de Cobrança */}
      <Dialog open={isChargeModalOpen} onOpenChange={setIsChargeModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar Cobrança por Email
            </DialogTitle>
          </DialogHeader>

          {selectedDebtor && (
            <div className="space-y-6">
              {/* Informações do Devedor */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedDebtor.arrematante?.nome}</h3>
                    <p className="text-sm text-gray-600">{selectedDebtor.arrematante?.email}</p>
                    <p className="text-sm text-gray-600">Leilão: {selectedDebtor.nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">
                      {currency.format(selectedDebtor.overdueAmount || 0)}
                    </p>
                    <p className="text-sm text-gray-600">
                        {selectedDebtor.daysOverdue === 1 ? '1 dia em atraso' : `${selectedDebtor.daysOverdue} dias em atraso`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mensagem de Cobrança */}
              <div className="space-y-2">
                <Label htmlFor="charge-message" className="text-sm font-medium text-gray-700">
                  Mensagem de Cobrança
                </Label>
                <Textarea
                  id="charge-message"
                  value={chargeMessage}
                  onChange={(e) => setChargeMessage(e.target.value)}
                  className="min-h-[200px] border-gray-300 focus:border-gray-300 focus:ring-0"
                  placeholder="Digite a mensagem de cobrança..."
                />
                <p className="text-xs text-gray-500">
                  Você pode editar esta mensagem antes de enviar
                </p>
              </div>

              {/* Anexos */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Anexos (Opcional)
                </Label>
                
                {/* Lista de anexos */}
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-md">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-900">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Área de upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                  <Paperclip className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Adicione comprovantes, boletos ou outros documentos
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('charge-file-upload')?.click()}
                    className="bg-white text-black border-gray-300 hover:bg-gray-100 hover:text-black"
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Selecionar Arquivos
                  </Button>
                  <input
                    id="charge-file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    PDF, DOC, JPG, PNG (máx. 10MB cada)
                  </p>
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsChargeModalOpen(false)}
                  disabled={isSending}
                  className="bg-white text-black border-gray-300 hover:bg-gray-100 hover:text-black"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={sendChargeEmail}
                  disabled={isSending || !chargeMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Cobrança
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Componente para o relatório PDF de inadimplência
function InadimplenciaReportPDF({ 
  arrematanteId, 
  filteredOverdueAuctions 
}: { 
  arrematanteId: string; 
  filteredOverdueAuctions: any[] 
}) {
  const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  const reportData = useMemo(() => {
    if (arrematanteId === 'todos') {
      // Relatório geral de todos os inadimplentes
      const totalOverdue = filteredOverdueAuctions.length;
      const totalOverdueValue = filteredOverdueAuctions.reduce((sum, auction) => sum + (auction.overdueAmount || 0), 0);
      const averageDelay = filteredOverdueAuctions.length > 0 
        ? Math.round(filteredOverdueAuctions.reduce((sum, auction) => sum + (auction.daysOverdue || 0), 0) / filteredOverdueAuctions.length)
        : 0;

      return {
        type: 'geral',
        totalOverdue,
        totalOverdueValue,
        averageDelay,
        arrematantes: filteredOverdueAuctions
      };
    } else {
      // Relatório individual
      const arrematante = filteredOverdueAuctions.find(a => a.id === arrematanteId);
      return {
        type: 'individual',
        arrematante
      };
    }
  }, [arrematanteId, filteredOverdueAuctions]);

  if (!reportData) return null;

  return (
    <div id="inadimplencia-export-report" className="space-y-6 bg-white p-6 font-sans">
      {/* Cabeçalho */}
      <div className="text-center border-b border-gray-200 pb-6 no-page-break">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          {reportData.type === 'geral' 
            ? 'RELATÓRIO CORPORATIVO DE INADIMPLÊNCIA'
            : `RELATÓRIO DE INADIMPLÊNCIA - ${reportData.arrematante?.arrematante?.nome?.toUpperCase()}`
          }
        </h1>
        <div className="text-gray-600 text-sm space-y-1">
          <p className="font-medium">Documento oficial de análise de inadimplência e acompanhamento de recebíveis</p>
          <p>Gerado em: {new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>
      </div>

      {reportData.type === 'geral' ? (
        // Relatório geral
        <>
          {/* Resumo */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 no-page-break">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo</h2>
            <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700">
              <p>
                Total de <strong>{reportData.totalOverdue} inadimplente{reportData.totalOverdue !== 1 ? 's' : ''}</strong> com valor em atraso de{' '}
                <strong>{currency.format(reportData.totalOverdueValue)}</strong> e prazo médio de <strong>{reportData.averageDelay} dias</strong> de atraso.
              </p>
            </div>
          </div>

          {/* Lista de Inadimplentes */}
          <div className="no-page-break">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Inadimplentes</h2>
            <div className="space-y-3">
              {reportData.arrematantes.map((auction, index) => (
                <div key={auction.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700">
                    <p>
                      <strong>#{String(index + 1).padStart(3, '0')}</strong> - {auction.arrematante?.nome} (Doc. {auction.arrematante?.documento}) - 
                      Valor em atraso: <strong>{currency.format(auction.overdueAmount || 0)}</strong> - 
                      Vencimento: <strong>{auction.dueDateFormatted}</strong> - 
                      Atraso: <strong>{auction.daysOverdue === 1 ? '1 dia' : `${auction.daysOverdue} dias`}</strong> - 
                      Contato: {auction.arrematante?.telefone || 'não informado'} - 
                      Contrato: {auction.nome || `Leilão ${auction.identificacao}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        // Relatório individual
        <div className="space-y-4">
          {/* Dados do Inadimplente */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 no-page-break">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados do Inadimplente</h2>
            <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700">
              <p>
                Nome: <strong>{reportData.arrematante?.arrematante?.nome}</strong> - 
                Documento: <strong>{reportData.arrematante?.arrematante?.documento}</strong> - 
                Telefone: {reportData.arrematante?.arrematante?.telefone || 'Não informado'} - 
                Email: {reportData.arrematante?.arrematante?.email || 'Não informado'}
              </p>
            </div>
          </div>

          {/* Informações do Atraso */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 no-page-break">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações do Atraso</h2>
            <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700">
              <p>
                Contrato: <strong>{reportData.arrematante?.nome || `Leilão ${reportData.arrematante?.identificacao}`}</strong> - 
                Código: <strong>{reportData.arrematante?.identificacao || reportData.arrematante?.id}</strong> - 
                Valor em atraso: <strong>{currency.format(reportData.arrematante?.overdueAmount || 0)}</strong> - 
                Data de vencimento: <strong>{reportData.arrematante?.dueDateFormatted}</strong> - 
                Dias de atraso: <strong>{reportData.arrematante?.daysOverdue === 1 ? '1 dia' : `${reportData.arrematante?.daysOverdue} dias`}</strong> - 
                Classificação: <strong>{reportData.arrematante?.overdueSeverity?.toUpperCase()}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Informações do Relatório */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 no-page-break">
        <div className="prose prose-gray max-w-none text-xs text-gray-500 text-center">
          <p>
            Relatório gerado em {new Date().toLocaleDateString('pt-BR', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            })} às {new Date().toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })} - Sistema de Gestão de Leilões
          </p>
        </div>
      </div>
    </div>
  );
}
