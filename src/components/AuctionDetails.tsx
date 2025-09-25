import { Auction } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabaseClient } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  FileText, 
  Clock,
  Building,
  Globe,
  Users,
  CreditCard,
  User,
  FileImage,
  Eye,
  Info,
  Image
} from "lucide-react";

interface AuctionDetailsProps {
  auction: Auction;
}

interface LoteDocument {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  data_upload: string;
  url: string | null;
}

function LoteImages({ loteId, loteNumero, auctionId }: { loteId: string; loteNumero: string; auctionId: string }) {
  const [images, setImages] = useState<LoteDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Log quando o componente é montado
  useEffect(() => {
    console.log('🏗️ LoteImages montado:', { loteId, loteNumero, auctionId });
    return () => {
      console.log('🔥 LoteImages desmontado:', { loteId, loteNumero, auctionId });
    };
  }, []);

  useEffect(() => {
    // Reset do estado quando os parâmetros mudam
    setLoading(true);
    setImages([]);

    const fetchImages = async () => {
      console.log('🔍 Buscando imagens do lote:', {
        auctionId,
        loteId,
        loteNumero,
        searchPattern: `Lote ${loteNumero} - %`,
        timestamp: new Date().toISOString()
      });
      
      try {
        // Buscar com multiple padrões para maior compatibilidade
        const searchPatterns = [
          `Lote ${loteNumero} - ${loteId}`,
          `Lote ${loteNumero} - %`,
          `%${loteId}%`,
          `%Lote ${loteNumero}%`
        ];

        console.log('🔍 Tentando múltiplos padrões de busca:', searchPatterns);

        let allData: any[] = [];

        // Tentar cada padrão sequencialmente
        for (const pattern of searchPatterns) {
          const { data, error } = await supabaseClient
            .from('documents')
            .select('id, nome, tipo, tamanho, data_upload, url, descricao')
            .eq('auction_id', auctionId)
            .eq('categoria', 'lote_fotos')
            .like('descricao', pattern)
            .order('data_upload', { ascending: false });

          if (!error && data && data.length > 0) {
            console.log(`✅ Padrão "${pattern}" encontrou ${data.length} imagens:`, 
              data.map(d => ({ nome: d.nome, descricao: d.descricao })));
            
            // Adicionar apenas se não existir ainda (evitar duplicatas)
            data.forEach(item => {
              if (!allData.find(existing => existing.id === item.id)) {
                allData.push(item);
              }
            });
          } else if (error) {
            console.warn(`⚠️ Erro com padrão "${pattern}":`, error);
          } else {
            console.log(`📭 Padrão "${pattern}" não retornou resultados`);
          }
        }

        // Se não encontrou nada com padrões específicos, buscar todas as imagens do leilão desta categoria
        if (allData.length === 0) {
          console.log('🔍 Buscando todas as imagens lote_fotos do leilão para debug...');
          const { data: allLoteImages, error: allError } = await supabaseClient
            .from('documents')
            .select('id, nome, tipo, tamanho, data_upload, url, descricao')
            .eq('auction_id', auctionId)
            .eq('categoria', 'lote_fotos')
            .order('data_upload', { ascending: false });

          if (!allError && allLoteImages) {
            console.log('📊 Todas as imagens lote_fotos encontradas:', 
              allLoteImages.map(img => ({ 
                nome: img.nome, 
                descricao: img.descricao, 
                matchesLote: img.descricao?.includes(`Lote ${loteNumero}`)
              })));
            
            // Filtrar manualmente por loteNumero na descrição
            allData = allLoteImages.filter(img => 
              img.descricao && (
                img.descricao.includes(`Lote ${loteNumero}`) || 
                img.descricao.includes(loteId)
              )
            );
          }
        }

        console.log('📋 Resultado final da busca:', { 
          totalFound: allData.length,
          images: allData.map(d => ({ nome: d.nome, descricao: d.descricao })),
          timestamp: new Date().toISOString()
        });

        setImages(allData);
      } catch (error) {
        console.error('❌ Erro ao buscar imagens do lote:', error);
        setImages([]);
      } finally {
        setLoading(false);
      }
    };

    if (loteId && loteNumero && auctionId) {
      // Pequeno delay para evitar chamadas muito rápidas
      const timer = setTimeout(() => {
        fetchImages();
      }, 100);

      return () => clearTimeout(timer);
    } else {
      setLoading(false);
    }
  }, [loteId, loteNumero, auctionId]);

  if (loading) {
    return (
      <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
        <p className="text-sm text-gray-500">Carregando imagens...</p>
      </div>
    );
  }

  if (images.length === 0) {
    console.log('🚫 Nenhuma imagem encontrada, ocultando componente');
    return null; // Não mostrar nada se não há imagens
  }
  
  console.log('✅ Renderizando componente com imagens:', images);

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

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
      <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
        <Image className="h-4 w-4" />
        Imagens do Lote ({images.length})
      </h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {images.map((image) => (
          <div key={image.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Imagem ou Placeholder */}
            <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
              {image.url ? (
                <img 
                  src={image.url} 
                  alt={image.nome}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback para placeholder se a imagem não carregar
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `
                      <div class="text-center">
                        <svg class="h-8 w-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <p class="text-xs text-gray-500 font-medium">Erro ao carregar</p>
                        <p class="text-xs text-gray-400">${image.tipo.toUpperCase()}</p>
                      </div>
                    `;
                  }}
                />
              ) : (
                <div className="text-center">
                  <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-medium">Imagem Salva</p>
                  <p className="text-xs text-gray-400">{image.tipo.toUpperCase()}</p>
                </div>
              )}
            </div>
            
            {/* Informações da Imagem */}
            <div className="p-3">
              <p className="text-sm font-medium text-gray-900 truncate mb-2">{image.nome}</p>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatFileSize(image.tamanho)}</span>
                <span>{formatDate(image.data_upload)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuctionDetails({ auction }: AuctionDetailsProps) {
  const formatCurrency = (value: number | undefined) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    // Adiciona o horário UTC para evitar problemas de fuso horário
    const date = new Date(dateString + 'T12:00:00.000Z');
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      timeZone: "UTC"
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      agendado: "secondary",
      em_andamento: "default", 
      finalizado: "outline"
    } as const;
    
    const labels = {
      agendado: "Agendado",
      em_andamento: "Em Andamento",
      finalizado: "Finalizado"
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"} 
             className={getStatusBadgeColor(status)}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getLocalIcon = (local: string) => {
    switch (local) {
      case "presencial": return <Building className="h-4 w-4 text-gray-600" />;
      case "online": return <Globe className="h-4 w-4 text-gray-600" />;
      case "hibrido": return <Users className="h-4 w-4 text-gray-600" />;
      default: return <MapPin className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      agendado: "text-gray-700 bg-gray-100 hover:bg-gray-100",
      em_andamento: "text-gray-700 bg-gray-200 hover:bg-gray-200",
      finalizado: "text-gray-800 bg-gray-100 hover:bg-gray-100"
    };

    return colors[status as keyof typeof colors] || "text-gray-700 bg-gray-100 hover:bg-gray-100";
  };

  const formatMonthYear = (monthString: string) => {
    if (!monthString || monthString.length < 2) return "Não definido";
    
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    const monthIndex = parseInt(monthString) - 1;
    const currentYear = new Date().getFullYear();
    
    return monthIndex >= 0 && monthIndex <= 11 
      ? `${monthNames[monthIndex]} ${currentYear}`
      : "Mês inválido";
  };

  return (
    <div className="space-y-10">
      {/* ==================== CABEÇALHO ==================== */}
      <div className="bg-gray-50 rounded-lg px-6 py-6 border border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">{auction.nome}</h1>
            {auction.identificacao && (
              <p className="text-sm text-gray-500 font-mono">#{auction.identificacao}</p>
            )}
          </div>
          {getStatusBadge(auction.status)}
        </div>
        
        <div className="flex items-center gap-6 text-sm text-gray-600 mt-4">
          <span>Cadastrado em {formatDate(auction.dataInicio)}</span>
          {auction.arquivado && (
            <span className="text-amber-600">• Arquivado</span>
        )}
      </div>
      </div>

      {/* ==================== INFORMAÇÕES BÁSICAS ==================== */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200">
          Informações Básicas
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              {getLocalIcon(auction.local)}
              Local do Evento
            </h3>
            <p className="text-gray-900 capitalize mb-2">{auction.local}</p>
            {auction.endereco && (
              <p className="text-sm text-gray-600 leading-relaxed">{auction.endereco}</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Investimento Total
            </h3>
            <p className="text-2xl font-semibold text-gray-900">
              {(() => {
                // Priorizar custosNumerico se disponível
                if (auction.custosNumerico && auction.custosNumerico > 0) {
                  return formatCurrency(auction.custosNumerico);
                }
                
                // Fallback para custos como string
                if (auction.custos && auction.custos.trim() !== "") {
                  if (typeof auction.custos === 'string') {
                    return auction.custos.startsWith('R$') ? auction.custos : `R$ ${auction.custos}`;
                  } else {
                    return formatCurrency(auction.custos);
                  }
                }
                
                return "R$ 0,00";
              })()}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Resumo do Pagamento
            </h3>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="space-y-2">
                <p><strong>Configuração específica por lote</strong></p>
                {auction.lotes && auction.lotes.length > 0 ? (
                  <div className="text-xs space-y-1 mt-2">
                    {auction.lotes.map((lote, index) => {
                      if (!lote.tipoPagamento) return null;
                      return (
                        <p key={lote.id || index} className="text-gray-500">
                          • <strong>Lote {lote.numero}:</strong>{' '}
                          {lote.tipoPagamento === 'a_vista' && 'À vista'}
                          {lote.tipoPagamento === 'parcelamento' && `${lote.parcelasPadrao || 12}x`}
                          {lote.tipoPagamento === 'entrada_parcelamento' && `Entrada + ${lote.parcelasPadrao || 12}x`}
                          {lote.tipoPagamento === 'a_vista' && lote.dataVencimentoVista && ` (${formatDate(lote.dataVencimentoVista)})`}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs">Nenhum lote com configuração de pagamento definida</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== CRONOGRAMA ==================== */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Cronograma do Evento
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Data de Início</p>
            <p className="text-gray-900 font-medium">{formatDate(auction.dataInicio)}</p>
          </div>
          
          {auction.status === 'em_andamento' && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Em Andamento</p>
              <p className="text-gray-900 font-medium">{formatDate(auction.dataInicio)}</p>
            </div>
          )}
          
          {auction.dataEncerramento && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Encerramento</p>
              <p className="text-gray-900 font-medium">{formatDate(auction.dataEncerramento)}</p>
            </div>
          )}
        </div>
      </div>



      {/* ==================== ARREMATANTE ==================== */}
      {auction.arrematante && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200 flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações do Arrematante
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Nome Completo</p>
              <p className="text-gray-900 font-medium">{auction.arrematante.nome}</p>
            </div>
            
            {auction.arrematante.documento && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Documento</p>
                <p className="text-gray-900 font-mono">{auction.arrematante.documento}</p>
              </div>
        )}
      </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Valor Total</p>
              <p className="text-xl font-semibold text-gray-900">
                {auction.arrematante.valorPagar
                  ? (typeof auction.arrematante.valorPagar === 'string'
                      ? (auction.arrematante.valorPagar.startsWith('R$') 
                          ? auction.arrematante.valorPagar 
                          : `R$ ${auction.arrematante.valorPagar}`)
                      : `R$ ${auction.arrematante.valorPagar}`)
                  : "R$ 0,00"}
              </p>
      </div>

              <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Situação do Pagamento</p>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  auction.arrematante.pago ? 'bg-gray-600' : 'bg-amber-500'
                }`}></div>
                <span className="text-gray-900 font-medium">
                  {auction.arrematante.pago ? 'Quitado' : 'Pendente'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {auction.arrematante.parcelasPagas || 0} de {auction.arrematante.quantidadeParcelas} parcelas pagas
              </p>
              </div>
            </div>
            
          {auction.arrematante.loteId && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Lote Arrematado</p>
              <p className="text-gray-900 font-medium">
                {(() => {
                  const lote = (auction.lotes || []).find(l => l.id === auction.arrematante?.loteId);
                  return lote ? `Lote ${lote.numero} - ${lote.descricao}` : "Lote não encontrado";
                })()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ==================== LOTES ==================== */}
      {auction.lotes && auction.lotes.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200">
            Lotes do Leilão ({auction.lotes.length})
          </h2>
          
          <div className="space-y-4">
            {auction.lotes.map((lote, index) => {
              // Calcular valor total das mercadorias
              const valorTotal = lote.mercadorias?.reduce((sum, mercadoria) => sum + (mercadoria.valorNumerico || 0), 0) || 0;
              
              return (
                <div key={lote.id || index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Lote {lote.numero}</h4>
                      <p className="text-gray-700">{lote.descricao}</p>
                    </div>
                    {lote.status === 'arrematado' && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">Arrematado</span>
                    )}
                  </div>

                  {/* Valor do Lote */}
                  {valorTotal > 0 && (
                    <div className="mb-3">
                      <span className="text-gray-800 font-semibold text-lg">{formatCurrency(valorTotal)}</span>
                    </div>
                  )}

                  {/* Mercadorias */}
                  {lote.mercadorias && lote.mercadorias.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Mercadorias:</h5>
                      <div className="space-y-1">
                        {lote.mercadorias.map((mercadoria, mercIndex) => (
                          <div key={mercadoria.id || mercIndex} className="text-sm text-gray-600">
                            • {mercadoria.nome || `${mercadoria.tipo}`} - {mercadoria.descricao}
                            {mercadoria.quantidade && (
                              <span className="text-gray-500"> (Qtd: {mercadoria.quantidade})</span>
                            )}
                            <span className="text-gray-700 font-medium ml-2">{formatCurrency(mercadoria.valorNumerico)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Configurações de Pagamento do Lote */}
                  {lote.tipoPagamento && (
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        <span className="inline-block w-2 h-2 bg-gray-500 rounded-full"></span>
                        Pagamento Específico deste Lote
                      </h5>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        {/* Tipo de Pagamento */}
                        <div className="bg-gray-50 p-2 rounded border border-gray-300">
                          <span className="text-gray-600 font-medium block">Tipo:</span>
                          <span className="text-gray-800">
                            {lote.tipoPagamento === 'a_vista' ? 'À vista' :
                             lote.tipoPagamento === 'parcelamento' ? 'Parcelamento' :
                             'Entrada + Parcelamento'}
                          </span>
                        </div>

                        {/* Data à Vista */}
                        {lote.tipoPagamento === 'a_vista' && lote.dataVencimentoVista && (
                          <div className="bg-gray-100 p-2 rounded border border-gray-300">
                            <span className="text-gray-600 font-medium block">Data de Pagamento:</span>
                            <span className="text-gray-800">
                              {new Date(lote.dataVencimentoVista + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}

                        {/* Data da Entrada */}
                        {lote.tipoPagamento === 'entrada_parcelamento' && lote.dataEntrada && (
                          <div className="bg-gray-100 p-2 rounded border border-gray-300">
                            <span className="text-gray-600 font-medium block">Data da Entrada:</span>
                            <span className="text-gray-800">
                              {new Date(lote.dataEntrada + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}

                        {/* Configurações de Parcelamento */}
                        {(lote.tipoPagamento === 'parcelamento' || lote.tipoPagamento === 'entrada_parcelamento') && (
                          <>
                            {lote.mesInicioPagamento && (
                              <div className="bg-gray-100 p-2 rounded border border-gray-300">
                                <span className="text-gray-600 font-medium block">Mês de Início:</span>
                                <span className="text-gray-800">
                                  {(() => {
                                    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                                                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                                    return meses[parseInt(lote.mesInicioPagamento) - 1] || 'N/A';
                                  })()}
                                </span>
                              </div>
                            )}
                            
                            {lote.diaVencimentoPadrao && (
                              <div className="bg-gray-100 p-2 rounded border border-gray-300">
                                <span className="text-gray-600 font-medium block">Dia do Vencimento:</span>
                                <span className="text-gray-800">Dia {lote.diaVencimentoPadrao}</span>
                              </div>
                            )}
                            
                            {lote.parcelasPadrao && (
                              <div className="bg-gray-100 p-2 rounded border border-gray-300">
                                <span className="text-gray-600 font-medium block">Parcelas:</span>
                                <span className="text-gray-800">
                                  {lote.parcelasPadrao}x{lote.tipoPagamento === 'entrada_parcelamento' ? ' (após entrada)' : ''}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Imagens do Lote */}
                  <LoteImages 
                    key={`${lote.id}-${lote.numero}-${auction.id}`} 
                    loteId={lote.id} 
                    loteNumero={lote.numero} 
                    auctionId={auction.id} 
                  />
                </div>
              );
            })}
                </div>
              </div>
            )}
            
      {/* ==================== ANEXOS ==================== */}
      {((auction.documentos && auction.documentos.length > 0) || 
        (auction.fotosMercadoria && auction.fotosMercadoria.length > 0)) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200">
            Anexos e Documentos
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {auction.documentos && auction.documentos.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documentos ({auction.documentos.length})
                </h3>
                <div className="space-y-3">
                  {auction.documentos.map((doc, index) => (
                    <div key={doc.id || index} 
                         className="flex items-center gap-3 p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                         onClick={() => {
                           if (doc.url) {
                             // Se é PDF ou documento com base64, abrir em nova aba
                             if (doc.url.startsWith('data:')) {
                               const newWindow = window.open();
                               if (newWindow) {
                                 newWindow.document.write(`
                                   <html>
                                     <head><title>${doc.nome}</title></head>
                                     <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f0f0f0;">
                                       ${doc.url.includes('pdf') ? 
                                         `<embed src="${doc.url}" width="100%" height="100%" type="application/pdf" />` :
                                         `<img src="${doc.url}" style="max-width:100%; max-height:100%; object-fit:contain;" alt="${doc.nome}" />`
                                       }
                                     </body>
                                   </html>
                                 `);
                               }
                             } else {
                               // Para outros tipos, tentar abrir ou baixar
                               window.open(doc.url, '_blank');
                             }
                           } else {
                             // Se não tem URL, mostrar alerta
                             alert('Este documento não está disponível para visualização.');
                           }
                         }}
                         title="Clique para abrir o documento"
                    >
                      <FileText className="h-4 w-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.nome}</p>
                        <p className="text-xs text-gray-500">
                          {doc.tamanho ? `${(doc.tamanho / 1024).toFixed(1)} KB` : 'N/A'} •{" "}
                          {doc.dataUpload ? new Date(doc.dataUpload).toLocaleDateString('pt-BR') : 'N/A'}
                        </p>
                      </div>
                      {doc.url && (
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 text-gray-500" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {auction.fotosMercadoria && auction.fotosMercadoria.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  Fotos da Mercadoria ({auction.fotosMercadoria.length})
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {auction.fotosMercadoria.map((foto, index) => (
                    <div key={foto.id || index} 
                         className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors group"
                         onClick={() => {
                           if (foto.url) {
                             // Abrir imagem em nova aba para visualização ampliada
                             const newWindow = window.open();
                             if (newWindow) {
                               newWindow.document.write(`
                                 <html>
                                   <head>
                                     <title>${foto.nome}</title>
                                     <style>
                                       body { margin:0; background:#000; display:flex; justify-content:center; align-items:center; min-height:100vh; }
                                       img { max-width:100%; max-height:100vh; object-fit:contain; }
                                     </style>
                                   </head>
                                   <body>
                                     <img src="${foto.url}" alt="${foto.nome}" />
                                   </body>
                                 </html>
                               `);
                             }
                           }
                         }}
                         title="Clique para ampliar a imagem"
                    >
                      {foto.url ? (
                        <>
                          <img 
                            src={foto.url} 
                            alt={foto.nome}
                            className="w-full h-full object-cover"
                          />
                          {/* Overlay de hover */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                            <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Eye className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
              </div>
            )}
            </div>
          </div>
      )}

      {/* ==================== OBSERVAÇÕES ==================== */}
      {auction.historicoNotas && auction.historicoNotas.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200 flex items-center gap-2">
            <Info className="h-5 w-5" />
              Histórico de Observações ({auction.historicoNotas.length})
          </h2>
          
          <div className="space-y-4 max-h-80 overflow-y-auto">
              {auction.historicoNotas.map((note, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-300">
                <p className="text-gray-700 leading-relaxed mb-2">{note}</p>
                <p className="text-xs text-gray-500 font-medium">
                  Observação #{String(index + 1).padStart(2, '0')}
                </p>
                </div>
              ))}
            </div>
        </div>
      )}
    </div>
  );
}
