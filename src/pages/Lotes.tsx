import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Plus, Search, Eye, Edit, Trash2, FileText, Package, DollarSign, 
  Calendar, Building, Archive, RefreshCw, ArrowLeft, Download, 
  Image, Upload, File, X, Check, AlertCircle, Gavel
} from "lucide-react";
import { Lot, Auction, DocumentoInfo, MercadoriaInfo, LoteInfo } from "@/lib/types";
import { useSupabaseAuctions } from "@/hooks/use-supabase-auctions";
import { supabaseClient } from "@/lib/supabase-client";
import { useQueryClient } from "@tanstack/react-query";
import { AuctionDetails } from "@/components/AuctionDetails";

interface LoteExtendido extends Lot {
  leilaoNome: string;
  leilaoStatus: string;
  statusLote: 'disponivel' | 'arrematado' | 'arquivado';
  mercadorias?: MercadoriaInfo[]; // mercadorias do leilão
  fotosMercadoria?: DocumentoInfo[]; // fotos da mercadoria do leilão
  status?: 'disponivel' | 'arrematado' | 'arquivado';
  tipoPagamento?: "a_vista" | "parcelamento" | "entrada_parcelamento";
  dataVencimentoVista?: string;
  diaVencimentoMensal?: number;
  quantidadeParcelas?: number;
  mesInicioPagamento?: string;
  valorEntrada?: string;
}

interface LoteDocument {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  data_upload: string;
  url: string | null;
}

// Componente para exibir imagens no modal de detalhes do lote
function LoteImagesModal({ 
  loteId, 
  loteNumero, 
  auctionId, 
  onOpenAuctionDetails 
}: { 
  loteId: string; 
  loteNumero: string; 
  auctionId: string;
  onOpenAuctionDetails: (auctionId: string) => void;
}) {
  const [images, setImages] = useState<LoteDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Fechar imagem em tela cheia com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenImage) {
        setFullscreenImage(null);
      }
    };

    if (fullscreenImage) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevenir scroll do body
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [fullscreenImage]);

  useEffect(() => {
    const fetchImages = async () => {
      console.log('🔍 [Modal] Buscando imagens do lote:', {
        auctionId,
        loteId,
        loteNumero,
        searchPattern: `Lote ${loteNumero} - %`
      });
      
      try {
        const { data, error } = await supabaseClient
          .from('documents')
          .select('id, nome, tipo, tamanho, data_upload, url')
          .eq('auction_id', auctionId)
          .eq('categoria', 'lote_fotos')
          .like('descricao', `Lote ${loteNumero} - %`)
          .order('data_upload', { ascending: false });

        if (error) {
          console.error('❌ [Modal] Erro ao buscar imagens do lote:', error);
          setImages([]);
        } else {
          setImages(data || []);
          console.log('✅ [Modal] Imagens carregadas:', data?.length || 0);
        }
      } catch (error) {
        console.error('❌ [Modal] Erro ao buscar imagens do lote:', error);
        setImages([]);
      } finally {
        setLoading(false);
      }
    };

    if (loteId && loteNumero && auctionId) {
      fetchImages();
    } else {
      setLoading(false);
    }
  }, [loteId, loteNumero, auctionId]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-3 block">Imagens do Lote</Label>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">Carregando imagens...</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-3 block">Imagens do Lote</Label>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Nenhuma imagem adicionada a este lote</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label className="text-sm font-medium text-gray-700 mb-3 block">
        Imagens do Lote ({images.length})
      </Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
        {images.map((image) => (
          <div key={image.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Imagem */}
            <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
              {image.url ? (
                <img 
                  src={image.url} 
                  alt={image.nome}
                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                  onClick={() => setFullscreenImage(image.url)}
                />
              ) : (
                <div className="text-center">
                  <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-medium">Sem Preview</p>
                </div>
              )}
            </div>
            
            {/* Informações */}
            <div className="p-3">
              <p className="text-sm font-medium text-gray-900 truncate mb-1">{image.nome}</p>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatFileSize(image.tamanho)}</span>
                <span>{formatDate(image.data_upload)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Clique nas imagens para visualizar em tela cheia
      </p>

      {/* Modal de Tela Cheia para Imagem */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center cursor-pointer animate-in fade-in duration-300"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center animate-in zoom-in duration-300">
            <img 
              src={fullscreenImage} 
              alt="Imagem em tela cheia"
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-70 hover:bg-opacity-90 rounded-full p-2 transition-all duration-200 backdrop-blur-sm"
              onClick={() => setFullscreenImage(null)}
              title="Fechar (ESC)"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Lotes() {
  const navigate = useNavigate();
  const { auctions, isLoading, updateAuction, archiveAuction, unarchiveAuction } = useSupabaseAuctions();
  const queryClient = useQueryClient();
  
  // Estados para Lotes
  const [searchTermLotes, setSearchTermLotes] = useState("");
  const [searchInputValueLotes, setSearchInputValueLotes] = useState("");
  const [statusFilterLotes, setStatusFilterLotes] = useState<string>("todos");
  const [showArchivedLotes, setShowArchivedLotes] = useState(false);
  const [isLoteModalOpen, setIsLoteModalOpen] = useState(false);
  const [isEditingLote, setIsEditingLote] = useState(false);
  const [selectedLote, setSelectedLote] = useState<LoteExtendido | null>(null);
  const [isViewLoteModalOpen, setIsViewLoteModalOpen] = useState(false);
  const [isTransitioningLotes, setIsTransitioningLotes] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [selectedLoteForPhotos, setSelectedLoteForPhotos] = useState<LoteExtendido | null>(null);
  const [isFilterSelectOpen, setIsFilterSelectOpen] = useState(false);
  const [isAuctionSelectOpen, setIsAuctionSelectOpen] = useState(false);
  
  // Estados para modal de detalhes do leilão
  const [viewingAuction, setViewingAuction] = useState<Auction | null>(null);
  const [viewingVersion, setViewingVersion] = useState(0);

  // Função para abrir detalhes do leilão
  const handleOpenAuctionDetails = (auctionId: string) => {
    const auction = auctions.find(a => a.id === auctionId);
    if (auction) {
      setViewingAuction(auction);
      setViewingVersion(prev => prev + 1);
      // Fechar o modal de detalhes do lote
      setIsViewLoteModalOpen(false);
    }
  };

  // Refs para debounce
  const searchTimeoutLotes = useRef<NodeJS.Timeout>();
  // Set para rastrear URLs blob temporárias que precisam ser limpas
  const tempBlobUrlsRef = useRef(new Set<string>());

  // Form states
  const [loteForm, setLoteForm] = useState({
    auctionId: "",
    numero: "",
    descricao: "",
    valorProduto: "",
    mercadoria: "",
    fotos: [] as DocumentoInfo[],
    documentos: [] as DocumentoInfo[],
    certificados: [] as DocumentoInfo[]
  });

  // Convertendo leilões em lotes para exibição
  const lotesFromAuctions: LoteExtendido[] = (auctions || []).flatMap(auction => {
    if (!auction.lotes || auction.lotes.length === 0) return [];
    
    return auction.lotes.map((lote) => {
      // Calcular valor inicial baseado na soma das mercadorias do lote
      const valorInicial = lote.mercadorias.reduce((total, mercadoria) => total + mercadoria.valorNumerico, 0);
      
      // Determinar status do lote com prioridades:
      // 1. Se o lote tem status específico, usar esse status
      // 2. Se há arrematante e este lote foi arrematado, marcar como arrematado
      // 3. Se o leilão foi arquivado, marcar como arquivado
      // 4. Caso contrário, disponível
      let statusLote: 'disponivel' | 'arrematado' | 'arquivado' = 'disponivel';
      
      if (lote.status) {
        // Status específico do lote tem prioridade
        statusLote = lote.status;
      } else if (auction.arrematante?.loteId === lote.id) {
        // Se há arrematante e este é o lote arrematado
        statusLote = 'arrematado';
      } else if (auction.arquivado) {
        // Se o leilão está arquivado
        statusLote = 'arquivado';
      } else if (auction.status === 'finalizado') {
        // Se leilão finalizado mas sem arrematante específico, manter disponível
        statusLote = 'disponivel';
      }
      
      return {
        id: `${auction.id}-${lote.id}`,
        auctionId: auction.id,
        numero: lote.numero,
        descricao: lote.descricao || `Lote ${lote.numero} - ${auction.nome}`,
        valorInicial: valorInicial,
        incrementoLance: Math.round(valorInicial * 0.05), // 5% do valor como incremento
        leilaoNome: auction.nome,
        leilaoStatus: auction.status,
        statusLote: statusLote,
        mercadorias: lote.mercadorias,
        fotosMercadoria: auction.fotosMercadoria,
        fotos: [],
        documentos: [],
        certificados: []
      };
    });
  });

  // Mock data - Em um sistema real, isso viria de uma API
  const mockLotes: LoteExtendido[] = lotesFromAuctions;

  // Debounce para busca de lotes
  useEffect(() => {
    if (searchTimeoutLotes.current) {
      clearTimeout(searchTimeoutLotes.current);
    }
    
    searchTimeoutLotes.current = setTimeout(() => {
      if (searchInputValueLotes !== searchTermLotes) {
        setIsLoadingResults(true);
        setIsTransitioningLotes(true);
        
        setTimeout(() => {
          setSearchTermLotes(searchInputValueLotes);
          setIsLoadingResults(false);
          setTimeout(() => setIsTransitioningLotes(false), 150);
        }, 350);
      }
    }, 500);

    return () => {
      if (searchTimeoutLotes.current) {
        clearTimeout(searchTimeoutLotes.current);
      }
      // Limpar todas as URLs blob temporárias
      tempBlobUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
      tempBlobUrlsRef.current.clear();
    };
  }, [searchInputValueLotes, searchTermLotes]);

  // Filtros de lotes
  const filteredLotes = mockLotes.filter(lote => {
    const matchesSearch = !searchTermLotes || 
      lote.numero.toLowerCase().includes(searchTermLotes.toLowerCase()) ||
      lote.descricao.toLowerCase().includes(searchTermLotes.toLowerCase()) ||
      lote.leilaoNome.toLowerCase().includes(searchTermLotes.toLowerCase()) ||
      (lote.mercadorias && lote.mercadorias.some(m => 
        m.tipo.toLowerCase().includes(searchTermLotes.toLowerCase()) ||
        m.descricao.toLowerCase().includes(searchTermLotes.toLowerCase())
      ));
    
    const matchesStatus = statusFilterLotes === "todos" || lote.statusLote === statusFilterLotes;
    const matchesArchived = showArchivedLotes ? lote.statusLote === "arquivado" : lote.statusLote !== "arquivado";
    
    return matchesSearch && matchesStatus && matchesArchived;
  });

  // Estatísticas de lotes
  const statsLotes = {
    total: mockLotes.filter(l => l.statusLote !== "arquivado").length,
    disponiveis: mockLotes.filter(l => l.statusLote === "disponivel").length,
    arrematados: mockLotes.filter(l => l.statusLote === "arrematado").length,
    arquivados: mockLotes.filter(l => l.statusLote === "arquivado").length,
    valorTotal: mockLotes.filter(l => l.statusLote !== "arquivado").reduce((sum, l) => {
      const valorMercadorias = (l.mercadorias || []).reduce((sumMerc, m) => sumMerc + m.valorNumerico, 0);
      return sum + (valorMercadorias || l.valorInicial);
    }, 0)
  };

  // Funções de manipulação
  const handleSmoothTransitionLotes = (callback: () => void) => {
    setIsTransitioningLotes(true);
    setIsLoadingResults(true);
    setTimeout(() => {
      callback();
      setTimeout(() => {
        setIsTransitioningLotes(false);
        setIsLoadingResults(false);
      }, 50);
    }, 150);
  };

  const resetLoteForm = () => {
    setLoteForm({
      auctionId: "",
      numero: "",
      descricao: "",
      valorProduto: "",
      mercadoria: "",
      fotos: [],
      documentos: [],
      certificados: []
    });
  };

  const handleCreateLote = () => {
    resetLoteForm();
    setIsEditingLote(false);
    setIsLoteModalOpen(true);
  };

  const handleSaveLote = async () => {
    // Validações básicas
    if (!loteForm.auctionId || !loteForm.numero || !loteForm.descricao || !loteForm.mercadoria) {
      console.error("Campos obrigatórios não preenchidos");
      return;
    }

    try {
      // Encontrar o leilão selecionado
      const auction = auctions?.find(a => a.id === loteForm.auctionId);
      if (!auction) {
        console.error("Leilão não encontrado");
        return;
      }

      // Criar/atualizar mercadoria
      const mercadoria: MercadoriaInfo = {
        id: isEditingLote && selectedLote?.mercadorias?.[0]?.id 
          ? selectedLote.mercadorias[0].id 
          : Date.now().toString() + Math.random().toString(36).substr(2, 9),
        nome: loteForm.mercadoria,
        tipo: loteForm.mercadoria,
        descricao: loteForm.mercadoria,
        quantidade: undefined, // Não coletamos quantidade neste formulário
        valor: loteForm.valorProduto,
        valorNumerico: parseFloat(loteForm.valorProduto.replace(/[^\d.,]/g, '').replace(',', '.')) || 0
      };

      const lotes = auction.lotes || [];
      let lotesAtualizados: LoteInfo[];

      if (isEditingLote && selectedLote) {
        // EDITAR lote existente
        const loteAtualizado: LoteInfo = {
          id: selectedLote.id,
          numero: loteForm.numero,
          descricao: loteForm.descricao,
          mercadorias: [mercadoria],
          status: selectedLote.status || 'disponivel',
          tipoPagamento: selectedLote.tipoPagamento,
          dataVencimentoVista: selectedLote.dataVencimentoVista,
          diaVencimentoMensal: selectedLote.diaVencimentoMensal,
          quantidadeParcelas: selectedLote.quantidadeParcelas,
          mesInicioPagamento: selectedLote.mesInicioPagamento,
          valorEntrada: selectedLote.valorEntrada
        };

        lotesAtualizados = lotes.map(lote => 
          lote.id === selectedLote.id ? loteAtualizado : lote
        );
      } else {
        // CRIAR novo lote
        const novoLote: LoteInfo = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          numero: loteForm.numero,
          descricao: loteForm.descricao,
          mercadorias: [mercadoria],
          status: 'disponivel'
        };

        lotesAtualizados = [...lotes, novoLote];
      }

      await updateAuction({
        id: auction.id,
        data: { lotes: lotesAtualizados }
      });

      // Salvar imagens do lote na tabela documents se houver
      console.log('🖼️ Verificando imagens para salvar:', {
        hasPhotos: !!(loteForm.fotos && loteForm.fotos.length > 0),
        photosCount: loteForm.fotos?.length || 0,
        photos: loteForm.fotos
      });
      
      // Primeiro, sempre remover imagens antigas do lote se estiver editando
      if (isEditingLote && selectedLote) {
        console.log('🗑️ Removendo imagens antigas do lote:', {
          auctionId: auction.id,
          loteNumero: selectedLote.numero,
          searchPattern: `Lote ${selectedLote.numero} - %`
        });
        
        const { error: deleteError } = await supabaseClient
          .from('documents')
          .delete()
          .eq('auction_id', auction.id)
          .eq('categoria', 'lote_fotos')
          .like('descricao', `Lote ${selectedLote.numero} - %`);
          
        if (deleteError) {
          console.error('❌ Erro ao remover imagens antigas:', deleteError);
        } else {
          console.log('✅ Imagens antigas removidas com sucesso');
        }
      }
      
      // Depois, salvar novas imagens se houver
      if (loteForm.fotos && loteForm.fotos.length > 0) {
        const loteId = isEditingLote && selectedLote ? selectedLote.id : 
          lotesAtualizados[lotesAtualizados.length - 1].id;

        // Salvar novas imagens via Supabase (usando auction_id e descrição do lote)
        const loteNumero = isEditingLote && selectedLote ? selectedLote.numero : 
          lotesAtualizados[lotesAtualizados.length - 1].numero;
        
        console.log('💾 Preparando para salvar imagens:', {
          auctionId: auction.id,
          loteId: loteId,
          loteNumero: loteNumero,
          isEditing: isEditingLote,
          selectedLote: selectedLote
        });

        // Converter imagens para base64 para salvamento
        console.log('🔄 Iniciando conversão de imagens:', loteForm.fotos.map(f => ({nome: f.nome, hasUrl: !!f.url, urlType: f.url?.substring(0, 10)})));
        
        const documentosParaInserir = await Promise.all(
          loteForm.fotos.map(async (foto, index) => {
            let base64Data = null;
            
            console.log(`📸 Processando imagem ${index + 1}:`, {
              nome: foto.nome,
              tipo: foto.tipo,
              tamanho: foto.tamanho,
              hasUrl: !!foto.url,
              urlStart: foto.url?.substring(0, 20)
            });
            
            // Se a foto tem uma URL blob, converter para base64
            if (foto.url && foto.url.startsWith('blob:')) {
              try {
                console.log(`🔄 Convertendo ${foto.nome} para base64...`);
                const response = await fetch(foto.url);
                const blob = await response.blob();
                const base64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                });
                base64Data = base64;
                console.log(`✅ Conversão concluída para ${foto.nome}:`, {
                  base64Length: base64Data?.length || 0,
                  base64Start: base64Data?.substring(0, 50)
                });
                
                // Verificar se o base64 não é muito grande (limite de ~5MB em base64)
                if (base64Data && base64Data.length > 7000000) {
                  console.warn(`⚠️ Imagem ${foto.nome} muito grande (${base64Data.length} chars), reduzindo qualidade...`);
                  // Para imagens muito grandes, poderia implementar compressão aqui
                }
              } catch (error) {
                console.error(`❌ Erro ao converter ${foto.nome} para base64:`, error);
              }
            } else {
              console.log(`⚠️ Imagem ${foto.nome} não tem URL blob válida`);
            }

            return {
              auction_id: auction.id,
              nome: foto.nome,
              categoria: 'lote_fotos' as const,
              tipo: foto.tipo.includes('jpeg') ? 'jpeg' as const :
                    foto.tipo.includes('jpg') ? 'jpg' as const :
                    foto.tipo.includes('png') ? 'png' as const :
                    foto.tipo.includes('gif') ? 'gif' as const : 'outros' as const,
              tamanho: foto.tamanho,
              data_upload: foto.dataUpload,
              url: base64Data, // Salvar base64 da imagem
              storage_path: foto.nome,
              descricao: `Lote ${loteNumero} - ${loteId}` // Usar descrição para identificar o lote específico
            };
          })
        );

        console.log('📤 Enviando documentos para Supabase:', documentosParaInserir.map(doc => ({
          auction_id: doc.auction_id,
          nome: doc.nome,
          categoria: doc.categoria,
          tipo: doc.tipo,
          tamanho: doc.tamanho,
          hasUrl: !!doc.url,
          urlLength: doc.url?.length || 0,
          descricao: doc.descricao
        })));
        
        const { error: insertError } = await supabaseClient
          .from('documents')
          .insert(documentosParaInserir);
          
        if (insertError) {
          console.error('❌ Erro ao salvar imagens:', {
            error: insertError,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code
          });
        } else {
          console.log(`✅ ${loteForm.fotos.length} imagens salvas com sucesso para o lote ${loteId}`);
        }
      }

      // Limpar formulário e fechar modal
      resetLoteForm();
      setIsLoteModalOpen(false);
      setSelectedLote(null);
      setIsEditingLote(false);
      
      // Invalidar query para atualizar os dados
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      
      console.log(isEditingLote ? "Lote atualizado com sucesso!" : "Lote criado com sucesso!");
      
    } catch (error) {
      console.error('Erro ao salvar lote:', error);
    }
  };

  const handleEditLote = async (lote: LoteExtendido) => {
    // Para edição, vamos pegar a primeira mercadoria como exemplo
    const primeiraMercadoria = lote.mercadorias?.[0];
    
    // Buscar imagens existentes do banco de dados
    let fotosExistentes: DocumentoInfo[] = [];
    try {
      const { data: imagens, error } = await supabaseClient
        .from('documents')
        .select('id, nome, tipo, tamanho, data_upload, url')
        .eq('auction_id', lote.auctionId)
        .eq('categoria', 'lote_fotos')
        .like('descricao', `Lote ${lote.numero} - %`);

      if (!error && imagens) {
        fotosExistentes = imagens.map(img => ({
          id: img.id,
          nome: img.nome,
          tipo: img.tipo,
          tamanho: img.tamanho,
          dataUpload: img.data_upload,
          url: img.url // Carregar URL salva (base64)
        }));
      }
      
      console.log('📷 Imagens carregadas para edição:', fotosExistentes);
    } catch (error) {
      console.error('Erro ao buscar imagens existentes:', error);
    }
    
    setLoteForm({
      auctionId: lote.auctionId,
      numero: lote.numero,
      descricao: lote.descricao,
      valorProduto: primeiraMercadoria?.valor || lote.valorInicial.toString(),
      mercadoria: primeiraMercadoria?.tipo || "",
      fotos: fotosExistentes,
      documentos: lote.documentos || [],
      certificados: lote.certificados || []
    });
    setSelectedLote(lote);
    setIsEditingLote(true);
    setIsLoteModalOpen(true);
  };


  const handleArchiveLote = async (loteId: string) => {
    try {
      // Encontrar o lote específico
      const lote = mockLotes.find(l => l.id === loteId);
      if (!lote) return;

      // Buscar o leilão original
      const auction = auctions?.find(a => a.id === lote.auctionId);
      if (!auction || !auction.lotes) return;

      // Extrair o ID original do lote (remove o prefixo do auction.id)
      const originalLoteId = lote.id.replace(`${lote.auctionId}-`, '');
      
      // Encontrar o lote específico dentro do leilão
      const loteIndex = auction.lotes.findIndex(l => l.id === originalLoteId);
      if (loteIndex === -1) return;

      // Criar uma cópia atualizada dos lotes com o status arquivado
      const updatedLotes = [...auction.lotes];
      updatedLotes[loteIndex] = {
        ...updatedLotes[loteIndex],
        status: 'arquivado'
      };

      // Atualizar o leilão com o lote arquivado
      await updateAuction({
        id: auction.id,
        data: {
          lotes: updatedLotes
        }
      });
      
      console.log(`Lote #${lote.numero} arquivado com sucesso`);
      
    } catch (error) {
      console.error("Erro ao arquivar lote:", error);
    }
  };

  const handleUnarchiveLote = async (loteId: string) => {
    try {
      // Encontrar o lote específico
      const lote = mockLotes.find(l => l.id === loteId);
      if (!lote) return;

      // Buscar o leilão original
      const auction = auctions?.find(a => a.id === lote.auctionId);
      if (!auction || !auction.lotes) return;

      // Extrair o ID original do lote (remove o prefixo do auction.id)
      const originalLoteId = lote.id.replace(`${lote.auctionId}-`, '');
      
      // Encontrar o lote específico dentro do leilão
      const loteIndex = auction.lotes.findIndex(l => l.id === originalLoteId);
      if (loteIndex === -1) return;

      // Criar uma cópia atualizada dos lotes com o status disponível
      const updatedLotes = [...auction.lotes];
      updatedLotes[loteIndex] = {
        ...updatedLotes[loteIndex],
        status: 'disponivel'
      };

      // Atualizar o leilão com o lote desarquivado
      await updateAuction({
        id: auction.id,
        data: {
          lotes: updatedLotes
        }
      });
      
      console.log(`Lote #${lote.numero} desarquivado com sucesso`);
      
    } catch (error) {
      console.error("Erro ao desarquivar lote:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'disponivel':
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 hover:text-blue-800 hover:border-blue-200';
      case 'arrematado':
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100 hover:text-red-800 hover:border-red-200';
      case 'arquivado':
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100 hover:text-gray-800 hover:border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100 hover:text-gray-800 hover:border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'disponivel':
        return 'Disponível';
      case 'arrematado':
        return 'Arrematado';
      case 'arquivado':
        return 'Arquivado';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Lotes</h1>
          <p className="text-gray-600 mt-1">Gerencie os lotes dos leilões cadastrados</p>
        </div>
      </div>

      {/* Indicadores Gerais - Lotes */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Total de Lotes</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
            <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{statsLotes.total}</p>
            <p className="text-sm text-gray-600 font-medium">Cadastrados</p>
          </div>

          <div className="text-center">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Disponíveis</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
            <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{statsLotes.disponiveis}</p>
            <p className="text-sm text-gray-600 font-medium">Para leilão</p>
          </div>

          <div className="text-center">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Arrematados</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
            <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{statsLotes.arrematados}</p>
            <p className="text-sm text-gray-600 font-medium">Vendidos</p>
          </div>

          <div className="text-center">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Valor Total</p>
              <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
            </div>
            <p className="text-3xl font-extralight text-gray-900 mb-2 tracking-tight">{formatCurrency(statsLotes.valorTotal)}</p>
            <p className="text-sm text-gray-600 font-medium">Em produtos</p>
          </div>
        </div>
      </div>

      {/* Card de Lotes */}
      <Card className="border border-gray-200 shadow-sm h-[calc(100vh-320px)]">
        <CardHeader className="pb-4">
          <div className="space-y-4">
            <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
              <div className="p-2 bg-gray-100 rounded-lg">
                {showArchivedLotes ? <Archive className="h-5 w-5 text-gray-600" /> : <Package className="h-5 w-5 text-gray-600" />}
              </div>
              {showArchivedLotes ? "Lotes Arquivados" : "Lotes Cadastrados"}
            </CardTitle>

              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">

                <div className="relative flex-1 min-w-0 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar lote, mercadoria ou leilão..."
                    value={searchInputValueLotes}
                    onChange={(e) => setSearchInputValueLotes(e.target.value)}
                    className="pl-10 h-11 border-gray-300 focus:border-gray-300 focus:ring-0 no-focus-outline w-full"
                  />
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <Select 
                  value={statusFilterLotes} 
                  onValueChange={(value) => {
                    setIsLoadingResults(true);
                    setIsTransitioningLotes(true);
                    
                    setTimeout(() => {
                      setStatusFilterLotes(value);
                      setIsLoadingResults(false);
                      setTimeout(() => setIsTransitioningLotes(false), 150);
                    }, 500);
                  }}
                  onOpenChange={setIsFilterSelectOpen}
                >
                  <SelectTrigger 
                    className="w-[140px] h-11 border-gray-300 bg-white focus:!ring-0 focus:!ring-offset-0 focus:!border-gray-300 focus:!outline-none focus:!shadow-none"
                  >
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos ({statsLotes.total})</SelectItem>
                    <SelectItem value="disponivel">Disponível ({statsLotes.disponiveis})</SelectItem>
                    <SelectItem value="arrematado">Arrematado ({statsLotes.arrematados})</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  {showArchivedLotes && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleSmoothTransitionLotes(() => {
                          setShowArchivedLotes(false);
                        });
                      }}
                      className="h-11 px-3 border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:text-black"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleSmoothTransitionLotes(() => {
                        setShowArchivedLotes(!showArchivedLotes);
                      });
                    }}
                    className="h-11 px-4 border-gray-300 text-gray-700 hover:text-black hover:bg-gray-50"
                  >
                    {showArchivedLotes ? "Ver Ativos" : "Ver Arquivados"}
                  </Button>
                </div>

                <Button onClick={handleCreateLote} className="h-11 bg-black hover:bg-gray-800 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Lote
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 h-[calc(100%-120px)] overflow-y-auto">
          {isLoading || isLoadingResults ? (
            <div className={`space-y-4 ${isTransitioningLotes ? 'fade-in' : ''}`}>
              {[...Array(3)].map((_, index) => (
                <div key={index} className="animate-pulse-slow transform-none">
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm transition-none transform-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-12 h-12 bg-gray-200 rounded-full animate-shimmer"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 rounded w-3/4 animate-shimmer" style={{animationDelay: `${index * 0.2}s`}}></div>
                          <div className="h-3 rounded w-1/2 animate-shimmer" style={{animationDelay: `${index * 0.3}s`}}></div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="h-6 rounded-full w-20 animate-shimmer" style={{animationDelay: `${index * 0.4}s`}}></div>
                        <div className="h-6 rounded-full w-16 animate-shimmer" style={{animationDelay: `${index * 0.5}s`}}></div>
                        <div className="flex space-x-2">
                          <div className="w-8 h-8 rounded animate-shimmer" style={{animationDelay: `${index * 0.6}s`}}></div>
                          <div className="w-8 h-8 rounded animate-shimmer" style={{animationDelay: `${index * 0.7}s`}}></div>
                          <div className="w-8 h-8 rounded animate-shimmer" style={{animationDelay: `${index * 0.8}s`}}></div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex space-x-6">
                        <div className="h-3 rounded w-24 animate-shimmer" style={{animationDelay: `${index * 0.9}s`}}></div>
                        <div className="h-3 rounded w-20 animate-shimmer" style={{animationDelay: `${index * 1.0}s`}}></div>
                        <div className="h-3 rounded w-28 animate-shimmer" style={{animationDelay: `${index * 1.1}s`}}></div>
                      </div>
                      <div className="h-4 rounded w-20 animate-shimmer" style={{animationDelay: `${index * 1.2}s`}}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredLotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 px-6">
              {showArchivedLotes ? <Archive className="h-12 w-12 mb-4 text-gray-300" /> : <Package className="h-12 w-12 mb-4 text-gray-300" />}
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTermLotes && statusFilterLotes !== "todos" 
                  ? `Nenhum lote ${statusFilterLotes} encontrado`
                  : searchTermLotes 
                    ? "Nenhum lote encontrado"
                    : statusFilterLotes !== "todos"
                      ? `Nenhum lote ${statusFilterLotes}`
                      : showArchivedLotes 
                        ? "Nenhum lote arquivado"
                        : "Nenhum lote encontrado"}
              </h3>
              <p className="text-sm text-center max-w-md">
                {searchTermLotes && statusFilterLotes !== "todos"
                  ? `Nenhum lote ${statusFilterLotes} corresponde à busca "${searchTermLotes}".`
                  : searchTermLotes 
                    ? `Nenhum resultado para "${searchTermLotes}". Tente outro termo.`
                    : statusFilterLotes !== "todos"
                      ? `Não há lotes com status ${statusFilterLotes} no momento.`
                      : showArchivedLotes 
                        ? "Não há lotes arquivados no momento."
                        : "Ainda não há lotes cadastrados no sistema."}
              </p>
            </div>
          ) : (
            <div className={`transition-opacity duration-300 ${isTransitioningLotes ? 'opacity-0' : 'opacity-100'}`}>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200">
                    <TableHead className="font-semibold text-gray-700">Número</TableHead>
                    <TableHead className="font-semibold text-gray-700">Mercadoria</TableHead>
                    <TableHead className="font-semibold text-gray-700">Descrição</TableHead>
                    <TableHead className="font-semibold text-gray-700">Leilão</TableHead>
                    <TableHead className="font-semibold text-gray-700">Valor do Produto</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLotes.map((lote) => (
                    <TableRow key={lote.id} className="border-gray-100 hover:bg-gray-50/50">
                      <TableCell>
                        <span className="font-semibold text-gray-900">#{lote.numero}</span>
                      </TableCell>
                      <TableCell>
                        {lote.mercadorias && lote.mercadorias.length > 0 ? (
                          <div className="space-y-1">
                            {lote.mercadorias.slice(0, 2).map((mercadoria, index) => (
                              <div key={index} className="text-sm">
                                <span className="font-medium text-gray-900">{mercadoria.tipo}</span>
                              </div>
                            ))}
                            {lote.mercadorias.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{lote.mercadorias.length - 2} mais
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium text-gray-900 truncate">{lote.descricao}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{lote.leilaoNome}</span>
                      </TableCell>
                      <TableCell>
                        {lote.mercadorias && lote.mercadorias.length > 0 ? (
                          <span className="font-semibold text-black">
                            {formatCurrency(lote.mercadorias.reduce((sum, m) => sum + m.valorNumerico, 0))}
                          </span>
                        ) : (
                          <span className="font-semibold text-black">{formatCurrency(lote.valorInicial)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusBadgeColor(lote.statusLote)} border font-medium`}>
                          {getStatusText(lote.statusLote)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLote(lote);
                              setIsViewLoteModalOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-black hover:bg-gray-100 hover:text-black"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {lote.fotosMercadoria && lote.fotosMercadoria.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedLoteForPhotos(lote);
                                setIsPhotoViewerOpen(true);
                              }}
                              className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                              title={`Ver fotos (${lote.fotosMercadoria.length})`}
                            >
                              <Image className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditLote(lote)}
                            className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                                                     <AlertDialog>
                             <AlertDialogTrigger asChild>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                 title={showArchivedLotes ? "Desarquivar" : "Arquivar"}
                               >
                                 <Archive className="h-4 w-4" />
                               </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>
                                   {showArchivedLotes ? "Desarquivar Lote" : "Arquivar Lote"}
                                 </AlertDialogTitle>
                                 <AlertDialogDescription>
                                   {showArchivedLotes 
                                     ? `Tem certeza que deseja desarquivar o lote #${lote.numero}? O lote voltará para a lista principal.`
                                     : `Tem certeza que deseja arquivar o lote #${lote.numero}? O lote ficará oculto da lista principal, mas poderá ser recuperado posteriormente.`
                                   }
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                 <AlertDialogAction
                                   onClick={() => showArchivedLotes ? handleUnarchiveLote(lote.id) : handleArchiveLote(lote.id)}
                                   className="bg-black hover:bg-gray-800"
                                 >
                                   {showArchivedLotes ? "Desarquivar" : "Arquivar"}
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
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

      {/* Modal de Visualização de Lote */}
      <Dialog open={isViewLoteModalOpen} onOpenChange={setIsViewLoteModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalhes do Lote #{selectedLote?.numero}
            </DialogTitle>
          </DialogHeader>
          {selectedLote && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Número do Lote</Label>
                  <p className="mt-1 text-sm font-semibold text-gray-900">#{selectedLote.numero}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <div className="mt-1">
                    <Badge className={`${getStatusBadgeColor(selectedLote.statusLote)} border font-medium`}>
                      {getStatusText(selectedLote.statusLote)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Mercadorias */}
              {selectedLote.mercadorias && selectedLote.mercadorias.length > 0 ? (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Mercadorias ({selectedLote.mercadorias.length})
                  </Label>
                  <div className="space-y-4">
                    {selectedLote.mercadorias.map((mercadoria, index) => (
                      <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <Label className="text-xs font-medium text-gray-600">Tipo</Label>
                            <p className="text-sm font-medium text-gray-900">{mercadoria.tipo}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-600">Valor</Label>
                            <p className="text-sm font-semibold text-black">{formatCurrency(mercadoria.valorNumerico)}</p>
                          </div>
                        </div>
                        {mercadoria.descricao && (
                          <div>
                            <Label className="text-xs font-medium text-gray-600">Descrição</Label>
                            <p className="text-sm text-gray-700 mt-1">{mercadoria.descricao}</p>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium text-gray-700">Valor Total das Mercadorias</Label>
                        <p className="text-lg font-bold text-black">
                          {formatCurrency(selectedLote.mercadorias.reduce((sum, m) => sum + m.valorNumerico, 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500">Nenhuma mercadoria cadastrada</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-700">Descrição</Label>
                <p className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                  {selectedLote.descricao}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Leilão</Label>
                <p className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
                  {selectedLote.leilaoNome}
                </p>
              </div>

              {/* Imagens do Lote */}
              <LoteImagesModal 
                key={`modal-${selectedLote.id}-${selectedLote.numero}`}
                loteId={selectedLote.id} 
                loteNumero={selectedLote.numero} 
                auctionId={selectedLote.auctionId}
                onOpenAuctionDetails={handleOpenAuctionDetails}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Criação/Edição de Lote */}
      <Dialog open={isLoteModalOpen} onOpenChange={setIsLoteModalOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {isEditingLote ? "Editar Lote" : "Novo Lote"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numero">Número do Lote</Label>
                <Input
                  id="numero"
                  value={loteForm.numero}
                  onChange={(e) => setLoteForm({...loteForm, numero: e.target.value})}
                  placeholder="Ex: 001"
                  className="focus:border-black focus:ring-0 focus-visible:ring-0"
                />
              </div>
              <div>
                <Label htmlFor="auctionId">Leilão</Label>
                <Select 
                  value={loteForm.auctionId} 
                  onValueChange={(value) => setLoteForm({...loteForm, auctionId: value})}
                  onOpenChange={setIsAuctionSelectOpen}
                >
                  <SelectTrigger 
                    className="focus:!ring-0 focus:!ring-offset-0 focus:!border-gray-300 focus:!outline-none focus:!shadow-none"
                  >
                    <SelectValue placeholder="Selecione o leilão" />
                  </SelectTrigger>
                  <SelectContent>
                    {auctions?.map((auction) => (
                      <SelectItem key={auction.id} value={auction.id}>
                        {auction.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mercadoria">Mercadoria</Label>
                <Input
                  id="mercadoria"
                  value={loteForm.mercadoria}
                  onChange={(e) => setLoteForm({...loteForm, mercadoria: e.target.value})}
                  placeholder="Ex: Gado Nelore"
                  className="focus:border-black focus:ring-0 focus-visible:ring-0"
                />
              </div>
              <div>
                <Label htmlFor="valorProduto">Valor do Produto (R$)</Label>
                <Input
                  id="valorProduto"
                  value={loteForm.valorProduto}
                  onChange={(e) => setLoteForm({...loteForm, valorProduto: e.target.value})}
                  placeholder="Ex: 15.000,00"
                  className="focus:border-black focus:ring-0 focus-visible:ring-0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={loteForm.descricao}
                onChange={(e) => setLoteForm({...loteForm, descricao: e.target.value})}
                placeholder="Descreva o lote detalhadamente..."
                rows={3}
                className="focus:border-black focus:ring-0 focus-visible:ring-0"
              />
            </div>

            {/* Campo de Imagens */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Imagens do Lote</Label>
              
              {/* Lista de imagens */}
              {loteForm.fotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-white border border-gray-200 rounded-lg max-h-40 overflow-y-auto mb-4">
                  {loteForm.fotos.map((foto) => (
                    <div key={foto.id} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                        {foto.url ? (
                          <img
                            src={foto.url}
                            alt={foto.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Limpar blob URL da foto que será removida
                            if (foto.url && tempBlobUrlsRef.current.has(foto.url)) {
                              URL.revokeObjectURL(foto.url);
                              tempBlobUrlsRef.current.delete(foto.url);
                            }
                            
                            const updatedFotos = loteForm.fotos.filter(f => f.id !== foto.id);
                            setLoteForm({...loteForm, fotos: updatedFotos});
                          }}
                          className="h-5 w-5 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
                          title="Remover foto"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-gray-600 truncate">{foto.nome}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Área de upload */}
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const files = Array.from(e.dataTransfer.files);
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
                    
                    setLoteForm(prev => ({...prev, fotos: [...prev.fotos, novoDocumento]}));
                  });
                }}
              >
                <div className="text-center">
                  <Image className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-900 mb-1">Adicionar imagens do lote</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Arraste arquivos aqui ou clique para selecionar
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload-lote')?.click()}
                    className="border-gray-300 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Imagens
                  </Button>
                  <input
                    id="file-upload-lote"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
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
                        
                        setLoteForm(prev => ({...prev, fotos: [...prev.fotos, novoDocumento]}));
                      });
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Formatos aceitos: JPG, PNG, GIF (máx. 10MB cada)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsLoteModalOpen(false)}
                className="border-gray-300 text-gray-700 hover:text-black hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveLote}
                className="bg-black hover:bg-gray-800"
              >
                {isEditingLote ? "Salvar Alterações" : "Criar Lote"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização de Fotos */}
      <Dialog open={isPhotoViewerOpen} onOpenChange={setIsPhotoViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Fotos do Lote - {selectedLoteForPhotos?.descricao}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLoteForPhotos?.fotosMercadoria && selectedLoteForPhotos.fotosMercadoria.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p><strong>Leilão:</strong> {selectedLoteForPhotos.leilaoNome}</p>
                <p><strong>Total de fotos:</strong> {selectedLoteForPhotos.fotosMercadoria.length}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                {selectedLoteForPhotos.fotosMercadoria.map((foto, index) => (
                  <div key={foto.id} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                      {foto.url ? (
                        <img
                          src={foto.url}
                          alt={foto.nome}
                          className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-105"
                          onClick={() => window.open(foto.url, '_blank')}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {index + 1}/{selectedLoteForPhotos.fotosMercadoria.length}
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-xs text-gray-600 truncate" title={foto.nome}>
                        {foto.nome}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(foto.tamanho / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center pt-4 border-t">
                <Button
                  onClick={() => setIsPhotoViewerOpen(false)}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  Fechar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Image className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-600 text-center">Nenhuma foto disponível para este lote</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Leilão */}
      <Dialog open={!!viewingAuction} onOpenChange={() => setViewingAuction(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Detalhes do Leilão
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300">
          {viewingAuction && (
              <div className="p-6">
            <AuctionDetails 
              key={`auction-details-${viewingAuction.id}-${viewingVersion}`}
              auction={viewingAuction} 
            />
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Lotes;
