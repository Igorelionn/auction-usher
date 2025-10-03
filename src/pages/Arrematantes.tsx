import { useState, useEffect, useRef, useCallback } from "react";
import { useSupabaseAuctions } from "@/hooks/use-supabase-auctions";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogger } from "@/hooks/use-activity-logger";
import { parseCurrencyToNumber } from "@/lib/utils";
import { ArrematanteInfo, DocumentoInfo } from "@/lib/types";
import html2pdf from 'html2pdf.js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { StringDatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  Users, 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  XCircle,
  FileText,
  Paperclip,
  Upload,
  File,
  Image,
  FileSpreadsheet,
  RefreshCw,
  Check,
  Archive,
  ArrowLeft,
  MoreVertical,
  CreditCard,
  X,
  CircleX
} from "lucide-react";

interface ArrematanteExtendido extends ArrematanteInfo {
  id: string;
  leilaoNome: string;
  leilaoId: string;
  dataLeilao: string;
  statusPagamento: 'pago' | 'pendente' | 'atrasado';
  email?: string;
}

function Arrematantes() {
  const { auctions, updateAuction, deleteAuction, archiveAuction, unarchiveAuction } = useSupabaseAuctions();
  const { toast } = useToast();
  const { logBidderAction, logPaymentAction, logDocumentAction, logReportAction } = useActivityLogger();

  // Função para calcular a próxima data de pagamento não paga
  const calculateNextPaymentDate = (arrematante: ArrematanteInfo) => {
    // Validar campos obrigatórios
    if (!arrematante.mesInicioPagamento || !arrematante.diaVencimentoMensal) {
      return null;
    }
    
    const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
    const parcelasPagas = arrematante.parcelasPagas || 0;
    
    // Se já quitou tudo, retorna null
    if (parcelasPagas >= arrematante.quantidadeParcelas || arrematante.pago) {
      return null;
    }
    
    // Calcula a data da próxima parcela não paga (parcelasPagas é o índice da próxima parcela)
    const nextPaymentDate = new Date(startYear, startMonth - 1 + parcelasPagas, arrematante.diaVencimentoMensal);
    return nextPaymentDate;
  };

  // Função específica para calcular próxima data em entrada_parcelamento
  const calculateNextPaymentDateEntradaParcelamento = (arrematante: ArrematanteInfo, auction: any) => {
    const parcelasPagas = arrematante.parcelasPagas || 0;
    const loteArrematado = auction?.lotes?.find((lote: any) => lote.id === arrematante.loteId);
    
    // Se já quitou tudo, retorna null
    if (arrematante.pago) {
      return null;
    }
    
    if (parcelasPagas === 0) {
      // Entrada pendente - mostrar data da entrada
      const dataEntrada = loteArrematado?.dataEntrada || auction?.dataEntrada;
      return dataEntrada ? new Date(dataEntrada + 'T00:00:00') : null;
    } else {
      // Entrada paga, calcular próxima parcela
      const quantidadeParcelas = arrematante.quantidadeParcelas || 12;
      if (parcelasPagas > quantidadeParcelas) {
        return null; // Todas as parcelas pagas
      }
      
      // Validar campos obrigatórios para parcelas
      if (!arrematante.mesInicioPagamento || !arrematante.diaVencimentoMensal) {
        return null;
      }
      
      const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
      const proximaParcela = parcelasPagas - 1; // Descontar a entrada
      const nextPaymentDate = new Date(startYear, startMonth - 1 + proximaParcela, arrematante.diaVencimentoMensal);
      return nextPaymentDate;
    }
  };

  // Função para formatar telefone automaticamente no formato brasileiro +55 (11) 99999-9999
  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não é dígito
    const numbersOnly = value.replace(/[^\d]/g, '');
    
    // Remove o código do país se começar com 55
    let brazilianNumber = numbersOnly;
    if (brazilianNumber.startsWith('55') && brazilianNumber.length > 2) {
      brazilianNumber = brazilianNumber.substring(2);
    }
    
    // Limitar a 11 dígitos (DDD + 9 dígitos)
    brazilianNumber = brazilianNumber.substring(0, 11);
    
    if (brazilianNumber.length === 0) {
      return '+55';
    } else if (brazilianNumber.length <= 2) {
      return `+55 (${brazilianNumber}`;
    } else if (brazilianNumber.length <= 7) {
      return `+55 (${brazilianNumber.substring(0, 2)}) ${brazilianNumber.substring(2)}`;
    } else if (brazilianNumber.length <= 11) {
      const ddd = brazilianNumber.substring(0, 2);
      const firstPart = brazilianNumber.substring(2, brazilianNumber.length - 4);
      const lastPart = brazilianNumber.substring(brazilianNumber.length - 4);
      return `+55 (${ddd}) ${firstPart}-${lastPart}`;
    }
    
    return `+55 (${brazilianNumber.substring(0, 2)}) ${brazilianNumber.substring(2, 7)}-${brazilianNumber.substring(7, 11)}`;
  };

  // Função para lidar com mudanças no formulário de edição completa
  const handleFullEditFormChange = (field: string, value: any) => {
    const newForm = {
      ...fullEditForm,
      [field]: value
    };
    
    setFullEditForm(newForm);

    // 🔄 SINCRONIZAÇÃO EM TEMPO REAL: Disparar evento quando campos relevantes mudarem
    const relevantFields = ['diaVencimentoMensal', 'quantidadeParcelas', 'mesInicioPagamento'];
    
    if (relevantFields.includes(field) && selectedArrematanteForFullEdit) {
      const auction = auctions.find(a => a.id === selectedArrematanteForFullEdit.leilaoId);
      if (auction) {
        console.log(`🔄 Campo ${field} alterado em tempo real: ${fullEditForm[field]} → ${value}`);
        
        // Disparar evento para notificar formulário do leilão sobre mudanças em tempo real
        window.dispatchEvent(new CustomEvent('arrematanteFormChanged', {
          detail: {
            auctionId: auction.id,
            changes: {
              [field === 'diaVencimentoMensal' ? 'diaVencimentoPadrao' : 
               field === 'quantidadeParcelas' ? 'parcelasPadrao' : 
               field]: value
            }
          }
        }));

      }
    }
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInputValue, setSearchInputValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSavingFullEdit, setIsSavingFullEdit] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isStatusSelectOpen, setIsStatusSelectOpen] = useState(false);
  
  // Estados para o modal de exportação
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedArrematanteForExport, setSelectedArrematanteForExport] = useState<string>("");
  const [isExportSelectOpen, setIsExportSelectOpen] = useState(false);
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Set para rastrear URLs blob temporárias que precisam ser limpas
  const tempBlobUrlsRef = useRef(new Set<string>());
  // Refs para controle de sincronização robusta entre modais
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);


  // Função para gerar PDF do arrematante
  const generateArrematantePDF = async (arrematanteId: string) => {
    const arrematante = filteredArrematantes.find(a => a.id === arrematanteId);
    if (!arrematante) {
      toast({
        title: "Erro",
        description: "Arrematante não encontrado.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Aguardar o componente renderizar
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const element = document.getElementById('arrematante-pdf-content');
      if (!element) {
        throw new Error('Elemento PDF não encontrado');
      }

      // Usar html2pdf importado estaticamente

      const opt = {
        margin: 1,
        filename: `relatorio_arrematante_${arrematante.nome.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();
      
      // Log da geração do relatório
      await logReportAction('generate', 'arrematante', `Relatório do arrematante ${arrematante.nome}`, {
        metadata: {
          arrematante_id: arrematante.id,
          arrematante_name: arrematante.nome,
          auction_id: arrematante.leilaoId,
          report_format: 'pdf',
          generation_date: new Date().toISOString()
        }
      });
      
      toast({
        title: "PDF Gerado com Sucesso!",
        description: `Relatório do arrematante ${arrematante.nome} foi baixado.`,
        duration: 4000,
      });
      
      setIsExportModalOpen(false);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao Gerar PDF",
        description: "Ocorreu um erro ao gerar o relatório. Tente novamente.",
        variant: "destructive",
      });
    }
  };
  
  // Estados do modal
  const [selectedArrematante, setSelectedArrematante] = useState<ArrematanteExtendido | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedArrematanteForPayment, setSelectedArrematanteForPayment] = useState<ArrematanteExtendido | null>(null);
  const [paymentMonths, setPaymentMonths] = useState<{month: string, paid: boolean, dueDate: string, monthName: string, isEntrada?: boolean}[]>([]);
  const [isFullEditModalOpen, setIsFullEditModalOpen] = useState(false);
  const [selectedArrematanteForFullEdit, setSelectedArrematanteForFullEdit] = useState<ArrematanteExtendido | null>(null);
  const [fullEditForm, setFullEditForm] = useState({
    nome: "",
    documento: "",
    endereco: "",
    email: "",
    telefone: "",
    loteId: "",
    valorPagar: "",
    valorEntrada: "",
    diaVencimentoMensal: 15,
    quantidadeParcelas: 12,
    parcelasPagas: 0,
    mesInicioPagamento: new Date().toISOString().slice(0, 7),
    pago: false,
    documentos: [] as DocumentoInfo[]
  });

  // 🔄 FUNÇÃO DE SINCRONIZAÇÃO ROBUSTA COM DEBOUNCE
  const syncDocumentsToDetails = useCallback((documentos: DocumentoInfo[], operation: 'add' | 'remove', docId?: string) => {
    // Cancelar sincronização anterior se ainda pendente
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Prevenir múltiplas atualizações simultâneas
    if (isUpdatingRef.current) {
      console.log('🔄 Sincronização já em andamento, reagendando...');
    }

    console.log(`🔄 Agendando sincronização (${operation}) em 10ms...`, {
      documentCount: documentos.length,
      operation,
      docId: docId || 'N/A'
    });

    // Agendar sincronização com pequeno debounce
    syncTimeoutRef.current = setTimeout(() => {
      isUpdatingRef.current = true;
      
      try {
        // Sincronização para o selectedArrematante (modal de detalhes)
        if (selectedArrematante) {
          setSelectedArrematante(prev => {
            if (!prev) return prev;
            
            const newDocs = operation === 'add' 
              ? [...(prev.documentos || []), ...documentos.filter(doc => 
                  !(prev.documentos || []).some(existing => existing.id === doc.id)
                )]
              : (prev.documentos || []).filter(doc => doc.id !== docId);
                
            console.log(`✨ Sincronização aplicada ao selectedArrematante (${operation}):`, {
              antes: (prev.documentos || []).length,
              depois: newDocs.length,
              novosDocumentos: operation === 'add' ? documentos.map(d => d.nome) : [],
              removidoId: operation === 'remove' ? docId : null
            });
            
            return { ...prev, documentos: newDocs };
          });
        }

        // Sincronização para o selectedArrematanteForFullEdit (modal de edição completa)
        if (selectedArrematanteForFullEdit && selectedArrematante?.nome === selectedArrematanteForFullEdit.nome) {
          setSelectedArrematanteForFullEdit(prev => {
            if (!prev) return prev;
            
            const newDocs = operation === 'add' 
              ? [...(prev.documentos || []), ...documentos.filter(doc => 
                  !(prev.documentos || []).some(existing => existing.id === doc.id)
                )]
              : (prev.documentos || []).filter(doc => doc.id !== docId);
                
            console.log(`✨ Sincronização aplicada ao selectedArrematanteForFullEdit (${operation}):`, {
              antes: (prev.documentos || []).length,
              depois: newDocs.length
            });
            
            return { ...prev, documentos: newDocs };
          });
        }
        
      } catch (error) {
        console.error('❌ Erro durante sincronização:', error);
      } finally {
        isUpdatingRef.current = false;
        syncTimeoutRef.current = null;
      }
    }, 10); // Debounce muito pequeno, apenas para evitar conflitos

  }, [selectedArrematante, selectedArrematanteForFullEdit]);
  
  // Estados do formulário
  const [editForm, setEditForm] = useState({
    nome: "",
    email: "",
    valorPagar: "",
    documentos: [] as DocumentoInfo[]
  });

  // Limpar blob URLs quando componente desmontar
  useEffect(() => {
    return () => {
      console.log('🧹 Componente desmontando, limpando recursos...');
      
      // Limpar timeouts pendentes
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      
      // Limpar todas as URLs blob temporárias
      tempBlobUrlsRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.warn('⚠️ Erro ao revogar URL blob durante cleanup:', error);
        }
      });
      tempBlobUrlsRef.current.clear();
      
      // Resetar flags de controle
      isUpdatingRef.current = false;
      
      console.log('🧹 Cleanup completo concluído no desmonte');
    };
  }, []); // Array vazio = executa apenas no desmonte do componente

  // Debounce para busca automática
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setSearchTerm(searchInputValue);
    }, 800);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchInputValue]);

  // useEffect para carregar dados do arrematante no modal de edição completa
  useEffect(() => {
    if (selectedArrematanteForFullEdit) {
      const auction = auctions.find(a => a.id === selectedArrematanteForFullEdit.leilaoId);
      if (auction && auction.arrematante) {
        console.log('🔍 Carregando dados do arrematante no modal:', {
          documento: auction.arrematante.documento,
          endereco: auction.arrematante.endereco,
          nome: auction.arrematante.nome,
          email: auction.arrematante.email
        });
        
        setFullEditForm({
          nome: auction.arrematante.nome || "",
          documento: auction.arrematante.documento || "",
          endereco: auction.arrematante.endereco || "",
          email: auction.arrematante.email || "",
          telefone: auction.arrematante.telefone || "",
          loteId: auction.arrematante.loteId || "",
          valorPagar: auction.arrematante.valorPagar || "",
          valorEntrada: auction.arrematante.valorEntrada || "",
          diaVencimentoMensal: auction.arrematante.diaVencimentoMensal || 15,
          quantidadeParcelas: auction.arrematante.quantidadeParcelas || 12,
          parcelasPagas: auction.arrematante.parcelasPagas || 0,
          mesInicioPagamento: auction.arrematante.mesInicioPagamento || new Date().toISOString().slice(0, 7),
          pago: auction.arrematante.pago || false,
          documentos: auction.arrematante.documentos || []
        });
        
        console.log('🔄 FullEditForm preenchido com documentos:', {
          documentos: auction.arrematante.documentos?.length || 0,
          documentosList: auction.arrematante.documentos?.map(d => ({nome: d.nome, hasUrl: !!d.url})) || []
        });
      }
    }
  }, [selectedArrematanteForFullEdit, auctions]);

  // 🔧 SINCRONIZAÇÃO FORÇADA: Re-carregar dados quando arrematante é atualizado por outros formulários
  useEffect(() => {
    if (selectedArrematanteForFullEdit && isFullEditModalOpen) {
      const auction = auctions.find(a => a.id === selectedArrematanteForFullEdit.leilaoId);
      if (auction && auction.arrematante) {
        // Forçar atualização dos campos críticos que podem ter sido alterados
        setFullEditForm(prevForm => ({
          ...prevForm,
          documento: auction.arrematante.documento || prevForm.documento || "",
          endereco: auction.arrematante.endereco || prevForm.endereco || "",
          nome: auction.arrematante.nome || prevForm.nome || "",
          email: auction.arrematante.email || prevForm.email || "",
          telefone: auction.arrematante.telefone || prevForm.telefone || "",
          documentos: auction.arrematante.documentos || prevForm.documentos || []
        }));
        
        console.log('🔧 SINCRONIZAÇÃO FORÇADA - Documentos atualizados:', {
          documentos: auction.arrematante.documentos?.length || 0,
          documentosList: auction.arrematante.documentos?.map(d => ({nome: d.nome, hasUrl: !!d.url})) || []
        });
        
        console.log('🔧 SINCRONIZAÇÃO FORÇADA - Dados atualizados:', {
          documento: auction.arrematante.documento,
          endereco: auction.arrematante.endereco
        });
      }
    }
  }, [auctions, selectedArrematanteForFullEdit?.leilaoId, isFullEditModalOpen]);

  // 🔄 SINCRONIZAÇÃO BIDIRECIONAL: Escutar mudanças do formulário do leilão
  useEffect(() => {
    const handleAuctionFormChanged = (event: CustomEvent) => {
      const { auctionId, changedField, newValue } = event.detail;
      
      console.log(`🔍 DEBUG - Evento auctionFormChanged recebido:`, {
        auctionId,
        changedField,
        newValue,
        selectedArrematanteId: selectedArrematanteForFullEdit?.leilaoId,
        modalAberto: isFullEditModalOpen,
        shouldSync: selectedArrematanteForFullEdit && selectedArrematanteForFullEdit.leilaoId === auctionId
      });
      
      // 🔄 SINCRONIZAÇÃO GLOBAL: Atualizar dados do leilão nos auctions (sempre)
      const fieldMapping = {
        diaVencimentoPadrao: 'diaVencimentoPadrao',
        parcelasPadrao: 'parcelasPadrao', 
        mesInicioPagamento: 'mesInicioPagamento',
      } as const;
      
      // Atualizar o leilão nos dados globais (isso será refletido quando o modal for aberto)
      if (fieldMapping[changedField as keyof typeof fieldMapping]) {
        console.log(`🌐 Atualizando dados globais do leilão ${auctionId}: ${changedField} = `, newValue);
        
        // Encontrar e atualizar o leilão nos dados globais
        const updatedAuctions = auctions.map(auction => {
          if (auction.id === auctionId && auction.arrematante) {
            const arrematanteFieldMap = {
              diaVencimentoPadrao: 'diaVencimentoMensal',
              parcelasPadrao: 'quantidadeParcelas',
              mesInicioPagamento: 'mesInicioPagamento',
            } as const;
            
            const arrematanteField = arrematanteFieldMap[changedField as keyof typeof arrematanteFieldMap];
            if (arrematanteField) {
              return {
                ...auction,
                [changedField]: newValue, // Atualizar campo do leilão
                arrematante: {
                  ...auction.arrematante,
                  [arrematanteField]: newValue // Atualizar campo do arrematante
                }
              };
            }
          }
          return auction;
        });
        
        // Se os dados mudaram, força re-render (mas não dispara useEffect infinito)
        // Isso garantirá que quando o modal abrir, os dados já estarão sincronizados
      }
      
      // 🎯 SINCRONIZAÇÃO DO MODAL ATIVO: Se o modal estiver aberto, atualizar formulário
      if (selectedArrematanteForFullEdit && selectedArrematanteForFullEdit.leilaoId === auctionId && isFullEditModalOpen) {
        console.log(`🔄 Sincronizando formulário ativo do arrematante: ${changedField} = `, newValue);
        
        // Mapear campos do leilão para campos do arrematante
        const arrematanteFieldMapping = {
          diaVencimentoPadrao: 'diaVencimentoMensal',
          parcelasPadrao: 'quantidadeParcelas',
          mesInicioPagamento: 'mesInicioPagamento',
        } as const;
        
        // Atualizar o formulário se o campo é relevante
        const arrematanteField = arrematanteFieldMapping[changedField as keyof typeof arrematanteFieldMapping];
        if (arrematanteField) {
          console.log(`📝 Atualizando campo ${arrematanteField} de`, fullEditForm[arrematanteField], `para`, newValue);
          
          setFullEditForm(prev => ({
            ...prev,
            [arrematanteField]: newValue
          }));
          
        }
      } else {
        console.log(`ℹ️ Modal não está ativo ou não corresponde ao arrematante atual`);
      }
    };

    // Adicionar listener para o evento customizado (sempre ativo)
    window.addEventListener('auctionFormChanged', handleAuctionFormChanged as EventListener);
    
    // Limpar listener quando componente desmontar
    return () => {
      window.removeEventListener('auctionFormChanged', handleAuctionFormChanged as EventListener);
    };
  }, [selectedArrematanteForFullEdit, isFullEditModalOpen, auctions, toast]);

  // 🔄 SINCRONIZAÇÃO INICIAL: Quando um arrematante é selecionado, sincronizar com valores atuais do leilão
  useEffect(() => {
    if (selectedArrematanteForFullEdit && auctions.length > 0 && isFullEditModalOpen) {
      const auction = auctions.find(a => a.id === selectedArrematanteForFullEdit.leilaoId);
      
      if (auction) {
        console.log(`🔄 SINCRONIZAÇÃO INICIAL - Dados do leilão:`, {
          auctionId: auction.id,
          diaVencimentoPadrao: auction.diaVencimentoPadrao,
          parcelasPadrao: auction.parcelasPadrao,
          mesInicioPagamento: auction.mesInicioPagamento
        });

        // Usar setTimeout para garantir que o formulário foi inicializado
        setTimeout(() => {
          setFullEditForm(prev => {
            const shouldUpdateDia = auction.diaVencimentoPadrao && prev.diaVencimentoMensal !== auction.diaVencimentoPadrao;
            const shouldUpdateParcelas = auction.parcelasPadrao && prev.quantidadeParcelas !== auction.parcelasPadrao;
            const shouldUpdateMes = auction.mesInicioPagamento && prev.mesInicioPagamento !== auction.mesInicioPagamento;

            if (shouldUpdateDia || shouldUpdateParcelas || shouldUpdateMes) {
              console.log(`⚡ Sincronização inicial aplicada:`, {
                diaVencimentoMensal: shouldUpdateDia ? `${prev.diaVencimentoMensal} → ${auction.diaVencimentoPadrao}` : 'não alterado',
                quantidadeParcelas: shouldUpdateParcelas ? `${prev.quantidadeParcelas} → ${auction.parcelasPadrao}` : 'não alterado',
                mesInicioPagamento: shouldUpdateMes ? `${prev.mesInicioPagamento} → ${auction.mesInicioPagamento}` : 'não alterado'
              });

              return {
                ...prev,
                diaVencimentoMensal: auction.diaVencimentoPadrao || prev.diaVencimentoMensal,
                quantidadeParcelas: auction.parcelasPadrao || prev.quantidadeParcelas,
                mesInicioPagamento: auction.mesInicioPagamento || prev.mesInicioPagamento
              };
            } else {
              console.log(`✅ Arrematante já está sincronizado com o leilão`);
              return prev;
            }
          });
        }, 100); // Pequeno delay para garantir inicialização
      }
    }
  }, [selectedArrematanteForFullEdit?.leilaoId, auctions.length, isFullEditModalOpen]);

  // Animação de loading
  useEffect(() => {
    if (searchTerm !== searchInputValue || statusFilter) {
      setIsLoading(true);
      setIsTransitioning(true);
      
      const timer = setTimeout(() => {
        setIsLoading(false);
        setTimeout(() => setIsTransitioning(false), 150);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [searchTerm, statusFilter, showArchived]);

  // Processar arrematantes de todos os leilões
  const processedArrematantes = (): ArrematanteExtendido[] => {
    const now = new Date();

    return auctions
      .filter(auction => auction.arrematante && (showArchived ? auction.arquivado : !auction.arquivado))
      .map(auction => {
        const arrematante = auction.arrematante!;
        
        // Verificar tipo de pagamento
        const loteArrematado = auction?.lotes?.find(lote => lote.id === arrematante.loteId);
        const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento || "parcelamento";
        
        let statusPagamento: 'pago' | 'pendente' | 'atrasado';
        
        if (arrematante.pago) {
          statusPagamento = 'pago';
        } else if (tipoPagamento === "a_vista") {
          // Lógica para pagamento à vista
          const dataVencimento = loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista;
          if (dataVencimento) {
            const vencimento = new Date(dataVencimento + 'T23:59:59');
            statusPagamento = now > vencimento ? 'atrasado' : 'pendente';
          } else {
            statusPagamento = 'pendente';
          }
        } else {
          // Lógica para parcelamento
          let proximoPagamento;
          
          if (tipoPagamento === "entrada_parcelamento") {
            proximoPagamento = calculateNextPaymentDateEntradaParcelamento(arrematante, auction);
          } else {
            proximoPagamento = calculateNextPaymentDate(arrematante);
          }
          
          if (!proximoPagamento) {
            statusPagamento = 'pago';
          } else {
            const endOfDueDate = new Date(proximoPagamento);
            endOfDueDate.setHours(23, 59, 59, 999);
            statusPagamento = now > endOfDueDate ? 'atrasado' : 'pendente';
          }
        }

        return {
          ...arrematante,
          id: `${auction.id}-arrematante`,
          leilaoNome: auction.nome,
          leilaoId: auction.id,
          dataLeilao: auction.dataInicio,
          statusPagamento
        };
      })
      .sort((a, b) => {
        const today = new Date();
        
        // Calcular próximas datas de pagamento para comparação
        const aDate = calculateNextPaymentDate(a);
        const bDate = calculateNextPaymentDate(b);
        
        // Se ambos são atrasados, ordenar pelos mais atrasados primeiro (data mais antiga)
        if (a.statusPagamento === 'atrasado' && b.statusPagamento === 'atrasado') {
          if (!aDate || !bDate) return 0;
          return aDate.getTime() - bDate.getTime();
        }
        
        // Se ambos são pendentes, ordenar pela data mais próxima primeiro
        if (a.statusPagamento === 'pendente' && b.statusPagamento === 'pendente') {
          if (!aDate || !bDate) return 0;
          return aDate.getTime() - bDate.getTime();
        }
        
        // Ordem geral: atrasados primeiro, depois pendentes, depois pagos
        const statusOrder = { atrasado: 0, pendente: 1, pago: 2 };
        if (statusOrder[a.statusPagamento] !== statusOrder[b.statusPagamento]) {
          return statusOrder[a.statusPagamento] - statusOrder[b.statusPagamento];
        }
        
        return aDate.getTime() - bDate.getTime();
      });
  };

  // Filtrar arrematantes
  const filteredArrematantes = processedArrematantes().filter(arrematante => {
    const matchesSearch = !searchTerm || 
      arrematante.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arrematante.leilaoNome.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "todos" || arrematante.statusPagamento === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Contar por status
  const getStatusCount = (status: string) => {
    if (status === "todos") return processedArrematantes().length;
    return processedArrematantes().filter(a => a.statusPagamento === status).length;
  };

  // Função para obter ícone de status
  const getStatusIcon = (status: 'pago' | 'pendente' | 'atrasado') => {
    switch (status) {
      case 'pago':
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
      case 'pendente':
        return <Clock className="h-4 w-4 text-gray-600" />;
      case 'atrasado':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  // Função para obter badge de status
  const getStatusBadge = (status: 'pago' | 'pendente' | 'atrasado') => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 hover:text-green-800 hover:border-green-200 border font-medium">Pago</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100 hover:text-yellow-800 hover:border-yellow-200 border font-medium">Pendente</Badge>;
      case 'atrasado':
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100 hover:text-red-800 hover:border-red-200 border font-medium">Atrasado</Badge>;
    }
  };

  // Funções para ícones de arquivo
  const getFileIcon = (tipo: string) => {
    if (tipo.startsWith('image/')) return <Image className="h-4 w-4 text-blue-600" />;
    if (tipo.includes('spreadsheet') || tipo.includes('excel')) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    if (tipo.includes('pdf')) return <FileText className="h-4 w-4 text-red-600" />;
    return <File className="h-4 w-4 text-gray-600" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Funções do modal
  const handleViewArrematante = (arrematante: ArrematanteExtendido) => {
    console.log('👁️ Abrindo detalhes do arrematante, buscando dados mais recentes...');
    
    // Buscar dados atualizados do arrematante no leilão
    const auction = auctions.find(a => a.id === arrematante.leilaoId);
    if (auction && auction.arrematante) {
      // Criar arrematante atualizado com dados mais recentes
      const arrematanteAtualizado = {
        ...arrematante,
        ...auction.arrematante,
        documentos: auction.arrematante.documentos || []
      };
      
      console.log('🔄 Dados sincronizados encontrados:', {
        arrematanteId: arrematante.id,
        leilaoId: arrematante.leilaoId,
        documentosOriginais: arrematante.documentos?.length || 0,
        documentosAtualizados: arrematanteAtualizado.documentos?.length || 0,
        documentosList: arrematanteAtualizado.documentos?.map(d => ({
          nome: d.nome, 
          hasUrl: !!d.url, 
          isBase64: d.url?.startsWith('data:')
        })) || [],
        hasAuctionData: !!auction.arrematante
      });
      
      setSelectedArrematante(arrematanteAtualizado);
    } else {
      console.warn('⚠️ Dados do leilão não encontrados:', {
        hasAuction: !!auction,
        hasArrematante: !!(auction && auction.arrematante),
        leilaoId: arrematante.leilaoId,
        totalAuctions: auctions.length
      });
      setSelectedArrematante(arrematante);
    }
    setIsViewModalOpen(true);
  };

  const handleEditArrematante = (arrematante: ArrematanteExtendido) => {
    // Buscar dados atualizados do arrematante no leilão (igual a handleViewArrematante)
    const auction = auctions.find(a => a.id === arrematante.leilaoId);
    let arrematanteAtualizado = arrematante;
    
    if (auction && auction.arrematante) {
      // Criar arrematante atualizado com dados mais recentes
      arrematanteAtualizado = {
        ...arrematante,
        ...auction.arrematante,
        documentos: auction.arrematante.documentos || []
      };
      console.log('🔄 Abrindo edição com dados atualizados:', {
        documentos: arrematanteAtualizado.documentos?.length || 0,
        arrematanteOriginal: arrematante.documentos?.length || 0,
        auctionDocumentos: auction.arrematante.documentos?.length || 0
      });
    } else {
      console.warn('⚠️ Leilão ou arrematante não encontrado para atualização:', {
        leilaoId: arrematante.leilaoId,
        hasAuction: !!auction,
        hasArrematante: !!(auction && auction.arrematante)
      });
    }
    
    setSelectedArrematante(arrematanteAtualizado);
    setEditForm({
      nome: arrematanteAtualizado.nome,
      email: arrematanteAtualizado.email || "",
      valorPagar: arrematanteAtualizado.valorPagar,
      documentos: arrematanteAtualizado.documentos || []
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedArrematante) return;

    const auction = auctions.find(a => a.id === selectedArrematante.leilaoId);
    if (!auction) return;

    setIsSavingEdit(true);

    try {
      // 🔄 Converter documentos blob para base64 se necessário
      console.log('🔄 Processando documentos antes do salvamento:', editForm.documentos.map(d => ({nome: d.nome, hasUrl: !!d.url, urlType: d.url?.substring(0, 10)})));
      
      const documentosProcessados = await Promise.all(
        editForm.documentos.map(async (doc, index) => {
          if (doc.url && doc.url.startsWith('blob:')) {
            console.log(`🔄 Convertendo documento ${doc.nome} para base64 (${index + 1}/${editForm.documentos.length})...`);
            
            // Verificar se a URL blob ainda existe no conjunto de URLs gerenciadas
            if (!tempBlobUrlsRef.current.has(doc.url)) {
              console.warn(`⚠️ URL blob para ${doc.nome} não encontrada no conjunto gerenciado.`);
              console.log(`🔄 Adicionando URL ao conjunto para evitar cleanup prematuro...`);
              tempBlobUrlsRef.current.add(doc.url);
            }
            
            try {
              // Tentar fazer fetch da URL blob
              console.log(`📥 Fazendo fetch da URL blob: ${doc.url.substring(0, 50)}...`);
              const response = await fetch(doc.url);
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              
              console.log(`📄 Response OK para ${doc.nome}, convertendo para blob...`);
              const blob = await response.blob();
              
              if (!blob || blob.size === 0) {
                throw new Error('Blob vazio ou inválido');
              }
              
              console.log(`📋 Blob válido para ${doc.nome} (${blob.size} bytes), convertendo para base64...`);
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  if (reader.result && typeof reader.result === 'string') {
                    resolve(reader.result);
                  } else {
                    reject(new Error('FileReader retornou resultado inválido'));
                  }
                };
                reader.onerror = () => reject(new Error('Erro no FileReader'));
                reader.readAsDataURL(blob);
              });
              
              console.log(`✅ Documento ${doc.nome} convertido com sucesso (${base64.length} chars)`);
              
              // Limpar a URL blob após conversão bem-sucedida
              if (tempBlobUrlsRef.current.has(doc.url)) {
                URL.revokeObjectURL(doc.url);
                tempBlobUrlsRef.current.delete(doc.url);
                console.log(`🧹 URL blob para ${doc.nome} limpa após conversão`);
              }
              
              return { ...doc, url: base64 };
            } catch (error) {
              console.error(`❌ Erro ao converter documento ${doc.nome}:`, {
                error: error,
                message: error instanceof Error ? error.message : 'Erro desconhecido',
                docUrl: doc.url.substring(0, 50),
                docSize: doc.tamanho,
                docType: doc.tipo
              });
              
              // Tentar limpar a URL mesmo com erro
              if (tempBlobUrlsRef.current.has(doc.url)) {
                try {
                  URL.revokeObjectURL(doc.url);
                  tempBlobUrlsRef.current.delete(doc.url);
                  console.log(`🧹 URL blob para ${doc.nome} limpa após erro`);
                } catch (cleanupError) {
                  console.warn(`⚠️ Erro ao limpar URL blob para ${doc.nome}:`, cleanupError);
                }
              }
              
              return { ...doc, url: null }; // Definir URL como null se conversão falhou
            }
          } else if (doc.url && doc.url.startsWith('data:')) {
            console.log(`✅ Documento ${doc.nome} já em base64, mantendo...`);
            return doc;
          } else {
            console.log(`⚠️ Documento ${doc.nome} sem URL válida, mantendo como está...`);
            return doc;
          }
        })
      );

      console.log('✅ Documentos processados:', documentosProcessados.map(d => ({nome: d.nome, hasUrl: !!d.url, isBase64: d.url?.startsWith('data:')})));

      const updateData: any = {
        arrematante: {
          nome: editForm.nome,
          email: editForm.email,
          documento: selectedArrematante.documento || "", // 🔧 SINCRONIZAÇÃO: Preservar documento
          endereco: selectedArrematante.endereco || "",   // 🔧 SINCRONIZAÇÃO: Preservar endereço
          telefone: selectedArrematante.telefone,
          loteId: selectedArrematante.loteId,
          valorPagar: editForm.valorPagar,
          valorPagarNumerico: parseFloat(editForm.valorPagar.replace(/[R$\s.]/g, '').replace(',', '.')) || 0,
          diaVencimentoMensal: selectedArrematante.diaVencimentoMensal,
          quantidadeParcelas: selectedArrematante.quantidadeParcelas,
          parcelasPagas: selectedArrematante.parcelasPagas,
          mesInicioPagamento: selectedArrematante.mesInicioPagamento,
          pago: selectedArrematante.pago,
          documentos: documentosProcessados
        }
      };

      // 🔄 SINCRONIZAÇÃO BIDIRECIONAL: Verificar se devemos atualizar os padrões do leilão
      const shouldSyncToAuction = 
        selectedArrematante.diaVencimentoMensal !== auction.diaVencimentoPadrao ||
        selectedArrematante.quantidadeParcelas !== auction.parcelasPadrao ||
        selectedArrematante.mesInicioPagamento !== auction.mesInicioPagamento;

      if (shouldSyncToAuction) {
        console.log('🔄 Sincronizando padrões do leilão com valores do arrematante...');
        
        updateData.diaVencimentoPadrao = selectedArrematante.diaVencimentoMensal;
        updateData.parcelasPadrao = selectedArrematante.quantidadeParcelas;
        updateData.mesInicioPagamento = selectedArrematante.mesInicioPagamento;
        
        // Disparar evento para notificar formulário do leilão sobre mudanças
        window.dispatchEvent(new CustomEvent('arrematanteFormChanged', {
          detail: {
            auctionId: auction.id,
            changes: {
              diaVencimentoPadrao: selectedArrematante.diaVencimentoMensal,
              parcelasPadrao: selectedArrematante.quantidadeParcelas,
              mesInicioPagamento: selectedArrematante.mesInicioPagamento
            }
          }
        }));

      }

      await updateAuction({
        id: auction.id,
        data: updateData
      });
      
      console.log('✅ Salvamento realizado com sucesso, aguardando atualização dos dados...');
      
      // Aguardar um momento para os dados serem recarregados pelo React Query
      setTimeout(() => {
        // Buscar dados atualizados após reload
        const updatedAuction = auctions.find(a => a.id === selectedArrematante.leilaoId);
        if (updatedAuction && updatedAuction.arrematante) {
          console.log('🔄 Dados atualizados encontrados após salvamento:', {
            documentos: updatedAuction.arrematante.documentos?.length || 0,
            documentosList: updatedAuction.arrematante.documentos?.map(d => ({nome: d.nome, hasUrl: !!d.url})) || []
          });
          
          // Atualizar selectedArrematante com dados mais recentes para sincronizar com possíveis "Ver Detalhes" subsequentes
          setSelectedArrematante({
            ...selectedArrematante,
            ...updatedAuction.arrematante
          });
        } else {
          console.warn('⚠️ Dados atualizados não encontrados após salvamento');
        }
      }, 1000); // Aguardar 1 segundo para garantir que React Query recarregou
      
      setIsEditModalOpen(false);
      // Remover selectedArrematante para evitar abertura automática do modal de detalhes
      // setSelectedArrematante(null);
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Funções para upload de documentos
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const novosDocumentos: DocumentoInfo[] = [];

    Array.from(files).forEach((file) => {
      const blobUrl = URL.createObjectURL(file);
      const novoDocumento: DocumentoInfo = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        nome: file.name,
        tipo: file.type,
        tamanho: file.size,
        dataUpload: new Date().toISOString(),
        url: blobUrl
      };
      
      // Adicionar URL ao set de URLs temporárias
      tempBlobUrlsRef.current.add(blobUrl);
      novosDocumentos.push(novoDocumento);
    });

    // Atualizar formulário de edição primeiro
    setEditForm(prev => ({
      ...prev,
      documentos: [...prev.documentos, ...novosDocumentos]
    }));

    // 🔄 SINCRONIZAÇÃO ROBUSTA com debounce
    syncDocumentsToDetails(novosDocumentos, 'add');

    console.log('📁 Documentos processados para upload:', novosDocumentos.map(d => d.nome));
    event.target.value = '';
  }, [syncDocumentsToDetails]);

  const handleRemoveDocument = useCallback((id: string) => {
    // Encontrar e limpar a blob URL do documento que será removido
    const docToRemove = editForm.documentos.find(doc => doc.id === id);
    console.log(`🗑️ Removendo documento: ${docToRemove?.nome || id}`, {
      hasUrl: !!docToRemove?.url,
      isBlob: docToRemove?.url?.startsWith('blob:'),
      isInManagedSet: docToRemove?.url ? tempBlobUrlsRef.current.has(docToRemove.url) : false
    });
    
    // Cleanup da URL blob
    if (docToRemove?.url && docToRemove.url.startsWith('blob:') && tempBlobUrlsRef.current.has(docToRemove.url)) {
      try {
        URL.revokeObjectURL(docToRemove.url);
        tempBlobUrlsRef.current.delete(docToRemove.url);
        console.log(`🧹 URL blob para ${docToRemove.nome} revogada com sucesso`);
      } catch (error) {
        console.warn(`⚠️ Erro ao revogar URL blob para ${docToRemove.nome}:`, error);
      }
    }
    
    // Atualizar formulário primeiro
    setEditForm(prev => ({
      ...prev,
      documentos: prev.documentos.filter(doc => doc.id !== id)
    }));

    // 🔄 SINCRONIZAÇÃO ROBUSTA com debounce
    syncDocumentsToDetails([], 'remove', id);

    console.log('🗑️ Documento marcado para remoção:', docToRemove?.nome || id);
  }, [editForm.documentos, syncDocumentsToDetails]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const novosDocumentos: DocumentoInfo[] = [];

    files.forEach((file) => {
      const blobUrl = URL.createObjectURL(file);
      const novoDocumento: DocumentoInfo = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        nome: file.name,
        tipo: file.type,
        tamanho: file.size,
        dataUpload: new Date().toISOString(),
        url: blobUrl
      };
      
      // Adicionar URL ao set de URLs temporárias
      tempBlobUrlsRef.current.add(blobUrl);
      novosDocumentos.push(novoDocumento);
    });

    // Atualizar formulário primeiro
    setEditForm(prev => ({
      ...prev,
      documentos: [...prev.documentos, ...novosDocumentos]
    }));

    // 🔄 SINCRONIZAÇÃO ROBUSTA com debounce
    syncDocumentsToDetails(novosDocumentos, 'add');

    console.log('🎯 Documentos processados via drag-drop:', novosDocumentos.map(d => d.nome));
  }, [syncDocumentsToDetails]);

  // Funções para upload de documentos no modal completo
  const handleFullEditFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const novosDocumentos: DocumentoInfo[] = [];

    Array.from(files).forEach((file) => {
      const blobUrl = URL.createObjectURL(file);
      const novoDocumento: DocumentoInfo = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        nome: file.name,
        tipo: file.type,
        tamanho: file.size,
        dataUpload: new Date().toISOString(),
        url: blobUrl
      };
      
      // Adicionar URL ao set de URLs temporárias
      tempBlobUrlsRef.current.add(blobUrl);
      novosDocumentos.push(novoDocumento);
    });

    // Atualizar formulário completo primeiro
    setFullEditForm(prev => ({
      ...prev,
      documentos: [...prev.documentos, ...novosDocumentos]
    }));

    // 🔄 SINCRONIZAÇÃO ROBUSTA com debounce
    syncDocumentsToDetails(novosDocumentos, 'add');

    console.log('📁 Documentos processados para upload (modal completo):', novosDocumentos.map(d => d.nome));
    event.target.value = '';
  }, [syncDocumentsToDetails]);

  const handleRemoveFullEditDocument = useCallback((id: string) => {
    // Encontrar e limpar a blob URL do documento que será removido
    const docToRemove = fullEditForm.documentos.find(doc => doc.id === id);
    console.log(`🗑️ Removendo documento (edição completa): ${docToRemove?.nome || id}`, {
      hasUrl: !!docToRemove?.url,
      isBlob: docToRemove?.url?.startsWith('blob:'),
      isInManagedSet: docToRemove?.url ? tempBlobUrlsRef.current.has(docToRemove.url) : false
    });
    
    // Cleanup da URL blob
    if (docToRemove?.url && docToRemove.url.startsWith('blob:') && tempBlobUrlsRef.current.has(docToRemove.url)) {
      try {
        URL.revokeObjectURL(docToRemove.url);
        tempBlobUrlsRef.current.delete(docToRemove.url);
        console.log(`🧹 URL blob para ${docToRemove.nome} revogada com sucesso (edição completa)`);
      } catch (error) {
        console.warn(`⚠️ Erro ao revogar URL blob para ${docToRemove.nome} (edição completa):`, error);
      }
    }
    
    // Atualizar formulário completo primeiro
    setFullEditForm(prev => ({
      ...prev,
      documentos: prev.documentos.filter(doc => doc.id !== id)
    }));

    // 🔄 SINCRONIZAÇÃO ROBUSTA com debounce
    syncDocumentsToDetails([], 'remove', id);

    console.log('🗑️ Documento marcado para remoção (modal completo):', docToRemove?.nome || id);
  }, [fullEditForm.documentos, syncDocumentsToDetails]);

  const handleFullEditDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const novosDocumentos: DocumentoInfo[] = [];

    files.forEach((file) => {
      const blobUrl = URL.createObjectURL(file);
      const novoDocumento: DocumentoInfo = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        nome: file.name,
        tipo: file.type,
        tamanho: file.size,
        dataUpload: new Date().toISOString(),
        url: blobUrl
      };
      
      // Adicionar URL ao set de URLs temporárias
      tempBlobUrlsRef.current.add(blobUrl);
      novosDocumentos.push(novoDocumento);
    });

    // Atualizar formulário completo primeiro
    setFullEditForm(prev => ({
      ...prev,
      documentos: [...prev.documentos, ...novosDocumentos]
    }));

    // 🔄 SINCRONIZAÇÃO ROBUSTA com debounce
    syncDocumentsToDetails(novosDocumentos, 'add');

    console.log('🎯 Documentos processados via drag-drop (modal completo):', novosDocumentos.map(d => d.nome));
  }, [syncDocumentsToDetails]);

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
      console.log(`📈 Juros Progressivos - Mês ${mes}: Valor=${valorAtual.toFixed(2)}, Juros aplicados=${jurosMes.toFixed(2)}`);
    }
    
    return Math.round(valorAtual * 100) / 100;
  };

  // Função para calcular juros compostos em parcelas atrasadas
  const calcularJurosAtraso = (arrematante: any, auction: any, valorParcela: number) => {
    const percentualJuros = (arrematante.percentualJurosAtraso || 0) / 100; // Converter % para decimal
    
    if (percentualJuros === 0) {
      return { valorComJuros: valorParcela, mesesAtraso: 0 };
    }

    const now = new Date();
    const loteArrematado = auction?.lotes?.find((lote: any) => lote.id === arrematante.loteId);
    const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento || "parcelamento";
    
    // Para entrada_parcelamento, verificar se é entrada ou parcela mensal
    if (tipoPagamento === "entrada_parcelamento" && loteArrematado?.dataEntrada) {
      const dataEntrada = new Date(loteArrematado.dataEntrada + 'T23:59:59');
      if (now > dataEntrada) {
        // Calcular meses de atraso da entrada
        const mesesAtraso = Math.max(0, Math.floor((now.getTime() - dataEntrada.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        if (mesesAtraso >= 1) {
          const valorComJuros = calcularJurosProgressivos(valorParcela, arrematante.percentualJurosAtraso || 0, mesesAtraso);
          return { valorComJuros, mesesAtraso };
        }
      }
    }

    // Para parcelas mensais (entrada_parcelamento ou parcelamento simples)
    if (arrematante.mesInicioPagamento && arrematante.diaVencimentoMensal) {
      const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
      const parcelasPagas = arrematante.parcelasPagas || 0;
      const quantidadeParcelas = arrematante.quantidadeParcelas || 1;
      
      // Para entrada_parcelamento, ajustar índice das parcelas
      const parcelasEfetivasPagas = tipoPagamento === "entrada_parcelamento" ? 
        Math.max(0, parcelasPagas - 1) : parcelasPagas;
      
      // Verificar cada parcela atrasada
      for (let i = parcelasEfetivasPagas; i < quantidadeParcelas; i++) {
        const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal, 23, 59, 59);
        if (now > parcelaDate) {
          const mesesAtraso = Math.max(0, Math.floor((now.getTime() - parcelaDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
          if (mesesAtraso >= 1) {
            const valorComJuros = calcularJurosProgressivos(valorParcela, arrematante.percentualJurosAtraso || 0, mesesAtraso);
            return { valorComJuros, mesesAtraso };
          }
        }
      }
    }

    // Se não há atraso de pelo menos 1 mês, retorna valor original
    return { valorComJuros: valorParcela, mesesAtraso: 0 };
  };

  // Função para calcular o valor total com juros das parcelas atrasadas
  const calcularValorTotalComJuros = (arrematante: ArrematanteExtendido) => {
    const auction = auctions.find(a => a.id === arrematante.leilaoId);
    if (!auction || !auction.arrematante) {
      return arrematante.valorPagarNumerico || 0;
    }

    const loteArrematado = auction?.lotes?.find((lote: any) => lote.id === arrematante.loteId);
    const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento || "parcelamento";
    const valorTotal = arrematante.valorPagarNumerico || 0;
    const now = new Date();

    // Se já está pago, retornar valor original
    if (arrematante.pago) {
      return valorTotal;
    }

    // À vista - verificar se está atrasado
    if (tipoPagamento === "a_vista") {
      const dataVencimento = loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista;
      if (!dataVencimento) return valorTotal;
      
      const vencimentoDate = new Date(dataVencimento + 'T23:59:59');
      if (now > vencimentoDate) {
        const mesesAtraso = Math.max(0, Math.floor((now.getTime() - vencimentoDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        if (mesesAtraso >= 1) {
          return calcularJurosProgressivos(valorTotal, arrematante.percentualJurosAtraso || 0, mesesAtraso);
        }
      }
      return valorTotal;
    }

    // Entrada + Parcelamento
    if (tipoPagamento === "entrada_parcelamento") {
      const valorEntrada = arrematante.valorEntrada ? 
        (typeof arrematante.valorEntrada === 'string' ? 
          parseFloat(arrematante.valorEntrada.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')) : 
          arrematante.valorEntrada) : 
        valorTotal * 0.3;
      const valorRestante = valorTotal - valorEntrada;
      const quantidadeParcelas = arrematante.quantidadeParcelas || 12;
      const valorPorParcela = Math.round((valorRestante / quantidadeParcelas) * 100) / 100;
      const parcelasPagas = arrematante.parcelasPagas || 0;
      
      let valorTotalComJuros = valorTotal;
      let jurosAcumulados = 0;
      
      // Verificar se entrada está atrasada
      if (parcelasPagas === 0 && loteArrematado?.dataEntrada) {
        const dataEntrada = new Date(loteArrematado.dataEntrada + 'T23:59:59');
        if (now > dataEntrada) {
          const mesesAtraso = Math.max(0, Math.floor((now.getTime() - dataEntrada.getTime()) / (1000 * 60 * 60 * 24 * 30)));
          if (mesesAtraso >= 1) {
            const valorEntradaComJuros = calcularJurosProgressivos(valorEntrada, arrematante.percentualJurosAtraso || 0, mesesAtraso);
            jurosAcumulados += (valorEntradaComJuros - valorEntrada);
          }
        }
      }
      
      // Verificar parcelas mensais atrasadas
      if (arrematante.mesInicioPagamento && arrematante.diaVencimentoMensal) {
        const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
        const parcelasEfetivasPagas = Math.max(0, parcelasPagas - 1);
        
        for (let i = 0; i < quantidadeParcelas; i++) {
          const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal, 23, 59, 59);
          if (now > parcelaDate && i >= parcelasEfetivasPagas) {
            const mesesAtraso = Math.max(0, Math.floor((now.getTime() - parcelaDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
            if (mesesAtraso >= 1) {
              const valorParcelaComJuros = calcularJurosProgressivos(valorPorParcela, arrematante.percentualJurosAtraso || 0, mesesAtraso);
              jurosAcumulados += (valorParcelaComJuros - valorPorParcela);
            }
          }
        }
      }
      
      return Math.round((valorTotalComJuros + jurosAcumulados) * 100) / 100;
    }

    // Parcelamento simples
    if (tipoPagamento === "parcelamento") {
      const quantidadeParcelas = arrematante.quantidadeParcelas || 1;
      const valorPorParcela = valorTotal / quantidadeParcelas;
      const parcelasPagas = arrematante.parcelasPagas || 0;
      
      let valorTotalComJuros = valorTotal;
      let jurosAcumulados = 0;
      
      if (arrematante.mesInicioPagamento && arrematante.diaVencimentoMensal) {
        const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
        
        for (let i = parcelasPagas; i < quantidadeParcelas; i++) {
          const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal, 23, 59, 59);
          if (now > parcelaDate) {
            const mesesAtraso = Math.max(0, Math.floor((now.getTime() - parcelaDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
            if (mesesAtraso >= 1) {
              const valorParcelaComJuros = calcularJurosProgressivos(valorPorParcela, arrematante.percentualJurosAtraso || 0, mesesAtraso);
              jurosAcumulados += (valorParcelaComJuros - valorPorParcela);
            }
          }
        }
      }
      
      return Math.round((valorTotalComJuros + jurosAcumulados) * 100) / 100;
    }

    return valorTotal;
  };

  // Calcular estatísticas
  const stats = {
    total: processedArrematantes().length,
    pago: processedArrematantes().filter(a => a.statusPagamento === 'pago').length,
    pendente: processedArrematantes().filter(a => a.statusPagamento === 'pendente').length,
    atrasado: processedArrematantes().filter(a => a.statusPagamento === 'atrasado').length,
    totalPagamentosRealizados: processedArrematantes()
      .reduce((sum, a) => {
        const auction = auctions.find(auction => auction.id === a.leilaoId);
        if (!auction || !auction.arrematante) return sum;
        
        const arrematante = auction.arrematante;
        const parcelasPagas = arrematante.parcelasPagas || 0;
        
        return sum + parcelasPagas;
      }, 0),
    totalReceita: processedArrematantes()
      .reduce((sum, a) => {
        const auction = auctions.find(auction => auction.id === a.leilaoId);
        if (!auction || !auction.arrematante) return sum;
        
        const arrematante = auction.arrematante;
        const loteArrematado = auction.lotes?.find(lote => lote.id === arrematante.loteId);
        const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento || "parcelamento";
        const valorTotal = a.valorPagarNumerico || 0;
        const parcelasPagas = arrematante.parcelasPagas || 0;
        
        if (parcelasPagas === 0) return sum; // Nenhum pagamento realizado
        
        if (tipoPagamento === "a_vista") {
          // Para à vista, se tem parcela paga, é o valor total
          return sum + (parcelasPagas > 0 ? valorTotal : 0);
        } else if (tipoPagamento === "entrada_parcelamento") {
          // Para entrada + parcelamento, calcular valor das parcelas pagas
          const valorEntrada = arrematante.valorEntrada ? 
            (typeof arrematante.valorEntrada === 'string' ? 
              parseFloat(arrematante.valorEntrada.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')) : 
              arrematante.valorEntrada) : 
            valorTotal * 0.3;
          const valorRestante = valorTotal - valorEntrada;
          const quantidadeParcelas = arrematante.quantidadeParcelas || 12;
          const valorPorParcela = Math.round((valorRestante / quantidadeParcelas) * 100) / 100;
          
          let valorRecebido = 0;
          if (parcelasPagas >= 1) {
            // Entrada paga
            valorRecebido += valorEntrada;
            // Parcelas mensais pagas
            const parcelasMensaisPagas = Math.max(0, parcelasPagas - 1);
            valorRecebido += parcelasMensaisPagas * valorPorParcela;
          }
          
          return sum + valorRecebido;
        } else {
          // Para parcelamento simples
          const quantidadeParcelas = arrematante.quantidadeParcelas || 1;
          const valorPorParcela = valorTotal / quantidadeParcelas;
          return sum + (parcelasPagas * valorPorParcela);
        }
      }, 0),
    totalPendente: processedArrematantes()
      .reduce((sum, a) => {
        // Calcular valor das parcelas pendentes (dentro do prazo) para TODOS os arrematantes
        const auction = auctions.find(auction => auction.id === a.leilaoId);
        if (!auction || !auction.arrematante) return sum;
        
        const arrematante = auction.arrematante;
        const loteArrematado = auction.lotes?.find(lote => lote.id === arrematante.loteId);
        const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento || "parcelamento";
        const now = new Date();
        
        if (tipoPagamento === "a_vista") {
          // Para à vista, verificar se ainda está no prazo
          const dataVencimento = loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista;
          if (dataVencimento && !arrematante.pago) {
            const vencimento = new Date(dataVencimento + 'T23:59:59');
            if (now <= vencimento) {
              return sum + (a.valorPagarNumerico || 0);
            }
          }
          return sum;
        } else if (tipoPagamento === "entrada_parcelamento") {
          // Para entrada + parcelamento, calcular parcelas pendentes (não vencidas)
          const valorTotal = a.valorPagarNumerico || 0;
          const valorEntrada = arrematante.valorEntrada ? 
            (typeof arrematante.valorEntrada === 'string' ? 
              parseFloat(arrematante.valorEntrada.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')) : 
              arrematante.valorEntrada) : 
            valorTotal * 0.3;
          const valorRestante = valorTotal - valorEntrada;
          const quantidadeParcelas = arrematante.quantidadeParcelas || 12;
          const valorPorParcela = Math.round((valorRestante / quantidadeParcelas) * 100) / 100;
          const parcelasPagas = arrematante.parcelasPagas || 0;
          
          let valorPendente = 0;
          
          // Verificar entrada se não foi paga
          if (parcelasPagas === 0 && loteArrematado?.dataEntrada) {
            const dataEntrada = new Date(loteArrematado.dataEntrada + 'T23:59:59');
            if (now <= dataEntrada) {
              valorPendente += valorEntrada;
            }
          }
          
          // Verificar parcelas mensais pendentes (não vencidas)
          if (arrematante.mesInicioPagamento && arrematante.diaVencimentoMensal) {
            const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
            const parcelasEfetivasPagas = Math.max(0, parcelasPagas - 1);
            
            for (let i = 0; i < quantidadeParcelas; i++) {
              const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal, 23, 59, 59);
              // Se a parcela não foi paga E ainda não venceu
              if (i >= parcelasEfetivasPagas && now <= parcelaDate) {
                valorPendente += valorPorParcela;
              }
            }
          }
          
          return sum + valorPendente;
        } else {
          // Para parcelamento simples, calcular parcelas pendentes (não vencidas)
          const valorTotal = a.valorPagarNumerico || 0;
          const parcelasPagas = arrematante.parcelasPagas || 0;
          const quantidadeParcelas = arrematante.quantidadeParcelas || 1;
          const valorPorParcela = valorTotal / quantidadeParcelas;
          
          let valorPendente = 0;
          
          if (arrematante.mesInicioPagamento && arrematante.diaVencimentoMensal) {
            const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
            
            for (let i = parcelasPagas; i < quantidadeParcelas; i++) {
              const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal, 23, 59, 59);
              // Se a parcela ainda não venceu
              if (now <= parcelaDate) {
                valorPendente += valorPorParcela;
              }
            }
          }
          
          return sum + valorPendente;
        }
      }, 0),
    totalParcelasPendentes: processedArrematantes()
      .reduce((sum, a) => {
        // Calcular quantidade de parcelas pendentes (dentro do prazo) para TODOS os arrematantes
        const auction = auctions.find(auction => auction.id === a.leilaoId);
        if (!auction || !auction.arrematante) return sum;
        
        const arrematante = auction.arrematante;
        const loteArrematado = auction.lotes?.find(lote => lote.id === arrematante.loteId);
        const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento || "parcelamento";
        const now = new Date();
        
        if (tipoPagamento === "a_vista") {
          // Para à vista, verificar se ainda está no prazo
          const dataVencimento = loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista;
          if (dataVencimento && !arrematante.pago) {
            const vencimento = new Date(dataVencimento + 'T23:59:59');
            if (now <= vencimento) {
              return sum + 1;
            }
          }
          return sum;
        } else if (tipoPagamento === "entrada_parcelamento") {
          // Para entrada + parcelamento, contar parcelas pendentes (não vencidas)
          const parcelasPagas = arrematante.parcelasPagas || 0;
          const quantidadeParcelas = arrematante.quantidadeParcelas || 12;
          let parcelasPendentes = 0;
          
          // Verificar entrada se não foi paga
          if (parcelasPagas === 0 && loteArrematado?.dataEntrada) {
            const dataEntrada = new Date(loteArrematado.dataEntrada + 'T23:59:59');
            if (now <= dataEntrada) {
              parcelasPendentes += 1;
            }
          }
          
          // Verificar parcelas mensais pendentes (não vencidas)
          if (arrematante.mesInicioPagamento && arrematante.diaVencimentoMensal) {
            const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
            const parcelasEfetivasPagas = Math.max(0, parcelasPagas - 1);
            
            for (let i = 0; i < quantidadeParcelas; i++) {
              const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal, 23, 59, 59);
              // Se a parcela não foi paga E ainda não venceu
              if (i >= parcelasEfetivasPagas && now <= parcelaDate) {
                parcelasPendentes += 1;
              }
            }
          }
          
          return sum + parcelasPendentes;
        } else {
          // Para parcelamento simples, contar parcelas pendentes (não vencidas)
          const parcelasPagas = arrematante.parcelasPagas || 0;
          const quantidadeParcelas = arrematante.quantidadeParcelas || 1;
          let parcelasPendentes = 0;
          
          if (arrematante.mesInicioPagamento && arrematante.diaVencimentoMensal) {
            const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
            
            for (let i = parcelasPagas; i < quantidadeParcelas; i++) {
              const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal, 23, 59, 59);
              // Se a parcela ainda não venceu
              if (now <= parcelaDate) {
                parcelasPendentes += 1;
              }
            }
          }
          
          return sum + parcelasPendentes;
        }
      }, 0),
    totalAtrasado: processedArrematantes()
      .filter(a => a.statusPagamento === 'atrasado')
      .reduce((sum, a) => {
        // Calcular apenas o valor das parcelas atrasadas, não o valor total
        const auction = auctions.find(auction => auction.id === a.leilaoId);
        if (!auction || !auction.arrematante) return sum;
        
        const arrematante = auction.arrematante;
        const loteArrematado = auction.lotes?.find(lote => lote.id === arrematante.loteId);
        const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento || "parcelamento";
        
        if (tipoPagamento === "a_vista") {
          // Para à vista, aplicar juros se estiver atrasado há pelo menos 1 mês
          const valorTotal = a.valorPagarNumerico || 0;
          const { valorComJuros } = calcularJurosAtraso(arrematante, auction, valorTotal);
          return sum + valorComJuros;
        } else if (tipoPagamento === "entrada_parcelamento") {
          // Para entrada + parcelamento, calcular valor das parcelas atrasadas
          const valorTotal = a.valorPagarNumerico || 0;
          const valorEntrada = arrematante.valorEntrada ? 
            (typeof arrematante.valorEntrada === 'string' ? 
              parseFloat(arrematante.valorEntrada.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')) : 
              arrematante.valorEntrada) : 
            valorTotal * 0.3;
          const valorRestante = valorTotal - valorEntrada;
          const quantidadeParcelas = arrematante.quantidadeParcelas || 12;
          const valorPorParcela = Math.round((valorRestante / quantidadeParcelas) * 100) / 100;
          
          // Calcular quantas parcelas estão atrasadas
          const parcelasPagas = arrematante.parcelasPagas || 0;
          const now = new Date();
          let parcelasAtrasadas = 0;
          let entradaAtrasada = false;
          
          // Verificar se entrada está atrasada
          if (parcelasPagas === 0 && loteArrematado?.dataEntrada) {
            const dataEntrada = new Date(loteArrematado.dataEntrada + 'T23:59:59');
            if (now > dataEntrada) {
              entradaAtrasada = true;
            }
          }
          
          // Verificar parcelas mensais atrasadas
          if (arrematante.mesInicioPagamento && arrematante.diaVencimentoMensal) {
            const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
            const parcelasEfetivasPagas = Math.max(0, parcelasPagas - 1);
            
            for (let i = 0; i < quantidadeParcelas; i++) {
              const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal, 23, 59, 59);
              if (now > parcelaDate && i >= parcelasEfetivasPagas) {
                parcelasAtrasadas++;
              }
            }
          }
          
          let valorAtrasado = 0;
          
          // Aplicar juros na entrada se atrasada há pelo menos 1 mês
          if (entradaAtrasada) {
            const { valorComJuros } = calcularJurosAtraso(arrematante, auction, valorEntrada);
            valorAtrasado += valorComJuros;
          }
          
          // Aplicar juros nas parcelas mensais atrasadas há pelo menos 1 mês
          if (arrematante.mesInicioPagamento && arrematante.diaVencimentoMensal) {
            const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
            const parcelasEfetivasPagas = Math.max(0, parcelasPagas - 1);
            
            for (let i = 0; i < quantidadeParcelas; i++) {
              const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal, 23, 59, 59);
              if (now > parcelaDate && i >= parcelasEfetivasPagas) {
                // Calcular meses de atraso para esta parcela específica
                const mesesAtraso = Math.max(0, Math.floor((now.getTime() - parcelaDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                if (mesesAtraso >= 1) {
                  const valorComJuros = calcularJurosProgressivos(valorPorParcela, arrematante.percentualJurosAtraso || 0, mesesAtraso);
                  console.log(`🔍 JUROS DEBUG - Parcela ${i + 1}: valorOriginal=${valorPorParcela}, meses=${mesesAtraso}, percentual=${arrematante.percentualJurosAtraso}%, valorComJuros=${valorComJuros}`);
                  valorAtrasado = Math.round((valorAtrasado + valorComJuros) * 100) / 100;
                } else {
                  // Se não tem 1 mês de atraso, soma valor original
                  console.log(`🔍 SEM JUROS DEBUG - Parcela ${i + 1}: valorOriginal=${valorPorParcela}, meses=${mesesAtraso}`);
                  valorAtrasado = Math.round((valorAtrasado + valorPorParcela) * 100) / 100;
                }
              }
            }
          }
          
          const novoSum = Math.round((sum + valorAtrasado) * 100) / 100;
          console.log(`🔍 TOTAL DEBUG - ${arrematante.nome}: valorAtrasado=${valorAtrasado}, sum anterior=${sum}, novo sum=${novoSum}`);
          return novoSum;
        } else {
          // Para parcelamento simples
          const valorTotal = a.valorPagarNumerico || 0;
          const quantidadeParcelas = arrematante.quantidadeParcelas || 1;
          const valorPorParcela = valorTotal / quantidadeParcelas;
          
          // Calcular valor das parcelas atrasadas com juros
          const parcelasPagas = arrematante.parcelasPagas || 0;
          const now = new Date();
          let valorAtrasado = 0;
          
          if (arrematante.mesInicioPagamento && arrematante.diaVencimentoMensal) {
            const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
            
            for (let i = parcelasPagas; i < quantidadeParcelas; i++) {
              const parcelaDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal, 23, 59, 59);
              if (now > parcelaDate) {
                // Calcular meses de atraso para esta parcela específica
                const mesesAtraso = Math.max(0, Math.floor((now.getTime() - parcelaDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                if (mesesAtraso >= 1) {
                  const valorComJuros = calcularJurosProgressivos(valorPorParcela, arrematante.percentualJurosAtraso || 0, mesesAtraso);
                  console.log(`🔍 JUROS DEBUG - Parcela ${i + 1}: valorOriginal=${valorPorParcela}, meses=${mesesAtraso}, percentual=${arrematante.percentualJurosAtraso}%, valorComJuros=${valorComJuros}`);
                  valorAtrasado = Math.round((valorAtrasado + valorComJuros) * 100) / 100;
                } else {
                  // Se não tem 1 mês de atraso, soma valor original
                  console.log(`🔍 SEM JUROS DEBUG - Parcela ${i + 1}: valorOriginal=${valorPorParcela}, meses=${mesesAtraso}`);
                  valorAtrasado = Math.round((valorAtrasado + valorPorParcela) * 100) / 100;
                }
              } else {
                break;
              }
            }
          }
          
          const novoSum = Math.round((sum + valorAtrasado) * 100) / 100;
          console.log(`🔍 TOTAL DEBUG - ${arrematante.nome}: valorAtrasado=${valorAtrasado}, sum anterior=${sum}, novo sum=${novoSum}`);
          return novoSum;
        }
      }, 0)
  };

  // Função para abrir modal de edição completa
  const handleOpenFullEdit = (arrematante: ArrematanteExtendido) => {
    console.log(`🔧 Abrindo modal de edição completa para arrematante:`, {
      arrematanteId: arrematante.id,
      leilaoId: arrematante.leilaoId,
      nome: arrematante.nome,
      diaVencimentoMensal: arrematante.diaVencimentoMensal,
      quantidadeParcelas: arrematante.quantidadeParcelas,
      mesInicioPagamento: arrematante.mesInicioPagamento
    });

    // 🔧 SINCRONIZAÇÃO: Buscar dados mais recentes do arrematante no leilão
    const auction = auctions.find(a => a.id === arrematante.leilaoId);
    if (auction && auction.arrematante) {
      console.log('🔧 Carregando dados mais recentes:', {
        documento: auction.arrematante.documento,
        endereco: auction.arrematante.endereco
      });
      
      // Criar objeto arrematante com dados mais recentes
      const updatedArrematante = {
        ...arrematante,
        documento: auction.arrematante.documento || arrematante.documento || "",
        endereco: auction.arrematante.endereco || arrematante.endereco || "",
        nome: auction.arrematante.nome || arrematante.nome || "",
        email: auction.arrematante.email || arrematante.email || "",
        telefone: auction.arrematante.telefone || arrematante.telefone || "",
        documentos: auction.arrematante.documentos || arrematante.documentos || []
      };
      
      console.log('🔄 Abrindo edição completa com documentos sincronizados:', {
        documentos: updatedArrematante.documentos?.length || 0,
        documentosList: updatedArrematante.documentos?.map(d => ({nome: d.nome, hasUrl: !!d.url})) || []
      });
      
      setSelectedArrematanteForFullEdit(updatedArrematante);
    } else {
      setSelectedArrematanteForFullEdit(arrematante);
    }
    
    setIsFullEditModalOpen(true);
  };

  // Função para fechar modal de edição completa
  const handleCloseFullEdit = () => {
    setIsFullEditModalOpen(false);
    setSelectedArrematanteForFullEdit(null);
    setFullEditForm({
      nome: "",
      documento: "",
      endereco: "",
      email: "",
      telefone: "",
      loteId: "",
      valorPagar: "",
      valorEntrada: "",
      diaVencimentoMensal: 15,
      quantidadeParcelas: 12,
      parcelasPagas: 0,
      mesInicioPagamento: new Date().toISOString().slice(0, 7),
      pago: false,
      documentos: []
    });
  };

  // Função para salvar edição completa
  const handleSaveFullEdit = async () => {
    if (!selectedArrematanteForFullEdit) return;

    const auction = auctions.find(a => a.id === selectedArrematanteForFullEdit.leilaoId);
    if (!auction || !auction.arrematante) return;

    setIsSavingFullEdit(true);
    
    try {
      console.log('🔍 Dados do formulário antes de salvar:', {
        documento: fullEditForm.documento,
        endereco: fullEditForm.endereco,
        nome: fullEditForm.nome,
        email: fullEditForm.email
      });
      
      // Verificar se campos relevantes do arrematante diferem dos padrões do leilão
      const shouldSyncAuctionDefaults = (
        fullEditForm.diaVencimentoMensal !== auction.diaVencimentoPadrao ||
        fullEditForm.quantidadeParcelas !== auction.parcelasPadrao ||
        fullEditForm.mesInicioPagamento !== auction.mesInicioPagamento
      );

      // 🔄 Converter documentos blob para base64 se necessário (edição completa)
      console.log('🔄 Processando documentos (edição completa) antes do salvamento:', fullEditForm.documentos.map(d => ({nome: d.nome, hasUrl: !!d.url, urlType: d.url?.substring(0, 10)})));
      
      const documentosProcessados = await Promise.all(
        fullEditForm.documentos.map(async (doc, index) => {
          if (doc.url && doc.url.startsWith('blob:')) {
            console.log(`🔄 Convertendo documento ${doc.nome} para base64 (edição completa ${index + 1}/${fullEditForm.documentos.length})...`);
            
            // Verificar se a URL blob ainda existe no conjunto de URLs gerenciadas
            if (!tempBlobUrlsRef.current.has(doc.url)) {
              console.warn(`⚠️ URL blob para ${doc.nome} não encontrada no conjunto gerenciado (edição completa).`);
              console.log(`🔄 Adicionando URL ao conjunto para evitar cleanup prematuro (edição completa)...`);
              tempBlobUrlsRef.current.add(doc.url);
            }
            
            try {
              // Tentar fazer fetch da URL blob
              console.log(`📥 Fazendo fetch da URL blob (edição completa): ${doc.url.substring(0, 50)}...`);
              const response = await fetch(doc.url);
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              
              console.log(`📄 Response OK para ${doc.nome} (edição completa), convertendo para blob...`);
              const blob = await response.blob();
              
              if (!blob || blob.size === 0) {
                throw new Error('Blob vazio ou inválido');
              }
              
              console.log(`📋 Blob válido para ${doc.nome} (edição completa - ${blob.size} bytes), convertendo para base64...`);
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  if (reader.result && typeof reader.result === 'string') {
                    resolve(reader.result);
                  } else {
                    reject(new Error('FileReader retornou resultado inválido'));
                  }
                };
                reader.onerror = () => reject(new Error('Erro no FileReader'));
                reader.readAsDataURL(blob);
              });
              
              console.log(`✅ Documento ${doc.nome} convertido com sucesso (edição completa - ${base64.length} chars)`);
              
              // Limpar a URL blob após conversão bem-sucedida
              if (tempBlobUrlsRef.current.has(doc.url)) {
                URL.revokeObjectURL(doc.url);
                tempBlobUrlsRef.current.delete(doc.url);
                console.log(`🧹 URL blob para ${doc.nome} limpa após conversão (edição completa)`);
              }
              
              return { ...doc, url: base64 };
            } catch (error) {
              console.error(`❌ Erro ao converter documento ${doc.nome} (edição completa):`, {
                error: error,
                message: error instanceof Error ? error.message : 'Erro desconhecido',
                docUrl: doc.url.substring(0, 50),
                docSize: doc.tamanho,
                docType: doc.tipo
              });
              
              // Tentar limpar a URL mesmo com erro
              if (tempBlobUrlsRef.current.has(doc.url)) {
                try {
                  URL.revokeObjectURL(doc.url);
                  tempBlobUrlsRef.current.delete(doc.url);
                  console.log(`🧹 URL blob para ${doc.nome} limpa após erro (edição completa)`);
                } catch (cleanupError) {
                  console.warn(`⚠️ Erro ao limpar URL blob para ${doc.nome} (edição completa):`, cleanupError);
                }
              }
              
              return { ...doc, url: null }; // Definir URL como null se conversão falhou
            }
          } else if (doc.url && doc.url.startsWith('data:')) {
            console.log(`✅ Documento ${doc.nome} já em base64 (edição completa), mantendo...`);
            return doc;
          } else {
            console.log(`⚠️ Documento ${doc.nome} sem URL válida (edição completa), mantendo como está...`);
            return doc;
          }
        })
      );

      console.log('✅ Documentos processados (edição completa):', documentosProcessados.map(d => ({nome: d.nome, hasUrl: !!d.url, isBase64: d.url?.startsWith('data:')})));

      // Preparar dados para atualização
      const updateData: any = {
        arrematante: {
          ...auction.arrematante,
          nome: fullEditForm.nome,
          documento: fullEditForm.documento,
          endereco: fullEditForm.endereco,
          email: fullEditForm.email,
          telefone: fullEditForm.telefone,
          loteId: fullEditForm.loteId,
          valorPagar: fullEditForm.valorPagar,
          valorPagarNumerico: parseFloat(fullEditForm.valorPagar.replace(/[R$\s.]/g, '').replace(',', '.')) || 0,
          valorEntrada: fullEditForm.valorEntrada,
          diaVencimentoMensal: fullEditForm.diaVencimentoMensal,
          quantidadeParcelas: fullEditForm.quantidadeParcelas,
          parcelasPagas: fullEditForm.parcelasPagas,
          mesInicioPagamento: fullEditForm.mesInicioPagamento,
          pago: fullEditForm.pago,
          documentos: documentosProcessados
        }
      };

      // 🔄 SINCRONIZAÇÃO BIDIRECIONAL: Se valores do arrematante diferem, sincronizar leilão
      if (shouldSyncAuctionDefaults) {
        console.log('🔄 Sincronizando padrões do leilão com valores do arrematante...');
        
        updateData.diaVencimentoPadrao = fullEditForm.diaVencimentoMensal;
        updateData.parcelasPadrao = fullEditForm.quantidadeParcelas;
        updateData.mesInicioPagamento = fullEditForm.mesInicioPagamento;
        
        // Disparar evento para notificar formulário do leilão sobre mudanças
        window.dispatchEvent(new CustomEvent('arrematanteFormChanged', {
          detail: {
            auctionId: auction.id,
            changes: {
              diaVencimentoPadrao: fullEditForm.diaVencimentoMensal,
              parcelasPadrao: fullEditForm.quantidadeParcelas,
              mesInicioPagamento: fullEditForm.mesInicioPagamento
            }
          }
        }));

      }

      console.log('🔍 Dados sendo salvos:', updateData);
      
      await updateAuction({
        id: auction.id,
        data: updateData
      });
      
      // Log da edição do arrematante
      await logBidderAction('update', fullEditForm.nome, auction.nome, auction.id, {
        metadata: {
          changes: {
            nome: fullEditForm.nome !== auction.arrematante.nome,
            documento: fullEditForm.documento !== auction.arrematante.documento,
            endereco: fullEditForm.endereco !== auction.arrematante.endereco,
            email: fullEditForm.email !== auction.arrematante.email,
            telefone: fullEditForm.telefone !== auction.arrematante.telefone,
            loteId: fullEditForm.loteId !== auction.arrematante.loteId,
            valorPagar: fullEditForm.valorPagar !== auction.arrematante.valorPagar,
            quantidadeParcelas: fullEditForm.quantidadeParcelas !== auction.arrematante.quantidadeParcelas,
            parcelasPagas: fullEditForm.parcelasPagas !== auction.arrematante.parcelasPagas
          },
          sync_auction_defaults: shouldSyncAuctionDefaults
        }
      });
      
      console.log('✅ Dados salvos com sucesso (edição completa), aguardando atualização dos dados...');
      
      // Aguardar um momento para os dados serem recarregados pelo React Query
      setTimeout(() => {
        // Buscar dados atualizados após reload
        const updatedAuction = auctions.find(a => a.id === selectedArrematanteForFullEdit?.leilaoId);
        if (updatedAuction && updatedAuction.arrematante) {
          console.log('🔄 Dados atualizados encontrados após salvamento (edição completa):', {
            documentos: updatedAuction.arrematante.documentos?.length || 0,
            documentosList: updatedAuction.arrematante.documentos?.map(d => ({nome: d.nome, hasUrl: !!d.url})) || []
          });
          
          // Atualizar selectedArrematanteForFullEdit com dados mais recentes
          setSelectedArrematanteForFullEdit({
            ...selectedArrematanteForFullEdit!,
            ...updatedAuction.arrematante
          });
        } else {
          console.warn('⚠️ Dados atualizados não encontrados após salvamento (edição completa)');
        }
        
        // Fechar modal após sincronização
        handleCloseFullEdit();
      }, 1000); // Aguardar 1 segundo para garantir que React Query recarregou
    } catch (error) {
      console.error('Erro ao salvar edição completa:', error);
    } finally {
      setIsSavingFullEdit(false);
    }
  };

  // Funções para as novas ações
  const handleConfirmPayment = (arrematante: ArrematanteExtendido) => {
    setSelectedArrematanteForPayment(arrematante);
    
    // 🔧 ADAPTAÇÃO: Verificar tipo de pagamento do lote ou leilão
    const auction = auctions.find(a => a.id === arrematante.leilaoId);
    const loteArrematado = auction?.lotes?.find(lote => lote.id === arrematante.loteId);
    const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento || "parcelamento";
    
    console.log('🎯 Tipo de pagamento detectado:', tipoPagamento);
    
    if (tipoPagamento === "a_vista") {
      // 💰 PAGAMENTO À VISTA: Criar estrutura simples com uma única data de vencimento
      const dataVencimento = loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista;
      const vencimentoDate = dataVencimento ? new Date(dataVencimento + 'T00:00:00') : new Date();
      
      const months = [{
        month: vencimentoDate.toISOString().slice(0, 7),
        paid: arrematante.pago || false,
        dueDate: vencimentoDate.toLocaleDateString('pt-BR'),
        monthName: "Pagamento à Vista"
      }];
      
      setPaymentMonths(months);
    } else if (tipoPagamento === "entrada_parcelamento") {
      // 💳 ENTRADA + PARCELAMENTO: Criar estrutura com entrada separada + parcelas
      const dataEntrada = loteArrematado?.dataEntrada || auction?.dataEntrada;
      const entradaDate = dataEntrada ? new Date(dataEntrada + 'T00:00:00') : new Date();
      const parcelasPagas = arrematante.parcelasPagas || 0;
      
      const months = [];
      
      // Adicionar entrada como primeiro item
      months.push({
        month: entradaDate.toISOString().slice(0, 7),
        paid: parcelasPagas > 0, // Entrada paga se parcelasPagas > 0
        dueDate: entradaDate.toLocaleDateString('pt-BR'),
        monthName: "Entrada",
        isEntrada: true // Flag para identificar como entrada
      });
      
      // Adicionar parcelas
      const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
      for (let i = 0; i < arrematante.quantidadeParcelas; i++) {
        const currentDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal);
        const monthString = currentDate.toISOString().slice(0, 7);
        const dueDate = currentDate.toLocaleDateString('pt-BR');
        const monthName = `${i + 1}ª Parcela - ${currentDate.toLocaleDateString('pt-BR', { 
          month: 'long', 
          year: 'numeric' 
        }).charAt(0).toUpperCase() + currentDate.toLocaleDateString('pt-BR', { 
          month: 'long', 
          year: 'numeric' 
        }).slice(1)}`;
        
        // Parcela paga se (parcelasPagas - 1) > i (descontando a entrada)
        const isPaid = parcelasPagas > 0 && (parcelasPagas - 1) > i;
        
        months.push({
          month: monthString,
          paid: isPaid,
          dueDate: dueDate,
          monthName: monthName,
          isEntrada: false
        });
      }
      
      setPaymentMonths(months);
    } else {
      // 📅 PARCELAMENTO SIMPLES: Gerar lista detalhada de meses de pagamento (código original)
      const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
      const months = [];
      
      for (let i = 0; i < arrematante.quantidadeParcelas; i++) {
        const currentDate = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal);
        const monthString = currentDate.toISOString().slice(0, 7); // YYYY-MM
        const dueDate = currentDate.toLocaleDateString('pt-BR');
        const monthName = currentDate.toLocaleDateString('pt-BR', { 
          month: 'long', 
          year: 'numeric' 
        }).charAt(0).toUpperCase() + currentDate.toLocaleDateString('pt-BR', { 
          month: 'long', 
          year: 'numeric' 
        }).slice(1);
        const isPaid = i < (arrematante.parcelasPagas || 0);
        
        months.push({
          month: monthString,
          paid: isPaid,
          dueDate: dueDate,
          monthName: monthName,
          isEntrada: false
        });
      }
      
      setPaymentMonths(months);
    }
    
    setIsPaymentModalOpen(true);
  };

  const handlePaymentToggle = (monthIndex: number, paid: boolean) => {
    setPaymentMonths(prev => 
      prev.map((month, index) => 
        index === monthIndex ? { ...month, paid } : month
      )
    );
  };

  const handleSavePayments = async () => {
    if (!selectedArrematanteForPayment) return;

    const auction = auctions.find(a => a.id === selectedArrematanteForPayment.leilaoId);
    if (!auction || !auction.arrematante) return;

    // 🔧 ADAPTAÇÃO: Verificar tipo de pagamento
    const loteArrematado = auction?.lotes?.find(lote => lote.id === selectedArrematanteForPayment.loteId);
    const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento || "parcelamento";

    const paidMonths = paymentMonths.filter(m => m.paid).length;
    let isFullyPaid = false;
    let parcelasPagasValue = 0;

    if (tipoPagamento === "a_vista") {
      // 💰 PAGAMENTO À VISTA: Considera pago se o checkbox único estiver marcado
      isFullyPaid = paidMonths > 0;
      parcelasPagasValue = isFullyPaid ? 1 : 0;
    } else if (tipoPagamento === "entrada_parcelamento") {
      // 💳 ENTRADA + PARCELAMENTO: Lógica especial para entrada + parcelas
      const entradaPaga = paymentMonths.find(m => m.isEntrada)?.paid || false;
      const parcelasPagasCount = paymentMonths.filter(m => !m.isEntrada && m.paid).length;
      
      // parcelasPagas = 0 (nada pago), 1 (só entrada), 2+ (entrada + parcelas)
      if (entradaPaga) {
        parcelasPagasValue = 1 + parcelasPagasCount; // Entrada conta como 1 + parcelas pagas
      } else {
        parcelasPagasValue = 0; // Entrada não paga
      }
      
      // Totalmente pago se entrada + todas as parcelas estiverem pagas
      isFullyPaid = entradaPaga && parcelasPagasCount >= selectedArrematanteForPayment.quantidadeParcelas;
    } else {
      // 📅 PARCELAMENTO SIMPLES: Considera pago se todas as parcelas foram pagas
      parcelasPagasValue = paidMonths;
      isFullyPaid = paidMonths >= selectedArrematanteForPayment.quantidadeParcelas;
    }

    console.log('💾 Salvando pagamento:', { 
      tipoPagamento, 
      paidMonths, 
      parcelasPagasValue,
      isFullyPaid 
    });

    try {
      await updateAuction({
        id: auction.id,
        data: {
          arrematante: {
            ...auction.arrematante,
            parcelasPagas: parcelasPagasValue,
            pago: isFullyPaid
          }
        }
      });
      
      // Log da atualização de pagamentos
      const oldParcelasPagas = auction.arrematante.parcelasPagas || 0;
      const paymentDetails = `${oldParcelasPagas} → ${parcelasPagasValue} parcelas pagas${isFullyPaid ? ' (totalmente quitado)' : ''}`;
      
      await logPaymentAction(
        parcelasPagasValue > oldParcelasPagas ? 'mark_paid' : 'mark_unpaid',
        selectedArrematanteForPayment.nome,
        auction.nome,
        auction.id,
        paymentDetails,
        {
          metadata: {
            tipo_pagamento: tipoPagamento,
            parcelas_antigas: oldParcelasPagas,
            parcelas_novas: parcelasPagasValue,
            totalmente_pago: isFullyPaid,
            valor_total: selectedArrematanteForPayment.valorPagarNumerico
          }
        }
      );
      
      console.log('✅ Pagamento atualizado com sucesso, aguardando sincronização...');
      
      // Aguardar um momento para os dados serem recarregados pelo React Query
      setTimeout(() => {
        const updatedAuction = auctions.find(a => a.id === selectedArrematanteForPayment?.leilaoId);
        if (updatedAuction && updatedAuction.arrematante) {
          console.log('🔄 Status de pagamento sincronizado:', {
            pago: updatedAuction.arrematante.pago,
            parcelasPagas: updatedAuction.arrematante.parcelasPagas
          });
        }
      }, 1000);
      
      setIsPaymentModalOpen(false);
      setSelectedArrematanteForPayment(null);
      setPaymentMonths([]);
    } catch (error) {
      console.error('Erro ao salvar pagamentos:', error);
    }
  };

  const handleArchiveArrematante = async (arrematante: ArrematanteExtendido) => {
    try {
      await archiveAuction(arrematante.leilaoId);
    } catch (error) {
      console.error('Erro ao arquivar:', error);
    }
  };

  const handleUnarchiveArrematante = async (arrematante: ArrematanteExtendido) => {
    try {
      await unarchiveAuction(arrematante.leilaoId);
    } catch (error) {
      console.error('Erro ao desarquivar:', error);
    }
  };

  const handleUnconfirmPayment = async (arrematante: ArrematanteExtendido) => {
    try {
      // Encontrar o leilão correspondente
      const auction = auctions.find(a => a.id === arrematante.leilaoId);
      if (!auction || !auction.arrematante) return;

      // Desconfirmar o pagamento
      const updatedArrematante = {
        ...auction.arrematante,
        pago: false,
        parcelasPagas: 0 // Reset parcelas pagas também
      };

      await updateAuction({
        id: arrematante.leilaoId,
        data: { arrematante: updatedArrematante }
      });

      toast({
        title: "Pagamento desconfirmado",
        description: `Pagamento de ${arrematante.nome} foi desconfirmado com sucesso.`,
      });

    } catch (error) {
      console.error('Erro ao desconfirmar pagamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível desconfirmar o pagamento.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteArrematante = async (arrematante: ArrematanteExtendido) => {
    const auction = auctions.find(a => a.id === arrematante.leilaoId);
    if (!auction) return;

    try {
      await updateAuction({
        id: auction.id,
        data: {
          arrematante: undefined
        }
      });
      
      // Log da exclusão do arrematante
      await logBidderAction('delete', arrematante.nome, auction.nome, auction.id, {
        metadata: {
          valor_total: arrematante.valorPagarNumerico,
          parcelas_pagas: arrematante.parcelasPagas || 0,
          estava_pago: arrematante.pago,
          lote_id: arrematante.loteId
        }
      });
    } catch (error) {
      console.error('Erro ao excluir arrematante:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="space-y-8 p-6 fade-simple">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestão de Arrematantes</h1>
            <p className="text-gray-600 mt-1">Gerencie todos os arrematantes e seus pagamentos</p>
          </div>
          <Button 
              className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 btn-download-click"
            onClick={() => setIsExportModalOpen(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border-0 shadow-sm rounded-lg p-6">
          <div className="text-center">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Arrematantes</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
            <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{stats.total}</p>
            <p className="text-sm text-gray-600 font-medium">Cadastrados</p>
          </div>
        </div>

        <div className="bg-white border-0 shadow-sm rounded-lg p-6">
          <div className="text-center">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Pagamentos</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
            <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{stats.totalPagamentosRealizados}</p>
            <p className="text-sm text-gray-600 font-medium mb-2">pagamentos realizados</p>
            <p className="text-lg font-light text-gray-800">{formatCurrency(stats.totalReceita)}</p>
          </div>
        </div>

        <div className="bg-white border-0 shadow-sm rounded-lg p-6">
          <div className="text-center">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Pendentes</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
             <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{stats.totalParcelasPendentes}</p>
             <p className="text-sm text-gray-600 font-medium mb-2">parcelas pendentes</p>
             <p className="text-lg font-light text-gray-800">{formatCurrency(stats.totalPendente)}</p>
          </div>
        </div>

        <div className="bg-white border-0 shadow-sm rounded-lg p-6">
          <div className="text-center">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Atrasados</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
            <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{stats.atrasado}</p>
            <p className="text-sm text-gray-600 font-medium mb-2">Em Atraso</p>
            <p className="text-lg font-light text-gray-800">{formatCurrency(stats.totalAtrasado)}</p>
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <Card className="border-0 shadow-sm h-[calc(100vh-380px)]">
        <CardHeader className="pb-4">
          <div className="space-y-4">
            <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
              <div className="p-2 bg-gray-100 rounded-lg">
                {showArchived ? <Archive className="h-5 w-5 text-gray-600" /> : <Users className="h-5 w-5 text-gray-600" />}
              </div>
              {showArchived ? "Arrematantes Arquivados" : "Arrematantes Cadastrados"}
            </CardTitle>
            
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Barra de pesquisa à esquerda */}
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar arrematante ou leilão..."
                  value={searchInputValue}
                  onChange={(e) => setSearchInputValue(e.target.value)}
                  className="pl-10 h-11 border-gray-300 focus:border-gray-300 focus:ring-0 no-focus-outline"
                />
              </div>
              
              {/* Filtros à direita */}
              <div className="flex gap-3 lg:ml-auto">
                {showArchived && (
                  <Button
                    variant="outline"
                    onClick={() => setShowArchived(false)}
                    className="h-11 px-3 border-gray-300 text-gray-700 hover:text-black hover:bg-gray-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowArchived(!showArchived)}
                  className="h-11 px-4 border-gray-300 text-gray-700 hover:text-black hover:bg-gray-50"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {showArchived ? "Ver Ativos" : "Ver Arquivados"}
                </Button>
                
                <Select 
                  value={statusFilter} 
                  onValueChange={setStatusFilter}
                  onOpenChange={setIsStatusSelectOpen}
                >
                  <SelectTrigger 
                    className="w-48 h-11 border-gray-300 focus:!ring-0 focus:!ring-offset-0 focus:!border-gray-300 focus:!outline-none focus:!shadow-none"
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos ({getStatusCount("todos")})</SelectItem>
                    <SelectItem value="pago">Pagos ({getStatusCount("pago")})</SelectItem>
                    <SelectItem value="pendente">Pendentes ({getStatusCount("pendente")})</SelectItem>
                    <SelectItem value="atrasado">Atrasados ({getStatusCount("atrasado")})</SelectItem>
                  </SelectContent>
                </Select>
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
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-full bg-gray-200 w-10 h-10"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-4 bg-gray-200 rounded w-28"></div>
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-12"></div>
                      <div className="flex gap-1">
                        <div className="w-8 h-8 bg-gray-200 rounded"></div>
                        <div className="w-8 h-8 bg-gray-200 rounded"></div>
                        <div className="w-8 h-8 bg-gray-200 rounded"></div>
                        <div className="w-8 h-8 bg-gray-200 rounded"></div>
                        <div className="w-8 h-8 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredArrematantes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              {showArchived ? <Archive className="h-12 w-12 mb-4 text-gray-300" /> : <Users className="h-12 w-12 mb-4 text-gray-300" />}
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm && statusFilter !== "todos" 
                  ? `Nenhum arrematante ${statusFilter} encontrado`
                  : searchTerm 
                    ? "Nenhum arrematante encontrado"
                    : statusFilter !== "todos"
                      ? `Nenhum arrematante ${statusFilter}`
                      : showArchived 
                        ? "Nenhum arrematante arquivado"
                        : "Nenhum arrematante encontrado"}
              </h3>
              <p className="text-sm text-center max-w-md">
                {searchTerm && statusFilter !== "todos"
                  ? `Nenhum arrematante ${statusFilter} corresponde à busca "${searchTerm}".`
                  : searchTerm
                    ? `Nenhum resultado para "${searchTerm}". Tente outro termo.`
                    : statusFilter !== "todos"
                      ? `Não há arrematantes com status ${statusFilter} no momento.`
                      : showArchived 
                        ? "Não há arrematantes arquivados no momento."
                        : "Ainda não há arrematantes cadastrados no sistema."}
              </p>
            </div>
          ) : (
            <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200">
                    <TableHead className="font-semibold text-gray-700">Arrematante</TableHead>
                    <TableHead className="font-semibold text-gray-700">Leilão</TableHead>
                    <TableHead className="font-semibold text-gray-700">Valor</TableHead>
                    <TableHead className="font-semibold text-gray-700">Vencimento</TableHead>
                    <TableHead className="font-semibold text-gray-700">Situação</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArrematantes.map((arrematante) => (
                    <TableRow key={arrematante.id} className="border-gray-100 hover:bg-gray-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            arrematante.statusPagamento === 'pago' 
                              ? 'bg-green-100' 
                              : arrematante.statusPagamento === 'atrasado'
                              ? 'bg-red-100'
                              : 'bg-yellow-100'
                          }`}>
                            {getStatusIcon(arrematante.statusPagamento)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{arrematante.nome}</p>
                            <p className="text-sm text-gray-500">
                              {arrematante.documentos && arrematante.documentos.length > 0 
                                ? `${arrematante.documentos.length} documento(s)` 
                                : 'Sem documentos'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{arrematante.leilaoNome}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(arrematante.dataLeilao + 'T12:00:00.000Z').toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-gray-900">
                          {(() => {
                            const valorComJuros = calcularValorTotalComJuros(arrematante);
                            const valorOriginal = arrematante.valorPagarNumerico || 0;
                            const temJuros = valorComJuros > valorOriginal;
                            
                            return (
                              <div className="flex flex-col">
                                <span>
                                  R$ {valorComJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                {temJuros && (
                                  <span className="text-xs text-red-600">
                                    (R$ {(valorComJuros - valorOriginal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} juros)
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className={`text-sm font-medium ${(() => {
                              // Verificar se é um caso de pagamento com atraso para definir cor
                              const auction = auctions.find(a => a.id === arrematante.leilaoId);
                              const loteArrematado = auction?.lotes?.find(lote => lote.id === arrematante.loteId);
                              const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento || "parcelamento";
                              
                              if (arrematante.pago) {
                                const today = new Date();
                                let dueDate: Date;
                                
                                if (tipoPagamento === "a_vista") {
                                  const dataVencimento = loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista;
                                  dueDate = dataVencimento ? new Date(dataVencimento + 'T23:59:59') : new Date();
                                } else {
                                  const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
                                  const lastPaidIndex = Math.max(0, (arrematante.parcelasPagas || 1) - 1);
                                  dueDate = new Date(startYear, startMonth - 1 + lastPaidIndex, arrematante.diaVencimentoMensal, 23, 59, 59);
                                }
                                
                                const isLate = today > dueDate;
                                return isLate ? 'text-red-600' : 'text-gray-900';
                              } else if (!arrematante.pago) {
                                // Verificar também se parcelamento sem pago flag está quitado com atraso
                                const proximoPagamento = calculateNextPaymentDate(arrematante);
                                if (!proximoPagamento) {
                                  const today = new Date();
                                  const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
                                  const lastPaidIndex = Math.max(0, (arrematante.parcelasPagas || 1) - 1);
                                  const dueDate = new Date(startYear, startMonth - 1 + lastPaidIndex, arrematante.diaVencimentoMensal, 23, 59, 59);
                                  const isLate = today > dueDate;
                                  return isLate ? 'text-red-600' : 'text-gray-900';
                                }
                              }
                              return 'text-gray-900';
                            })()}`}>
                            {(() => {
                              // Obter leilão e lote para verificar tipo de pagamento
                              const auction = auctions.find(a => a.id === arrematante.leilaoId);
                              const loteArrematado = auction?.lotes?.find(lote => lote.id === arrematante.loteId);
                              const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento || "parcelamento";
                              
                              if (arrematante.pago) {
                                // 🔧 VERIFICAR SE PAGAMENTO FOI FEITO COM ATRASO
                                const today = new Date();
                                let dueDate: Date;
                                
                                if (tipoPagamento === "a_vista") {
                                  const dataVencimento = loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista;
                                  dueDate = dataVencimento ? new Date(dataVencimento + 'T23:59:59') : new Date();
                                } else {
                                  // Para parcelamento, verificar a data da última parcela paga
                                  const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
                                  const lastPaidIndex = Math.max(0, (arrematante.parcelasPagas || 1) - 1);
                                  dueDate = new Date(startYear, startMonth - 1 + lastPaidIndex, arrematante.diaVencimentoMensal, 23, 59, 59);
                                }
                                
                                const isLate = today > dueDate;
                                return isLate ? "Quitado com atraso" : "Quitado";
                              }
                              
                              // Para pagamento à vista, mostrar data de vencimento específica
                              if (tipoPagamento === "a_vista") {
                                const dataVencimento = loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista;
                                return (
                                  <div>
                                    <div className="text-xs text-gray-500 mb-1">Vencimento à vista</div>
                                    <div className="font-medium">
                                      {dataVencimento ? 
                                        new Date(dataVencimento + 'T00:00:00').toLocaleDateString("pt-BR") : 
                                        'Não definida'}
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Para entrada_parcelamento, tratar entrada separadamente
                              if (tipoPagamento === "entrada_parcelamento") {
                                const parcelasPagas = arrematante.parcelasPagas || 0;
                                
                                if (parcelasPagas === 0) {
                                  // Entrada pendente - mostrar data da entrada
                                  const dataEntrada = loteArrematado?.dataEntrada || auction?.dataEntrada;
                                  return (
                                    <div>
                                      <div className="text-xs text-gray-500 mb-1">Vencimento entrada</div>
                                      <div className="font-medium">
                                        {dataEntrada ? 
                                          new Date(dataEntrada + 'T00:00:00').toLocaleDateString("pt-BR") : 
                                          'Não definido'}
                                      </div>
                                    </div>
                                  );
                                } else {
                                  // Entrada paga, mostrar próxima parcela
                                  const proximoPagamento = calculateNextPaymentDateEntradaParcelamento(arrematante, auction);
                                  if (!proximoPagamento) {
                                    // Verificar se parcelamento foi quitado com atraso
                                    const today = new Date();
                                    const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
                                    const lastPaidIndex = Math.max(0, parcelasPagas - 1);
                                    const dueDate = new Date(startYear, startMonth - 1 + lastPaidIndex, arrematante.diaVencimentoMensal, 23, 59, 59);
                                    const isLate = today > dueDate;
                                    return isLate ? "Quitado com atraso" : "Quitado";
                                  }
                                  const parcelaAtual = parcelasPagas; // Próxima parcela a ser paga
                                  return (
                                    <div>
                                      <div className="text-xs text-gray-500 mb-1">Venc. {parcelaAtual}ª parcela</div>
                                      <div className="font-medium">
                                        {proximoPagamento.toLocaleDateString("pt-BR")}
                                      </div>
                                    </div>
                                  );
                                }
                              }
                              
                              // Para parcelamento simples, usar lógica existente
                              const proximoPagamento = calculateNextPaymentDate(arrematante);
                              if (!proximoPagamento) {
                                // 🔧 VERIFICAR SE PARCELAMENTO FOI QUITADO COM ATRASO
                                const today = new Date();
                                const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
                                const lastPaidIndex = Math.max(0, (arrematante.parcelasPagas || 1) - 1);
                                const dueDate = new Date(startYear, startMonth - 1 + lastPaidIndex, arrematante.diaVencimentoMensal, 23, 59, 59);
                                const isLate = today > dueDate;
                                return isLate ? "Quitado com atraso" : "Quitado";
                              }
                              const parcelaAtual = (arrematante.parcelasPagas || 0) + 1;
                              return (
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Venc. {parcelaAtual}ª parcela</div>
                                  <div className="font-medium">
                                    {proximoPagamento.toLocaleDateString("pt-BR")}
                                  </div>
                                </div>
                              );
                            })()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {(() => {
                            // Obter leilão e lote para verificar tipo de pagamento
                            const auction = auctions.find(a => a.id === arrematante.leilaoId);
                            const loteArrematado = auction?.lotes?.find(lote => lote.id === arrematante.loteId);
                            const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento || "parcelamento";
                            
                            if (tipoPagamento === "a_vista") {
                              // Para pagamento à vista
                              return (
                                <>
                                  <span className={`text-sm font-medium ${
                                    arrematante.pago 
                                      ? (() => {
                                          // Verificar se pagamento à vista foi feito com atraso
                                          const today = new Date();
                                          const dataVencimento = loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista;
                                          const dueDate = dataVencimento ? new Date(dataVencimento + 'T23:59:59') : new Date();
                                          const isLate = today > dueDate;
                                          return isLate ? 'text-red-600' : 'text-green-700';
                                        })() 
                                      : 'text-gray-900'
                                  }`}>
                                    <div className="flex items-center gap-2">
                                      {arrematante.pago 
                                        ? (() => {
                                            // Verificar se pagamento à vista foi feito com atraso
                                            const today = new Date();
                                            const dataVencimento = loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista;
                                            const dueDate = dataVencimento ? new Date(dataVencimento + 'T23:59:59') : new Date();
                                            const isLate = today > dueDate;
                                            return (
                                              <>
                                                {isLate ? (
                                                  <CircleX className="h-4 w-4 text-red-500" />
                                                ) : (
                                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                                )}
                                                {isLate ? "Pago à Vista com Atraso" : "Pago à Vista"}
                                              </>
                                            );
                                          })() 
                                        : "Pagamento à Vista"
                                      }
                                    </div>
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {arrematante.pago 
                                      ? (() => {
                                          // Verificar se pagamento à vista foi feito com atraso
                                          const today = new Date();
                                          const dataVencimento = loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista;
                                          const dueDate = dataVencimento ? new Date(dataVencimento + 'T23:59:59') : new Date();
                                          const isLate = today > dueDate;
                                          return isLate ? 'Pagamento com atraso confirmado' : 'Transação confirmada';
                                        })() 
                                      : 'Aguardando pagamento'
                                    }
                                  </span>
                                </>
                              );
                            } else {
                              // Para parcelamento (lógica original)
                              const loteArrematado = auction.lotes?.find((lote: any) => lote.id === arrematante.loteId);
                              const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento || "parcelamento";
                              const quantidadeParcelas = arrematante.quantidadeParcelas || 0;
                              const parcelasPagas = arrematante.parcelasPagas || 0;
                              
                              let totalParcelas;
                              if (tipoPagamento === "entrada_parcelamento") {
                                // Para entrada + parcelamento: total = 1 entrada + X parcelas
                                totalParcelas = 1 + quantidadeParcelas;
                              } else {
                                // Para parcelamento simples
                                totalParcelas = quantidadeParcelas;
                              }
                              
                              const restantes = totalParcelas - parcelasPagas;
                              return (
                                <>
                                  <span className={`text-sm font-medium ${
                                    restantes === 0 
                                      ? (() => {
                                          // Verificar se foi quitado com atraso
                                          const today = new Date();
                                          const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
                                          const lastPaidIndex = Math.max(0, (arrematante.parcelasPagas || 1) - 1);
                                          const dueDate = new Date(startYear, startMonth - 1 + lastPaidIndex, arrematante.diaVencimentoMensal, 23, 59, 59);
                                          const isLate = today > dueDate;
                                          return isLate ? 'text-red-600' : 'text-green-700';
                                        })() 
                                      : 'text-gray-900'
                                  }`}>
                                    {(() => {
                                      if (restantes === 0) {
                                        // 🔧 VERIFICAR SE PARCELAMENTO FOI QUITADO COM ATRASO
                                        const today = new Date();
                                        const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
                                        const lastPaidIndex = Math.max(0, (arrematante.parcelasPagas || 1) - 1);
                                        const dueDate = new Date(startYear, startMonth - 1 + lastPaidIndex, arrematante.diaVencimentoMensal, 23, 59, 59);
                                        const isLate = today > dueDate;
                                        return isLate ? "🔴 Quitado com Atraso" : "✅ Quitado";
                                      }
                                      if (restantes === 1) return "Falta 1 parcela";
                                      return `Faltam ${restantes} parcelas`;
                                    })()}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {(() => {
                                      const loteArrematado = auction.lotes?.find((lote: any) => lote.id === arrematante.loteId);
                                      const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento || "parcelamento";
                                      const parcelasPagas = arrematante.parcelasPagas || 0;
                                      const quantidadeParcelas = arrematante.quantidadeParcelas || 0;
                                      
                                      if (tipoPagamento === "entrada_parcelamento") {
                                        // Para entrada + parcelamento: total = 1 entrada + X parcelas
                                        const totalParcelas = 1 + quantidadeParcelas;
                                        return `${parcelasPagas}/${totalParcelas} pagas`;
                                      } else {
                                        // Para parcelamento simples ou à vista
                                        return `${parcelasPagas}/${quantidadeParcelas} pagas`;
                                      }
                                    })()}
                                  </span>
                                </>
                              );
                            }
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(arrematante.statusPagamento)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {/* Ações de Pagamento (Primeira prioridade) */}
                          {!arrematante.pago && !showArchived && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConfirmPayment(arrematante)}
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 btn-action-click"
                              title="Confirmar pagamento"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {arrematante.pago && !showArchived && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnconfirmPayment(arrematante)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Desconfirmar pagamento"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {/* Ações de Visualização */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewArrematante(arrematante)}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-black hover:bg-gray-100 btn-action-click"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {/* Ações de Edição */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditArrematante(arrematante)}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-black hover:bg-gray-100 btn-action-click"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenFullEdit(arrematante)}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-black hover:bg-gray-100 btn-action-click"
                            title="Editar Informações Completas"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          
                          {/* Dropdown com ações adicionais */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-600 hover:text-black hover:bg-gray-100"
                                title="Mais ações"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {showArchived ? (
                                <DropdownMenuItem 
                                  onClick={() => handleUnarchiveArrematante(arrematante)}
                                  className="hover:bg-gray-100 focus:bg-gray-100 hover:text-black focus:text-black"
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  <span>Desarquivar</span>
                                </DropdownMenuItem>
                              ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      onSelect={(e) => e.preventDefault()}
                                      className="hover:bg-gray-100 focus:bg-gray-100 hover:text-black focus:text-black"
                                    >
                                      <Archive className="h-4 w-4 mr-2" />
                                      <span>Arquivar</span>
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Arquivar Arrematante</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja arquivar o arrematante "{arrematante.nome}"? Esta ação moverá o leilão para a seção de arquivados.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleArchiveArrematante(arrematante)}
                                        className="bg-black hover:bg-gray-800 text-white btn-save-click"
                                      >
                                        Arquivar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
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
                                    <AlertDialogTitle>Excluir Arrematante</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir o arrematante "{arrematante.nome}"? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteArrematante(arrematante)}
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

      {/* Modal de Visualização */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Detalhes do Arrematante
            </DialogTitle>
            <DialogDescription>
              Visualize todas as informações detalhadas do arrematante
            </DialogDescription>
          </DialogHeader>

          {selectedArrematante && (
            <div className="space-y-6">
              {(() => {
                // Obter o leilão e lote para verificar tipo de pagamento
                const auction = auctions.find(a => a.id === selectedArrematante.leilaoId);
                const loteArrematado = auction?.lotes?.find(lote => lote.id === selectedArrematante.loteId);
                const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento || "parcelamento";
                
                return (
                  <>
                    {/* Informações básicas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Nome do Arrematante</Label>
                        <p className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium">
                          {selectedArrematante.nome}
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Leilão</Label>
                        <p className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium">
                          {selectedArrematante.leilaoNome}
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Valor a Ser Pago</Label>
                        <p className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium">
                          {selectedArrematante.valorPagar.startsWith('R$') ? selectedArrematante.valorPagar : `R$ ${selectedArrematante.valorPagar}`}
                        </p>
                      </div>

                      {/* Próximo Pagamento - apenas para parcelamento ou entrada+parcelamento */}
                      {(tipoPagamento === "parcelamento" || tipoPagamento === "entrada_parcelamento") && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Próximo Pagamento</Label>
                          <p className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                            {(() => {
                              let proximoPagamento;
                              if (tipoPagamento === "entrada_parcelamento") {
                                proximoPagamento = calculateNextPaymentDateEntradaParcelamento(selectedArrematante, auction);
                              } else {
                                proximoPagamento = calculateNextPaymentDate(selectedArrematante);
                              }
                              
                              if (!proximoPagamento) {
                                return "Quitado";
                              }
                              return proximoPagamento.toLocaleDateString("pt-BR");
                            })()}
                          </p>
                        </div>
                      )}

                      {/* Data de Vencimento À Vista - apenas para à vista */}
                      {tipoPagamento === "a_vista" && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Data de Vencimento</Label>
                          <p className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                            {(loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista) ? 
                              new Date((loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista) + 'T00:00:00').toLocaleDateString('pt-BR') 
                              : 'Não definida'}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {(() => {
                // Reutilizar a lógica de tipo de pagamento
                const auction = auctions.find(a => a.id === selectedArrematante.leilaoId);
                const loteArrematado = auction?.lotes?.find(lote => lote.id === selectedArrematante.loteId);
                const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento || "parcelamento";
                
                return (
                  /* Status de pagamento formal */
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Status do Pagamento</Label>
                    <div className="mt-1 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-gray-100">
                          {selectedArrematante.pago ? (
                            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : selectedArrematante.statusPagamento === 'atrasado' ? (
                            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">
                            {selectedArrematante.pago 
                              ? 'Pagamento Realizado' 
                              : selectedArrematante.statusPagamento === 'atrasado'
                              ? 'Pagamento Atrasado'
                              : 'Aguardando Pagamento'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {selectedArrematante.pago 
                              ? 'Transação confirmada com sucesso' 
                              : tipoPagamento === "a_vista"
                              ? `Vencimento: ${(loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista) ? 
                                  new Date((loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista) + 'T00:00:00').toLocaleDateString('pt-BR') 
                                  : 'Não definida'}`
                              : (() => {
                                  let proximoPagamento;
                                  if (tipoPagamento === "entrada_parcelamento") {
                                    proximoPagamento = calculateNextPaymentDateEntradaParcelamento(selectedArrematante, auction);
                                  } else {
                                    proximoPagamento = calculateNextPaymentDate(selectedArrematante);
                                  }
                                  
                                  if (!proximoPagamento) {
                                    return 'Todas as parcelas foram quitadas';
                                  }
                                  return `Próximo vencimento: ${proximoPagamento.toLocaleDateString('pt-BR')}`;
                                })()
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Documentos */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Documentos</Label>
                <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md min-h-[60px]">
                  {!selectedArrematante.documentos || selectedArrematante.documentos.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Nenhum documento adicionado</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedArrematante.documentos.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-md">
                          {getFileIcon(doc.tipo)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.nome}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(doc.tamanho)}{(() => {
                                if (!doc.dataUpload) return '';
                                try {
                                  const date = new Date(doc.dataUpload);
                                  if (isNaN(date.getTime())) return '';
                                  return ` • ${date.toLocaleDateString('pt-BR')}`;
                                } catch {
                                  return '';
                                }
                              })()}
                            </p>
                          </div>
                          {doc.url && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (doc.url) {
                                  if (doc.url.startsWith('data:')) {
                                    // Para base64, abrir em nova aba com visualização inline
                                    const newWindow = window.open('', '_blank');
                                    if (newWindow) {
                                      if (doc.tipo.includes('pdf')) {
                                        newWindow.document.write(`
                                          <html>
                                            <head><title>${doc.nome}</title></head>
                                            <body style="margin:0; background:#000;">
                                              <embed src="${doc.url}" width="100%" height="100%" type="application/pdf" />
                                            </body>
                                          </html>
                                        `);
                                      } else if (doc.tipo.includes('image')) {
                                        newWindow.document.write(`
                                          <html>
                                            <head><title>${doc.nome}</title></head>
                                            <body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center; height:100vh;">
                                              <img src="${doc.url}" style="max-width:100%; max-height:100%; object-fit:contain;" />
                                            </body>
                                          </html>
                                        `);
                                      } else {
                                        // Para outros tipos de documento, tentar abrir diretamente
                                        newWindow.location.href = doc.url;
                                      }
                                    }
                                  } else {
                                    // Para URLs blob, abrir diretamente
                                    window.open(doc.url, '_blank');
                                  }
                                }
                              }}
                              className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                              title="Visualizar arquivo"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button
                  onClick={() => handleEditArrematante(selectedArrematante)}
                  className="h-11 px-6 bg-black hover:bg-gray-800 text-white font-medium"
                >
                  Editar Informações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        setIsEditModalOpen(open);
        if (!open) {
          setSelectedArrematante(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Editar Arrematante
            </DialogTitle>
            <DialogDescription>
              Edite as informações do arrematante
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Formulário de edição */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="edit-nome" className="text-sm font-medium text-gray-700">
                  Nome do Arrematante
                </Label>
                <Input
                  id="edit-nome"
                  value={editForm.nome}
                  onChange={(e) => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
                  className="mt-1 h-11 border-gray-300 bg-white no-focus-outline"
                  placeholder="Nome completo do arrematante"
                />
              </div>

              <div>
                <Label htmlFor="edit-email" className="text-sm font-medium text-gray-700">
                  Email (Opcional)
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 h-11 border-gray-300 bg-white no-focus-outline"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <Label htmlFor="edit-valor" className="text-sm font-medium text-gray-700">
                  Valor a Ser Pago
                </Label>
                <Input
                  id="edit-valor"
                  value={editForm.valorPagar}
                  onChange={(e) => setEditForm(prev => ({ ...prev, valorPagar: e.target.value }))}
                  className="mt-1 h-11 border-gray-300 bg-white no-focus-outline"
                  placeholder="R$ 0,00"
                />
              </div>
            </div>

            {/* Informações do Tipo de Pagamento */}
            {selectedArrematante && (() => {
              const auction = auctions.find(a => a.id === selectedArrematante.leilaoId);
              const loteArrematado = auction?.lotes?.find(lote => lote.id === selectedArrematante.loteId);
              const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento || "parcelamento";
              
              return (
                <div className="border-t border-gray-200 pt-4">
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">Informações de Pagamento</Label>
                  
                  {tipoPagamento === "a_vista" && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-gray-600" />
                        <span className="font-medium text-gray-800">Pagamento À Vista</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        <strong>Data de vencimento:</strong> {' '}
                        {(loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista) ? 
                          new Date((loteArrematado?.dataVencimentoVista || auction?.dataVencimentoVista) + 'T00:00:00').toLocaleDateString('pt-BR') 
                          : 'Não definida'}
                      </p>
                    </div>
                  )}

                  {tipoPagamento === "entrada_parcelamento" && (
                    <div className="space-y-3">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="h-5 w-5 text-gray-600" />
                          <span className="font-medium text-gray-800">Entrada + Parcelamento</span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-700">
                          <p><strong>Data da entrada:</strong> {(loteArrematado?.dataEntrada || auction?.dataEntrada) ? 
                            new Date((loteArrematado?.dataEntrada || auction?.dataEntrada) + 'T00:00:00').toLocaleDateString('pt-BR') 
                            : 'Não definida'}</p>
                          <p><strong>Parcelas:</strong> {selectedArrematante.quantidadeParcelas}x de R$ {(() => {
                            const valorTotal = selectedArrematante.valorPagarNumerico || 0;
                            const valorEntrada = selectedArrematante.valorEntrada ? parseCurrencyToNumber(selectedArrematante.valorEntrada) : 0;
                            const valorParcelas = valorTotal - valorEntrada;
                            const valorPorParcela = valorParcelas / selectedArrematante.quantidadeParcelas;
                            return valorPorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()} • Vence dia {selectedArrematante.diaVencimentoMensal}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {tipoPagamento === "parcelamento" && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5 text-purple-600" />
                        <span className="font-medium text-purple-800">Parcelamento</span>
                      </div>
                      <div className="space-y-1 text-sm text-purple-700">
                        <p><strong>Parcelas:</strong> {selectedArrematante.quantidadeParcelas}x de R$ {(selectedArrematante.valorPagarNumerico / selectedArrematante.quantidadeParcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p><strong>Vencimento:</strong> Todo dia {selectedArrematante.diaVencimentoMensal} • {(() => {
                          const auction = auctions.find(a => a.arrematante && a.arrematante.nome === selectedArrematante.nome);
                          const loteArrematado = auction?.lotes?.find((lote: any) => lote.id === selectedArrematante.loteId);
                          const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento || "parcelamento";
                          const parcelasPagas = selectedArrematante.parcelasPagas || 0;
                          const quantidadeParcelas = selectedArrematante.quantidadeParcelas || 0;
                          
                          if (tipoPagamento === "entrada_parcelamento") {
                            const totalParcelas = 1 + quantidadeParcelas;
                            return `${parcelasPagas} de ${totalParcelas} pagas`;
                          } else {
                            return `${parcelasPagas} de ${quantidadeParcelas} pagas`;
                          }
                        })()}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Documentos */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Documentos</Label>
              
              {/* Lista de documentos */}
              {editForm.documentos.length > 0 && (
                <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                  {editForm.documentos.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-md">
                      {getFileIcon(doc.tipo)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.nome}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(doc.tamanho)} • {new Date(doc.dataUpload).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {doc.url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (doc.url) {
                                if (doc.url.startsWith('data:')) {
                                  // Para base64, abrir em nova aba com visualização inline
                                  const newWindow = window.open('', '_blank');
                                  if (newWindow) {
                                    if (doc.tipo.includes('pdf')) {
                                      newWindow.document.write(`
                                        <html>
                                          <head><title>${doc.nome}</title></head>
                                          <body style="margin:0; background:#000;">
                                            <embed src="${doc.url}" width="100%" height="100%" type="application/pdf" />
                                          </body>
                                        </html>
                                      `);
                                    } else if (doc.tipo.includes('image')) {
                                      newWindow.document.write(`
                                        <html>
                                          <head><title>${doc.nome}</title></head>
                                          <body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center; height:100vh;">
                                            <img src="${doc.url}" style="max-width:100%; max-height:100%; object-fit:contain;" />
                                          </body>
                                        </html>
                                      `);
                                    } else {
                                      // Para outros tipos de documento, tentar abrir diretamente
                                      newWindow.location.href = doc.url;
                                    }
                                  }
                                } else {
                                  // Para URLs blob, abrir diretamente
                                  window.open(doc.url, '_blank');
                                }
                              }
                            }}
                            className="h-7 w-7 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                            title="Visualizar arquivo"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDocument(doc.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Remover arquivo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Área de upload */}
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="text-center">
                  <Paperclip className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-900 mb-1">Adicionar documentos</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Arraste arquivos aqui ou clique para selecionar
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('file-upload-edit')?.click()}
                      className="h-9 px-4 border-gray-300 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Selecionar Arquivos
                    </Button>
                  </div>
                  <input
                    id="file-upload-edit"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (máx. 10MB cada)
                  </p>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="h-11 px-6 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-black"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit || !editForm.nome || !editForm.valorPagar}
                className="h-11 px-6 bg-black hover:bg-gray-800 text-white font-medium disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 btn-save-click"
              >
                {isSavingEdit ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </div>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </div>
          </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Pagamentos */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-lg font-medium text-gray-900">
                Confirmação de Pagamentos
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                {selectedArrematanteForPayment && (() => {
                  const auction = auctions.find(a => a.id === selectedArrematanteForPayment.leilaoId);
                  const loteArrematado = auction?.lotes?.find(lote => lote.id === selectedArrematanteForPayment.loteId);
                  const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento || "parcelamento";
                  
                  if (tipoPagamento === "a_vista") {
                    return `${selectedArrematanteForPayment.nome} • Pagamento à Vista`;
                  } else {
                    const auction = auctions.find(a => a.arrematante && a.arrematante.nome === selectedArrematanteForPayment.nome);
                    const loteArrematado = auction?.lotes?.find((lote: any) => lote.id === selectedArrematanteForPayment.loteId);
                    const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento || "parcelamento";
                    
                    if (tipoPagamento === "entrada_parcelamento") {
                      // Para entrada + parcelamento, o total já inclui a entrada
                      return `${selectedArrematanteForPayment.nome} • ${paymentMonths.filter(m => m.paid).length}/${paymentMonths.length} pagas`;
                  } else {
                    return `${selectedArrematanteForPayment.nome} • ${paymentMonths.filter(m => m.paid).length}/${paymentMonths.length} pagas`;
                    }
                  }
                })()}
              </DialogDescription>
            </DialogHeader>

            {selectedArrematanteForPayment && (
              <div className="space-y-4">
                {/* Lista de Meses Minimalista */}
                <div className="space-y-1">
                  <div className="max-h-72 overflow-y-auto">
                    {paymentMonths.map((month, index) => (
                      <div key={index} 
                           className={`flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 ${
                             month.paid ? 'bg-gray-50' : 'bg-white'
                           }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={`month-${index}`}
                            checked={month.paid}
                            onCheckedChange={(checked) => handlePaymentToggle(index, checked as boolean)}
                          />
                          <div>
                            <Label 
                              htmlFor={`month-${index}`} 
                              className="text-sm font-medium text-gray-900 cursor-pointer"
                            >
                              {month.monthName}
                            </Label>
                            <p className="text-xs text-gray-500">
                              Vence em {month.dueDate}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            R$ {(() => {
                              const auction = auctions.find(a => a.id === selectedArrematanteForPayment.leilaoId);
                              const loteArrematado = auction?.lotes?.find(lote => lote.id === selectedArrematanteForPayment.loteId);
                              const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento || "parcelamento";
                              
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
                              
                              // Verificar se a parcela está atrasada e aplicar juros
                              const now = new Date();
                              const dueDate = new Date(month.dueDate.split('/').reverse().join('-') + 'T23:59:59');
                              // Se a parcela foi paga com atraso, ainda deve mostrar o valor com juros
                              const wasOverdue = now > dueDate;
                              const isOverdue = wasOverdue && !month.paid;
                              
                              if (tipoPagamento === "a_vista") {
                                // 💰 PAGAMENTO À VISTA: Valor total com juros se atrasado ou pago com atraso
                                let valorFinal = selectedArrematanteForPayment.valorPagarNumerico;
                                
                                if (wasOverdue && selectedArrematanteForPayment.percentualJurosAtraso) {
                                  const mesesAtraso = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                                  if (mesesAtraso >= 1) {
                                    valorFinal = calcularJurosProgressivos(valorFinal, selectedArrematanteForPayment.percentualJurosAtraso, mesesAtraso);
                                  }
                                }
                                
                                return valorFinal.toLocaleString('pt-BR', { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                });
                              } else if (tipoPagamento === "entrada_parcelamento") {
                                // 💳 ENTRADA + PARCELAMENTO: Diferenciar entrada de parcelas
                                if (month.isEntrada) {
                                  // Valor da entrada com juros se atrasada
                                  let valorEntrada = selectedArrematanteForPayment.valorEntrada ? 
                                    parseCurrencyToNumber(selectedArrematanteForPayment.valorEntrada) : 0;
                                  
                                  if (wasOverdue && selectedArrematanteForPayment.percentualJurosAtraso) {
                                    const mesesAtraso = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                                    if (mesesAtraso >= 1) {
                                      valorEntrada = calcularJurosProgressivos(valorEntrada, selectedArrematanteForPayment.percentualJurosAtraso, mesesAtraso);
                                    }
                                  }
                                  
                                  return valorEntrada.toLocaleString('pt-BR', { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                  });
                                } else {
                                  // Valor de cada parcela com juros se atrasada
                                  const valorTotal = selectedArrematanteForPayment.valorPagarNumerico;
                                  const valorEntrada = selectedArrematanteForPayment.valorEntrada ? 
                                    parseCurrencyToNumber(selectedArrematanteForPayment.valorEntrada) : 0;
                                  const valorParcelas = valorTotal - valorEntrada;
                                  let valorPorParcela = valorParcelas / selectedArrematanteForPayment.quantidadeParcelas;
                                  
                                  if (wasOverdue && selectedArrematanteForPayment.percentualJurosAtraso) {
                                    const mesesAtraso = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                                    if (mesesAtraso >= 1) {
                                      valorPorParcela = calcularJurosProgressivos(valorPorParcela, selectedArrematanteForPayment.percentualJurosAtraso, mesesAtraso);
                                    }
                                  }
                                  
                                  return valorPorParcela.toLocaleString('pt-BR', { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                  });
                                }
                              } else {
                                // 📅 PARCELAMENTO SIMPLES: Valor dividido com juros se atrasado
                                let valorPorParcela = selectedArrematanteForPayment.valorPagarNumerico / selectedArrematanteForPayment.quantidadeParcelas;
                                
                                if (wasOverdue && selectedArrematanteForPayment.percentualJurosAtraso) {
                                  const mesesAtraso = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                                  if (mesesAtraso >= 1) {
                                    valorPorParcela = calcularJurosProgressivos(valorPorParcela, selectedArrematanteForPayment.percentualJurosAtraso, mesesAtraso);
                                  }
                                }
                                
                                return valorPorParcela.toLocaleString('pt-BR', { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                });
                              }
                            })()}
                          </p>
                          {month.paid && (
                            <p className={`text-xs ${
                              (() => {
                                // Verificar se pagamento foi feito com atraso
                                const today = new Date();
                                const dueDate = new Date(month.dueDate.split('/').reverse().join('-') + 'T23:59:59');
                                const isLate = today > dueDate;
                                return isLate ? 'text-red-600' : 'text-green-600';
                              })()
                            }`}>
                              {(() => {
                                // Verificar se pagamento foi feito com atraso
                                const today = new Date();
                                const dueDate = new Date(month.dueDate.split('/').reverse().join('-') + 'T23:59:59');
                                const isLate = today > dueDate;
                                return isLate ? 'Pago com atraso' : 'Pago';
                              })()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rodapé Simples */}
                <div className="flex justify-between items-center pt-4 border-gray-200">
                  <div className="text-sm text-gray-600">
                    Total: {(() => {
                      // Calcular total considerando juros das parcelas atrasadas
                      const auction = auctions.find(a => a.id === selectedArrematanteForPayment.leilaoId);
                      const loteArrematado = auction?.lotes?.find(lote => lote.id === selectedArrematanteForPayment.loteId);
                      const tipoPagamento = loteArrematado?.tipoPagamento || auction?.tipoPagamento || "parcelamento";
                      const now = new Date();
                      
                      // Função para calcular juros progressivos (mesma do modal)
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
                      
                      let totalComJuros = 0;
                      
                      paymentMonths.forEach((month) => {
                        const dueDate = new Date(month.dueDate.split('/').reverse().join('-') + 'T23:59:59');
                        const wasOverdue = now > dueDate;
                        const isOverdue = wasOverdue && !month.paid;
                        
                        if (tipoPagamento === "a_vista") {
                          let valorFinal = selectedArrematanteForPayment.valorPagarNumerico;
                          if (wasOverdue && selectedArrematanteForPayment.percentualJurosAtraso) {
                            const mesesAtraso = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                            if (mesesAtraso >= 1) {
                              valorFinal = calcularJurosProgressivos(valorFinal, selectedArrematanteForPayment.percentualJurosAtraso, mesesAtraso);
                            }
                          }
                          totalComJuros += valorFinal;
                        } else if (tipoPagamento === "entrada_parcelamento") {
                          if (month.isEntrada) {
                            let valorEntrada = selectedArrematanteForPayment.valorEntrada ? 
                              parseCurrencyToNumber(selectedArrematanteForPayment.valorEntrada) : 0;
                            if (wasOverdue && selectedArrematanteForPayment.percentualJurosAtraso) {
                              const mesesAtraso = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                              if (mesesAtraso >= 1) {
                                valorEntrada = calcularJurosProgressivos(valorEntrada, selectedArrematanteForPayment.percentualJurosAtraso, mesesAtraso);
                              }
                            }
                            totalComJuros += valorEntrada;
                          } else {
                            const valorTotal = selectedArrematanteForPayment.valorPagarNumerico;
                            const valorEntrada = selectedArrematanteForPayment.valorEntrada ? 
                              parseCurrencyToNumber(selectedArrematanteForPayment.valorEntrada) : 0;
                            const valorParcelas = valorTotal - valorEntrada;
                            let valorPorParcela = valorParcelas / selectedArrematanteForPayment.quantidadeParcelas;
                            if (wasOverdue && selectedArrematanteForPayment.percentualJurosAtraso) {
                              const mesesAtraso = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                              if (mesesAtraso >= 1) {
                                valorPorParcela = calcularJurosProgressivos(valorPorParcela, selectedArrematanteForPayment.percentualJurosAtraso, mesesAtraso);
                              }
                            }
                            totalComJuros += valorPorParcela;
                          }
                        } else {
                          let valorPorParcela = selectedArrematanteForPayment.valorPagarNumerico / selectedArrematanteForPayment.quantidadeParcelas;
                          if (wasOverdue && selectedArrematanteForPayment.percentualJurosAtraso) {
                            const mesesAtraso = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                            if (mesesAtraso >= 1) {
                              valorPorParcela = calcularJurosProgressivos(valorPorParcela, selectedArrematanteForPayment.percentualJurosAtraso, mesesAtraso);
                            }
                          }
                          totalComJuros += valorPorParcela;
                        }
                      });
                      
                      return `R$ ${totalComJuros.toLocaleString('pt-BR', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}`;
                    })()}
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsPaymentModalOpen(false);
                        setSelectedArrematanteForPayment(null);
                        setPaymentMonths([]);
                      }}
                      className="hover:bg-gray-100 hover:text-gray-800"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSavePayments}
                      className="bg-black hover:bg-gray-800 text-white btn-save-click"
                    >
                      Confirmar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Edição Completa */}
        <Dialog open={isFullEditModalOpen} onOpenChange={(open) => {
          if (!open) {
            handleCloseFullEdit();
          }
        }}>
          <DialogContent 
            className="max-w-6xl max-h-[90vh] overflow-y-auto"
            onEscapeKeyDown={(e) => {
              handleCloseFullEdit();
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Editar Arrematante - Informações Completas
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                {selectedArrematanteForFullEdit && (
                  <span className="font-medium">
                    {auctions.find(a => a.id === selectedArrematanteForFullEdit.leilaoId)?.nome}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <style>{`
                .arrematante-form input:focus {
                  border-color: #111827 !important;
                  box-shadow: none !important;
                  outline: none !important;
                }
                .arrematante-form [data-radix-select-trigger]:focus {
                  border-color: #d1d5db !important;
                  box-shadow: none !important;
                  outline: none !important;
                }
                .arrematante-form *:focus {
                  box-shadow: none !important;
                }
              `}</style>
              
              <div className="arrematante-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nome */}
                  <div>
                    <Label htmlFor="full-edit-nome" className="text-sm font-medium text-gray-700">Nome do Arrematante</Label>
                    <Input
                      id="full-edit-nome"
                      type="text"
                      value={fullEditForm.nome}
                      onChange={(e) => handleFullEditFormChange("nome", e.target.value)}
                      className="h-10"
                      placeholder="Digite o nome completo"
                    />
                  </div>

                  {/* Documento */}
                  <div>
                    <Label htmlFor="full-edit-documento" className="text-sm font-medium text-gray-700">Documento (CPF/CNPJ)</Label>
                    <Input
                      id="full-edit-documento"
                      type="text"
                      value={fullEditForm.documento}
                      onChange={(e) => handleFullEditFormChange("documento", e.target.value)}
                      className="h-10"
                      placeholder="Digite o CPF ou CNPJ"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div>
                    <Label htmlFor="full-edit-email" className="text-sm font-medium text-gray-700">Email</Label>
                    <Input
                      id="full-edit-email"
                      type="email"
                      value={fullEditForm.email}
                      onChange={(e) => handleFullEditFormChange("email", e.target.value)}
                      className="h-10"
                      placeholder="exemplo@email.com"
                    />
                  </div>

                  {/* Telefone */}
                  <div>
                    <Label htmlFor="full-edit-telefone" className="text-sm font-medium text-gray-700">Telefone</Label>
                    <Input
                      id="full-edit-telefone"
                      type="text"
                      value={fullEditForm.telefone}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        handleFullEditFormChange("telefone", formatted);
                      }}
                      className="h-10"
                      placeholder="+55 (11) 99999-9999"
                    />
                  </div>
                </div>

                {/* Endereço */}
                <div>
                  <Label htmlFor="full-edit-endereco" className="text-sm font-medium text-gray-700">Endereço Completo</Label>
                  <Input
                    id="full-edit-endereco"
                    type="text"
                    value={fullEditForm.endereco}
                    onChange={(e) => handleFullEditFormChange("endereco", e.target.value)}
                    className="h-10"
                    placeholder="Rua, número, bairro, cidade, CEP"
                  />
                </div>

                {/* Lote Arrematado */}
                {selectedArrematanteForFullEdit && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Lote Arrematado</Label>
                    <Select
                      value={fullEditForm.loteId}
                      onValueChange={(value) => handleFullEditFormChange("loteId", value)}
                    >
                      <SelectTrigger className="h-10 focus:!ring-0 focus:!ring-offset-0 focus:!border-gray-300 focus:!outline-none focus:!shadow-none">
                        <SelectValue placeholder="Selecione o lote arrematado" />
                      </SelectTrigger>
                      <SelectContent>
                        {auctions
                          .find(a => a.id === selectedArrematanteForFullEdit.leilaoId)?.lotes
                          ?.map((lote) => (
                            <SelectItem key={lote.id} value={lote.id}>
                              Lote {lote.numero} - {lote.descricao}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                )}

{/* Configurações de Pagamento baseadas no tipo do lote arrematado (prioridade) ou do leilão */}
                {(() => {
                  const currentAuction = selectedArrematanteForFullEdit ? 
                    auctions.find(a => a.id === selectedArrematanteForFullEdit.leilaoId) : null;
                  
                  // Obter o lote arrematado para verificar se tem configurações específicas
                  const loteArrematado = currentAuction?.lotes?.find(lote => lote.id === selectedArrematanteForFullEdit?.loteId);
                  
                  // Priorizar tipoPagamento do lote, senão usar do leilão
                  const tipoPagamento = loteArrematado?.tipoPagamento || currentAuction?.tipoPagamento || "parcelamento";

                  return (
                    <>
                      {/* Valor a Pagar */}
                      <div>
                        <Label htmlFor="full-edit-valor" className="text-sm font-medium text-gray-700">
                          Valor a Ser Pago
                        </Label>
                        <Input
                          id="full-edit-valor"
                          type="text"
                          value={fullEditForm.valorPagar}
                          onChange={(e) => handleFullEditFormChange("valorPagar", e.target.value)}
                          className="h-10"
                          placeholder="R$ 0,00"
                        />
                      </div>

                      {/* Configurações específicas por tipo de pagamento */}
                      {tipoPagamento === "a_vista" && (
                        <div className="border-t border-gray-200 pt-4">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Configuração de Pagamento À Vista</h3>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <DollarSign className="h-5 w-5 text-gray-600" />
                              <span className="font-medium text-gray-800">Pagamento À Vista</span>
                            </div>
                            <p className="text-sm text-gray-700">
                              <strong>Data de vencimento:</strong> {' '}
                              <span className="font-semibold">
                                {(loteArrematado?.dataVencimentoVista || currentAuction?.dataVencimentoVista) ? 
                                  new Date((loteArrematado?.dataVencimentoVista || currentAuction?.dataVencimentoVista) + 'T00:00:00').toLocaleDateString('pt-BR') 
                                  : 'Não definida'}
                              </span>
                            </p>
                          </div>
                        </div>
                      )}

                      {tipoPagamento === "entrada_parcelamento" && (
                        <div className="border-t border-gray-200 pt-4">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Configuração de Entrada + Parcelamento</h3>
                          
                          {/* Configuração da entrada */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-5 w-5 text-gray-600" />
                              <h4 className="font-medium text-gray-800">Configuração da Entrada</h4>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Data de Vencimento da Entrada</Label>
                                <StringDatePicker
                                  value={(loteArrematado?.dataEntrada || currentAuction?.dataEntrada) || ""}
                                  onChange={(value) => {
                                    // Aqui você pode implementar a lógica para salvar a data de entrada
                                    // Por enquanto, vamos manter como read-only mostrando a data configurada
                                    console.log('Data de entrada alterada:', value);
                                  }}
                                  placeholder="dd/mm/aaaa"
                                  disabled={true} // Manter como read-only por enquanto
                                  className="bg-gray-100"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Data configurada no leilão/lote
                                </p>
                              </div>
                              
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Valor da Entrada</Label>
                                <Input
                                  type="text"
                                  value={fullEditForm.valorEntrada}
                                  onChange={(e) => {
                                    let value = e.target.value.replace(/[^\d]/g, '');
                                    if (value) {
                                      value = (parseInt(value) / 100).toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                      });
                                    }
                                    handleFullEditFormChange("valorEntrada", value);
                                  }}
                                  placeholder="R$ 0,00"
                                  className="w-full"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Configurações das parcelas */}
                          <div className="space-y-4">
                            <h4 className="font-medium text-gray-800">Configuração das Parcelas (após entrada)</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Dia Vencimento das Parcelas</Label>
                                <Select
                                  value={fullEditForm.diaVencimentoMensal.toString()}
                                  onValueChange={(value) => handleFullEditFormChange("diaVencimentoMensal", parseInt(value))}
                                >
                                  <SelectTrigger className="h-10 focus:!ring-0 focus:!ring-offset-0 focus:!border-gray-300 focus:!outline-none focus:!shadow-none">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                      <SelectItem key={day} value={day.toString()}>
                                        Dia {day}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-sm font-medium text-gray-700">Mês de Início das Parcelas</Label>
                                <Select
                                  value={fullEditForm.mesInicioPagamento}
                                  onValueChange={(value) => handleFullEditFormChange("mesInicioPagamento", value)}
                                >
                                  <SelectTrigger className="h-10 focus:!ring-0 focus:!ring-offset-0 focus:!border-gray-300 focus:!outline-none focus:!shadow-none">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => {
                                      const currentYear = new Date().getFullYear();
                                      const monthValue = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
                                      const monthName = new Date(currentYear, i, 1).toLocaleDateString('pt-BR', { month: 'long' });
                                      return (
                                        <SelectItem key={monthValue} value={monthValue}>
                                          {monthName.charAt(0).toUpperCase() + monthName.slice(1)} de {currentYear}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="full-edit-parcelas" className="text-sm font-medium text-gray-700">
                                  Quantidade de Parcelas (após entrada)
                                </Label>
                                <Input
                                  id="full-edit-parcelas"
                                  type="number"
                                  value={fullEditForm.quantidadeParcelas}
                                  onChange={(e) => handleFullEditFormChange("quantidadeParcelas", parseInt(e.target.value) || 1)}
                                  className="h-10"
                                  min="1"
                                  max="60"
                                />
                              </div>

                              <div>
                                <Label htmlFor="full-edit-pagas" className="text-sm font-medium text-gray-700">
                                  Parcelas Pagas
                                </Label>
                                <Input
                                  id="full-edit-pagas"
                                  type="number"
                                  value={fullEditForm.parcelasPagas}
                                  onChange={(e) => handleFullEditFormChange("parcelasPagas", parseInt(e.target.value) || 0)}
                                  className="h-10"
                                  min="0"
                                  max={fullEditForm.quantidadeParcelas}
                                />
                              </div>
                            </div>

                            {/* Valor por Parcela */}
                            <div>
                              <Label className="text-sm font-medium text-gray-700">Valor por Parcela (após entrada)</Label>
                              <div className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                                <span>
                                  {fullEditForm.valorPagar && fullEditForm.quantidadeParcelas > 0 
                                    ? `R$ ${(() => {
                                      const valorTotal = parseCurrencyToNumber(fullEditForm.valorPagar);
                                      const valorEntrada = fullEditForm.valorEntrada ? parseCurrencyToNumber(fullEditForm.valorEntrada) : 0;
                                      const valorParcelas = valorTotal - valorEntrada;
                                      const valorPorParcela = valorParcelas / fullEditForm.quantidadeParcelas;
                                      return valorPorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    })()}`
                                    : 'R$ 0,00'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {tipoPagamento === "parcelamento" && (
                        <div className="border-t border-gray-200 pt-4">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Configuração de Parcelamento</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700">Dia Vencimento</Label>
                              <Select
                                value={fullEditForm.diaVencimentoMensal.toString()}
                                onValueChange={(value) => handleFullEditFormChange("diaVencimentoMensal", parseInt(value))}
                              >
                                <SelectTrigger className="h-10 focus:!ring-0 focus:!ring-offset-0 focus:!border-gray-300 focus:!outline-none focus:!shadow-none">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                    <SelectItem key={day} value={day.toString()}>
                                      Dia {day}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-gray-700">Mês de Início do Pagamento</Label>
                              <Select
                                value={fullEditForm.mesInicioPagamento}
                                onValueChange={(value) => handleFullEditFormChange("mesInicioPagamento", value)}
                              >
                                <SelectTrigger className="h-10 focus:!ring-0 focus:!ring-offset-0 focus:!border-gray-300 focus:!outline-none focus:!shadow-none">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 12 }, (_, i) => {
                                    const currentYear = new Date().getFullYear();
                                    const monthValue = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
                                    const monthName = new Date(currentYear, i, 1).toLocaleDateString('pt-BR', { month: 'long' });
                                    return (
                                      <SelectItem key={monthValue} value={monthValue}>
                                        {monthName.charAt(0).toUpperCase() + monthName.slice(1)} de {currentYear}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <Label htmlFor="full-edit-parcelas" className="text-sm font-medium text-gray-700">Quantidade de Parcelas</Label>
                              <Input
                                id="full-edit-parcelas"
                                type="number"
                                value={fullEditForm.quantidadeParcelas}
                                onChange={(e) => handleFullEditFormChange("quantidadeParcelas", parseInt(e.target.value) || 1)}
                                className="h-10"
                                min="1"
                                max="60"
                              />
                            </div>

                            <div>
                              <Label htmlFor="full-edit-pagas" className="text-sm font-medium text-gray-700">Parcelas Pagas</Label>
                              <Input
                                id="full-edit-pagas"
                                type="number"
                                value={fullEditForm.parcelasPagas}
                                onChange={(e) => handleFullEditFormChange("parcelasPagas", parseInt(e.target.value) || 0)}
                                className="h-10"
                                min="0"
                                max={fullEditForm.quantidadeParcelas}
                              />
                            </div>
                          </div>

                          {/* Valor por Parcela */}
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Valor por Parcela</Label>
                            <div className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                              <span>
                                {fullEditForm.valorPagar && fullEditForm.quantidadeParcelas > 0 
                                  ? `R$ ${(parseCurrencyToNumber(fullEditForm.valorPagar) / fullEditForm.quantidadeParcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : 'R$ 0,00'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Documentos */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Documentos do Arrematante</h3>
                
                {/* Lista de documentos */}
                {fullEditForm.documentos.length > 0 && (
                  <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-md max-h-40 overflow-y-auto mb-4">
                    {fullEditForm.documentos.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-md">
                        {getFileIcon(doc.tipo)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.nome}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(doc.tamanho)} • {new Date(doc.dataUpload).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {doc.url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (doc.url) {
                                  if (doc.url.startsWith('data:')) {
                                    // Para base64, abrir em nova aba com visualização inline
                                    const newWindow = window.open('', '_blank');
                                    if (newWindow) {
                                      if (doc.tipo.includes('pdf')) {
                                        newWindow.document.write(`
                                          <html>
                                            <head><title>${doc.nome}</title></head>
                                            <body style="margin:0; background:#000;">
                                              <embed src="${doc.url}" width="100%" height="100%" type="application/pdf" />
                                            </body>
                                          </html>
                                        `);
                                      } else {
                                        newWindow.document.write(`
                                          <html>
                                            <head><title>${doc.nome}</title></head>
                                            <body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center; height:100vh;">
                                              <img src="${doc.url}" style="max-width:100%; max-height:100%; object-fit:contain;" />
                                            </body>
                                          </html>
                                        `);
                                      }
                                    }
                                  } else {
                                    // Para URLs blob, abrir diretamente
                                    window.open(doc.url, '_blank');
                                  }
                                }
                              }}
                              className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                              title="Visualizar documento"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFullEditDocument(doc.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800"
                            title="Remover documento"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Área de Upload */}
                <div
                  className="mt-3 border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-gray-400 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleFullEditDrop(e)}
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload-full-edit" className="cursor-pointer">
                      <span className="text-sm font-medium text-gray-900">Arraste arquivos aqui ou clique para selecionar</span>
                    </label>
                    <input
                      id="file-upload-full-edit"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                      onChange={handleFullEditFileUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (máx. 10MB cada)
                    </p>
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  onClick={handleCloseFullEdit}
                  className="border-gray-300 text-black hover:bg-gray-50 hover:text-black hover:border-gray-300 focus:ring-0 focus:ring-offset-0"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveFullEdit}
                  disabled={isSavingFullEdit}
                  className="bg-black hover:bg-gray-800 text-white disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isSavingFullEdit ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </div>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Exportação */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Exportar Relatório de Arrematante</DialogTitle>
            <DialogDescription>
              Selecione um arrematante para gerar e baixar o relatório em PDF
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
                  <SelectValue placeholder="Escolha um arrematante para exportar" />
                </SelectTrigger>
                <SelectContent>
                  {filteredArrematantes.map((arrematante) => (
                    <SelectItem key={arrematante.id} value={arrematante.id}>
                      {arrematante.nome} - {arrematante.leilaoNome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview do PDF */}
            {selectedArrematanteForExport && (
              <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                <ArrematantePdfReport 
                  arrematante={filteredArrematantes.find(a => a.id === selectedArrematanteForExport)!} 
                />
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
                onClick={() => generateArrematantePDF(selectedArrematanteForExport)}
                disabled={!selectedArrematanteForExport}
                  className="flex-1 bg-black hover:bg-gray-800 text-white btn-download-click"
              >
                <Download className="h-4 w-4 mr-2" />
                Gerar e Baixar PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    );
  }

// Componente para o relatório PDF do arrematante
const ArrematantePdfReport = ({ arrematante }: { arrematante: ArrematanteExtendido }) => {
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

  const formatCurrency = (value: string | number | undefined) => {
    if (!value && value !== 0) return 'R$ 0,00';
    
    let numericValue: number;
    
    if (typeof value === 'string') {
      // Limpa a string e converte para número
      const cleanValue = value.replace(/[^\d.,]/g, '');
      
      // Se contém vírgula, assume formato brasileiro (ex: 90.000,00 ou 90000,00)
      if (cleanValue.includes(',')) {
        // Remove pontos (separadores de milhares) e troca vírgula por ponto
        numericValue = parseFloat(cleanValue.replace(/\./g, '').replace(',', '.'));
      } else {
        // Se não tem vírgula, assume formato americano ou número inteiro
        numericValue = parseFloat(cleanValue);
      }
      
      if (isNaN(numericValue)) return 'R$ 0,00';
    } else {
      numericValue = value;
    }
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numericValue);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    try {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  const getDocumentType = (documento: string) => {
    if (!documento) return 'Documento';
    const cleanDoc = documento.replace(/[^\d]/g, '');
    return cleanDoc.length === 11 ? 'CPF' : cleanDoc.length === 14 ? 'CNPJ' : 'Documento';
  };

  const formatMonthYear = (monthString: string) => {
    if (!monthString) return 'Não informado';
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div id="arrematante-pdf-content" className="p-8 bg-white text-black" style={{ pageBreakInside: 'avoid' }}>
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-300 pb-6 break-inside-avoid" style={{ pageBreakInside: 'avoid', pageBreakAfter: 'avoid' }}>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
          RELATÓRIO DETALHADO DE ARREMATANTE
          <span className="block text-lg font-medium text-gray-600 mt-2">
            {arrematante.nome}
          </span>
        </h1>
        <p className="text-sm text-gray-500 mt-4">
          Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>

      {/* Informações Pessoais */}
      <div className="mb-8 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
          Dados Pessoais
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <strong>Nome Completo:</strong> {arrematante.nome || 'Não informado'}
          </div>
          <div>
            <strong>{getDocumentType(arrematante.documento)}:</strong> {arrematante.documento || 'Não informado'}
          </div>
          <div className="col-span-2">
            <strong>Endereço Completo:</strong> {arrematante.endereco || 'Não informado'}
          </div>
          <div>
            <strong>E-mail:</strong> {arrematante.email || 'Não informado'}
          </div>
          <div>
            <strong>Telefone:</strong> {arrematante.telefone || 'Não informado'}
          </div>
        </div>
      </div>

      {/* Informações do Leilão */}
      <div className="mb-8 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
          Dados do Leilão
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <strong>Nome do Leilão:</strong> {arrematante.leilaoNome || 'Não informado'}
          </div>
          <div>
            <strong>Data de Realização:</strong> {formatDate(arrematante.dataLeilao)}
          </div>
          <div className="col-span-2">
            <strong>Status do Pagamento:</strong>{' '}
            <span className={`font-semibold ${
              arrematante.statusPagamento === 'pago' ? 'text-green-600' :
              arrematante.statusPagamento === 'pendente' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {arrematante.statusPagamento === 'pago' ? 'PAGO' :
               arrematante.statusPagamento === 'pendente' ? 'PENDENTE' : 'EM ATRASO'}
            </span>
          </div>
        </div>
      </div>

      {/* Informações Financeiras */}
      <div className="mb-8 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
          Informações Financeiras
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <strong className="block text-gray-700 mb-2">Valor Total a Pagar:</strong>
            <span className="text-xl font-semibold text-gray-900">
              {(() => {
                const valorTotal = typeof arrematante.valorPagar === 'string' 
                  ? parseFloat(arrematante.valorPagar.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'))
                  : parseFloat(arrematante.valorPagar);
                const valorPorParcela = valorTotal / (arrematante.quantidadeParcelas || 1);
                const [startYear, startMonth] = (arrematante.mesInicioPagamento || '').split('-').map(Number);
                const percentualJuros = arrematante.percentualJurosAtraso || 0;
                
                if (!startYear || !startMonth) return formatCurrency(valorTotal);
                
                let valorTotalComJuros = 0;
                for (let i = 0; i < (arrematante.quantidadeParcelas || 0); i++) {
                  const dataVencimento = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal || 15);
                  const dataVencimentoStr = dataVencimento.toISOString().split('T')[0];
                  valorTotalComJuros += calcularJurosProgressivos(valorPorParcela, dataVencimentoStr, percentualJuros);
                }
                
                const temJuros = valorTotalComJuros > valorTotal;
                return (
                  <div>
                    <div>{formatCurrency(valorTotalComJuros)}</div>
                    {temJuros && (
                      <div className="text-xs text-red-600 mt-1">
                        (+ {formatCurrency(valorTotalComJuros - valorTotal)} juros)
                      </div>
                    )}
                  </div>
                );
              })()}
            </span>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <strong className="block text-gray-700 mb-2">Valor por Parcela:</strong>
            <span className="text-xl font-semibold text-gray-900">
              {(() => {
                const valorTotal = typeof arrematante.valorPagar === 'string' 
                  ? parseFloat(arrematante.valorPagar.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'))
                  : parseFloat(arrematante.valorPagar);
                const valorPorParcela = valorTotal / (arrematante.quantidadeParcelas || 1);
                return formatCurrency(valorPorParcela);
              })()}
            </span>
          </div>
          <div>
            <strong>Status de Quitação:</strong> {arrematante.pago ? 'QUITADO' : 'EM ABERTO'}
          </div>
          <div>
            <strong>Valor Restante:</strong>{' '}
            {arrematante.pago ? 
              'R$ 0,00' : 
              (() => {
                const valorTotal = typeof arrematante.valorPagar === 'string' 
                  ? parseFloat(arrematante.valorPagar.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'))
                  : parseFloat(arrematante.valorPagar);
                const valorPorParcela = valorTotal / (arrematante.quantidadeParcelas || 1);
                const [startYear, startMonth] = (arrematante.mesInicioPagamento || '').split('-').map(Number);
                const percentualJuros = arrematante.percentualJurosAtraso || 0;
                const parcelasPagas = arrematante.parcelasPagas || 0;
                
                if (!startYear || !startMonth) {
                  const valorRestante = valorTotal - (parcelasPagas * valorPorParcela);
                  return formatCurrency(valorRestante);
                }
                
                let valorRestante = 0;
                for (let i = parcelasPagas; i < (arrematante.quantidadeParcelas || 0); i++) {
                  const dataVencimento = new Date(startYear, startMonth - 1 + i, arrematante.diaVencimentoMensal || 15);
                  const dataVencimentoStr = dataVencimento.toISOString().split('T')[0];
                  valorRestante += calcularJurosProgressivos(valorPorParcela, dataVencimentoStr, percentualJuros);
                }
                
                return formatCurrency(valorRestante);
              })()
            }
          </div>
        </div>
      </div>

      {/* Configuração de Parcelas */}
      <div className="mb-8 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
          Parcelamento e Cronograma
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <strong>Total de Parcelas:</strong> {arrematante.quantidadeParcelas || 'Não informado'}
          </div>
          <div>
            <strong>Parcelas Pagas:</strong>{' '}
            <span className="font-semibold text-black">
              {arrematante.parcelasPagas || 0} de {arrematante.quantidadeParcelas || 0}
            </span>
          </div>
          <div>
            <strong>Dia de Vencimento:</strong> Todo dia {arrematante.diaVencimentoMensal || 'Não definido'}
          </div>
          <div>
            <strong>Mês de Início:</strong> {formatMonthYear(arrematante.mesInicioPagamento)}
          </div>
          <div className="col-span-2">
            <strong>Progresso do Pagamento:</strong>
            <div className="mt-2 bg-gray-200 rounded-full h-4">
              <div 
                className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((arrematante.parcelasPagas || 0) / (arrematante.quantidadeParcelas || 1)) * 100}%` 
                }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {Math.round(((arrematante.parcelasPagas || 0) / (arrematante.quantidadeParcelas || 1)) * 100)}% concluído
            </p>
          </div>
        </div>
      </div>

      {/* Detalhamento de Parcelas */}
      {arrematante.quantidadeParcelas && arrematante.quantidadeParcelas > 0 && arrematante.mesInicioPagamento && (
        <div className="mb-8 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
            Detalhamento de Parcelas
          </h2>
          <div className="space-y-2">
            {(() => {
              const valorTotal = typeof arrematante.valorPagar === 'string' 
                ? parseFloat(arrematante.valorPagar.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'))
                : parseFloat(arrematante.valorPagar);
              const valorPorParcela = valorTotal / (arrematante.quantidadeParcelas || 1);
              const [startYear, startMonth] = arrematante.mesInicioPagamento.split('-').map(Number);
              const percentualJuros = arrematante.percentualJurosAtraso || 0;
              
              return Array.from({ length: arrematante.quantidadeParcelas }, (_, index) => {
                const isPaga = index < (arrematante.parcelasPagas || 0);
                const dataVencimento = new Date(startYear, startMonth - 1 + index, arrematante.diaVencimentoMensal || 15);
                const dataVencimentoStr = dataVencimento.toISOString().split('T')[0];
                const valorComJuros = calcularJurosProgressivos(valorPorParcela, dataVencimentoStr, percentualJuros);
                const temJuros = valorComJuros > valorPorParcela;
                
                return (
                  <div key={index} className={`p-3 rounded border ${isPaga ? 'bg-green-50 border-green-200' : temJuros ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {isPaga && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                        {!isPaga && temJuros && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
                        {!isPaga && !temJuros && <div className="w-2 h-2 bg-gray-400 rounded-full"></div>}
                        <span className="font-medium text-gray-800">
                          {index + 1}ª Parcela
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(temJuros && !isPaga ? valorComJuros : valorPorParcela)}
                        </div>
                        {temJuros && !isPaga && (
                          <div className="text-xs text-red-600">
                            (+ {formatCurrency(valorComJuros - valorPorParcela)} juros)
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-gray-600 flex justify-between">
                      <span>Vence em: {dataVencimento.toLocaleDateString('pt-BR')}</span>
                      <span className={`font-medium ${isPaga ? 'text-green-600' : temJuros ? 'text-red-600' : 'text-yellow-600'}`}>
                        {isPaga ? 'PAGA' : temJuros ? 'ATRASADA' : 'PENDENTE'}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Histórico de Pagamentos (se disponível) */}
      {arrematante.parcelasPagas && arrematante.parcelasPagas > 0 && (
        <div className="mb-8 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
            Resumo dos Pagamentos
          </h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <strong className="text-green-800">Parcelas Quitadas</strong>
            </div>
            <p className="text-green-700">
              {arrematante.parcelasPagas} parcela{arrematante.parcelasPagas > 1 ? 's' : ''} de{' '}
              {(() => {
                const valorTotal = typeof arrematante.valorPagar === 'string' 
                  ? parseFloat(arrematante.valorPagar.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'))
                  : parseFloat(arrematante.valorPagar);
                const valorPorParcela = valorTotal / (arrematante.quantidadeParcelas || 1);
                return formatCurrency(valorPorParcela);
              })()}{' '}
              cada, totalizando{' '}
              {(() => {
                const valorTotal = typeof arrematante.valorPagar === 'string' 
                  ? parseFloat(arrematante.valorPagar.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'))
                  : parseFloat(arrematante.valorPagar);
                const valorPorParcela = valorTotal / (arrematante.quantidadeParcelas || 1);
                const totalPago = (arrematante.parcelasPagas || 0) * valorPorParcela;
                return formatCurrency(totalPago);
              })()}
            </p>
          </div>
        </div>
      )}

      {/* Observações */}
      <div className="mb-8 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
          Informações Adicionais
        </h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-700">
            Este relatório foi gerado com base nos dados cadastrais e transações registradas no sistema.
            Todas as informações financeiras estão atualizadas até a data de geração deste documento.
            {arrematante.statusPagamento === 'atrasado' && (
              <span className="block mt-2 text-red-600 font-medium">
                ⚠️ ATENÇÃO: Este arrematante possui pagamentos em atraso. 
                Recomenda-se contato imediato para regularização.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 pt-6 border-t-2 border-gray-300 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
        <div className="text-center space-y-4">
          <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
            <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-2 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
              Relatório Oficial de Arrematante
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Documento oficial contendo informações completas e atualizadas do arrematante, 
              incluindo dados pessoais, financeiros e histórico de pagamentos do sistema de gestão de leilões.
            </p>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-200">
            <span className="font-medium">Página 1 de 1</span>
            <span>Gerado em: {new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {/* Logos Elionx e Arthur Lira */}
      <div className="mt-8 flex justify-center items-center -ml-20 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
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

export default Arrematantes;
