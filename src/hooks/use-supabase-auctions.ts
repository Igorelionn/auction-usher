import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseClient } from "@/lib/supabase-client";
import { Auction, AuctionStatus } from "@/lib/types";
import { Database } from "@/lib/database.types";

type AuctionRow = Database['public']['Tables']['auctions']['Row'];
type AuctionInsert = Database['public']['Tables']['auctions']['Insert'];
type AuctionUpdate = Database['public']['Tables']['auctions']['Update'];

const AUCTIONS_KEY = ["supabase-auctions"] as const;

// Função para calcular status automaticamente baseado nas datas
function calculateAuctionStatus(dataInicio: string, dataEncerramento?: string): AuctionStatus {
  // Criar datas usando apenas YYYY-MM-DD para evitar problemas de timezone
  const hoje = new Date();
  const hojeStr = hoje.getFullYear() + '-' + 
                 String(hoje.getMonth() + 1).padStart(2, '0') + '-' + 
                 String(hoje.getDate()).padStart(2, '0');
  
  // Normalizar as datas de entrada para formato YYYY-MM-DD
  const inicioNormalizado = dataInicio.length === 10 ? dataInicio : 
                           dataInicio.split('/').reverse().join('-');
  
  const encerramentoNormalizado = dataEncerramento ? 
    (dataEncerramento.length === 10 ? dataEncerramento : 
     dataEncerramento.split('/').reverse().join('-')) : null;
  
  // Comparação simples de strings no formato YYYY-MM-DD
  if (hojeStr < inicioNormalizado) {
    return "agendado";
  } else if (encerramentoNormalizado && hojeStr > encerramentoNormalizado) {
    return "finalizado";
  } else {
    return "em_andamento";
  }
}

// Função para converter dados do Supabase para o formato do app
function mapSupabaseAuctionToApp(auction: AuctionRow): Auction {
  // Calcular status correto baseado nas datas
  const statusCalculado = calculateAuctionStatus(auction.data_inicio, auction.data_encerramento || undefined);
  
  return {
    id: auction.id,
    nome: auction.nome,
    identificacao: auction.identificacao || undefined,
    local: auction.local as Auction['local'],
    endereco: auction.endereco || undefined,
    dataInicio: auction.data_inicio,
    dataEncerramento: auction.data_encerramento || undefined,
    tipoPagamento: auction.tipo_pagamento as Auction['tipoPagamento'] || undefined,
    mesInicioPagamento: auction.mes_inicio_pagamento || undefined,
    diaVencimentoPadrao: auction.dia_vencimento_padrao || undefined,
    dataEntrada: auction.data_entrada || undefined,
    dataVencimentoVista: auction.data_vencimento_vista || undefined,
    parcelasPadrao: auction.parcelas_padrao || undefined,
    status: statusCalculado, // Usar status calculado em vez do status salvo
    custos: auction.custos_texto || undefined,
    custosNumerico: auction.custos_numerico ? Number(auction.custos_numerico) : undefined,
    detalheCustos: (auction as any).detalhe_custos || undefined,
    detalhePatrocinios: (auction as any).detalhe_patrocinios || undefined,
    patrociniosTotal: (auction as any).patrocinios_total ? Number((auction as any).patrocinios_total) : undefined,
    lotes: auction.lotes as any || [],
    fotosMercadoria: (auction as any).documents?.filter((doc: any) => doc.categoria === 'leilao_fotos_mercadoria').map((doc: any) => ({
      id: doc.id,
      nome: doc.nome,
      tipo: doc.tipo,
      tamanho: doc.tamanho,
      dataUpload: doc.data_upload,
      url: doc.url // Usar URL salva no banco (base64)
    })) || [],
    documentos: (auction as any).documents?.filter((doc: any) => doc.categoria === 'leilao_geral').map((doc: any) => ({
      id: doc.id,
      nome: doc.nome,
      tipo: doc.tipo,
      tamanho: doc.tamanho,
      dataUpload: doc.data_upload,
      url: doc.url // Usar URL salva no banco (base64 ou null para documentos)
    })) || [],
    historicoNotas: auction.historico_notas || undefined,
    arquivado: auction.arquivado || false,
  };
}

// Função para converter dados do app para o formato do Supabase
function mapAppAuctionToSupabase(auction: Omit<Auction, "id">): AuctionInsert {
  return {
    nome: auction.nome,
    identificacao: auction.identificacao,
    local: auction.local as Database['public']['Enums']['location_type'],
    endereco: auction.endereco,
    data_inicio: auction.dataInicio,
    data_encerramento: auction.dataEncerramento,
    tipo_pagamento: auction.tipoPagamento,
    mes_inicio_pagamento: auction.mesInicioPagamento,
    dia_vencimento_padrao: auction.diaVencimentoPadrao,
    data_entrada: auction.dataEntrada,
    data_vencimento_vista: auction.dataVencimentoVista,
    parcelas_padrao: auction.parcelasPadrao,
    status: auction.status as Database['public']['Enums']['auction_status'],
    custos_texto: auction.custos,
    custos_numerico: auction.custosNumerico,
    detalhe_custos: auction.detalheCustos as any,
    detalhe_patrocinios: auction.detalhePatrocinios as any,
    patrocinios_total: auction.patrociniosTotal,
    lotes: auction.lotes as any,
    historico_notas: auction.historicoNotas,
    arquivado: auction.arquivado,
  };
}

export function useSupabaseAuctions() {
  const queryClient = useQueryClient();

  // Query para listar leilões com arrematantes
  const listQuery = useQuery({
    queryKey: AUCTIONS_KEY,
    staleTime: 1000 * 10, // Considerar dados "frescos" por 10 segundos
    gcTime: 1000 * 60 * 5, // Manter em cache por 5 minutos (antes era cacheTime)
    refetchOnWindowFocus: false, // Não refazer query ao focar na janela
    refetchOnMount: false, // Não refazer query ao montar componente se já tem cache
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('auctions')
        .select(`
          *,
          bidders (
            nome,
            valor_pagar_texto,
            valor_pagar_numerico,
            valor_entrada_texto,
            dia_vencimento_mensal,
            quantidade_parcelas,
            parcelas_pagas,
            mes_inicio_pagamento,
            observacoes,
            documento,
            endereco,
            email,
            telefone,
            lote_id,
            pago,
            percentual_juros_atraso,
            tipo_juros_atraso
          ),
          documents (
            id,
            nome,
            tipo,
            categoria,
            tamanho,
            data_upload,
            url
          )
        `)
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      
      return data.map(auction => {
        const mappedAuction = mapSupabaseAuctionToApp(auction);
        
        // Adicionar arrematante se existir
        if (auction.bidders && auction.bidders.length > 0) {
          const bidder = auction.bidders[0] as any; // Assumindo um arrematante por leilão
          
          // Buscar documentos do arrematante na tabela documents
          const arrematanteDocumentos = auction.documents 
            ? auction.documents.filter((doc: any) => doc.categoria === 'arrematante_documentos')
            : [];

          
          mappedAuction.arrematante = {
            nome: bidder.nome,
            documento: bidder.documento || undefined,
            endereco: bidder.endereco || undefined,
            telefone: bidder.telefone || undefined,
            email: bidder.email || undefined,
            loteId: bidder.lote_id || undefined,
            valorPagar: bidder.valor_pagar_texto || '',
            valorPagarNumerico: bidder.valor_pagar_numerico ? Number(bidder.valor_pagar_numerico) : 0,
            valorEntrada: bidder.valor_entrada_texto || undefined,
            diaVencimentoMensal: bidder.dia_vencimento_mensal || 15,
            quantidadeParcelas: bidder.quantidade_parcelas || 12,
            parcelasPagas: bidder.parcelas_pagas || 0,
            mesInicioPagamento: bidder.mes_inicio_pagamento || new Date().toISOString().slice(0, 7),
            pago: bidder.pago || false,
            percentualJurosAtraso: bidder.percentual_juros_atraso || 0,
            tipoJurosAtraso: bidder.tipo_juros_atraso || "composto",
            documentos: arrematanteDocumentos.map((doc: any) => ({
              id: doc.id?.toString() || Date.now().toString(),
              nome: doc.nome,
              tipo: doc.tipo === 'pdf' ? 'application/pdf' :
                   doc.tipo === 'doc' ? 'application/msword' :
                   doc.tipo === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                   doc.tipo === 'xls' ? 'application/vnd.ms-excel' :
                   doc.tipo === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                   doc.tipo === 'jpg' ? 'image/jpeg' :
                   doc.tipo === 'png' ? 'image/png' : 'application/octet-stream',
              tamanho: doc.tamanho || 0,
              dataUpload: doc.data_upload || new Date().toISOString(),
              url: doc.url || undefined
            }))
          };
        }
        
        return mappedAuction;
      });
    },
  });

  // Mutation para criar leilão
  const createMutation = useMutation({
    mutationFn: async (data: Omit<Auction, "id">) => {
      // Separar campos de documentos dos demais dados
      const { fotosMercadoria, documentos, ...sanitizedData } = data;
      
      
      const { data: created, error } = await supabaseClient
        .from('auctions')
        .insert(mapAppAuctionToSupabase(sanitizedData as Omit<Auction, "id">))
        .select()
        .single();

      if (error) throw error;

      // Salvar fotos da mercadoria (se houver)
      if (fotosMercadoria && fotosMercadoria.length > 0) {
        
        const documentosParaInserir = await Promise.all(
          fotosMercadoria.map(async (foto, index) => {
            let base64Data = null;
            
            // Se a foto tem uma URL, processar
            if (foto.url) {
              if (foto.url.startsWith('blob:')) {
                // URL blob: converter para base64
                try {
                  const response = await fetch(foto.url);
                  const blob = await response.blob();
                  const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                  });
                  base64Data = base64;
                  
                  // Verificar se o base64 não é muito grande (limite de ~5MB em base64)
                  if (base64Data && base64Data.length > 7000000) {
                    console.warn(`⚠️ Foto ${foto.nome} muito grande (${base64Data.length} chars)`);
                  }
                } catch (error) {
                  console.error(`❌ Erro ao converter ${foto.nome} para base64:`, error);
                }
              } else if (foto.url.startsWith('data:')) {
                // Já está em base64: manter
                base64Data = foto.url;
              } else {
                console.warn(`⚠️ Foto ${foto.nome} tem URL não reconhecida: ${foto.url.substring(0, 30)}`);
              }
            }

            return {
              auction_id: created.id,
              nome: foto.nome,
              categoria: 'leilao_fotos_mercadoria' as const,
              tipo: foto.tipo.includes('jpeg') ? 'jpeg' as const :
                    foto.tipo.includes('jpg') ? 'jpg' as const :
                    foto.tipo.includes('png') ? 'png' as const :
                    foto.tipo.includes('gif') ? 'gif' as const : 'outros' as const,
              tamanho: foto.tamanho,
              data_upload: foto.dataUpload,
              url: base64Data, // Salvar base64 da imagem
              storage_path: foto.nome,
              descricao: `Leilão ${created.identificacao || created.nome}` // Identificar o leilão
            };
          })
        );

        // Filtrar apenas documentos com URL válida
        const documentosValidos = documentosParaInserir.filter(doc => doc.url !== null);
        
        if (documentosValidos.length > 0) {
          const { error: docsError } = await supabaseClient
            .from('documents')
            .insert(documentosValidos);
            
          if (docsError) {
            console.error('❌ Erro ao salvar fotos:', {
              error: docsError,
              message: docsError.message,
              details: docsError.details,
              hint: docsError.hint,
              code: docsError.code
            });
            throw docsError;
          }
        } else {
          console.warn(`⚠️ Nenhuma foto com URL válida para salvar (total: ${fotosMercadoria.length})`);
        }
      }

      // Salvar documentos gerais (se houver)
      if (documentos && documentos.length > 0) {
        const documentosParaInserir = await Promise.all(
          documentos.map(async (doc, index) => {
            let base64Data = null;
            
            // Se o documento tem uma URL, processar
            if (doc.url) {
              if (doc.url.startsWith('blob:')) {
                // URL blob: converter para base64
                try {
                  const response = await fetch(doc.url);
                  const blob = await response.blob();
                  const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                  });
                  base64Data = base64;
                  
                  // Verificar se o base64 não é muito grande (limite de ~10MB em base64 para documentos)
                  if (base64Data && base64Data.length > 10000000) {
                    console.warn(`⚠️ Documento ${doc.nome} muito grande (${base64Data.length} chars), mas será salvo assim mesmo`);
                  }
                } catch (error) {
                  console.error(`❌ Erro ao converter ${doc.nome} para base64:`, error);
                }
              } else if (doc.url.startsWith('data:')) {
                // Já está em base64: manter
                base64Data = doc.url;
              } else {
                console.warn(`⚠️ Documento ${doc.nome} tem URL não reconhecida: ${doc.url.substring(0, 30)}`);
              }
            }

            return {
              auction_id: created.id,
              nome: doc.nome,
              categoria: 'leilao_geral' as const,
              tipo: doc.tipo.includes('pdf') ? 'pdf' as const :
                    doc.tipo.includes('doc') ? 'doc' as const :
                    doc.tipo.includes('docx') ? 'docx' as const :
                    doc.tipo.includes('txt') ? 'txt' as const : 'outros' as const,
              tamanho: doc.tamanho,
              data_upload: doc.dataUpload,
              url: base64Data, // Salvar base64 do documento
              storage_path: doc.nome,
              descricao: `Leilão ${created.identificacao || created.nome}` // Identificar o leilão
            };
          })
        );

        // Filtrar apenas documentos com URL válida
        const documentosValidos = documentosParaInserir.filter(doc => doc.url !== null);
        
        if (documentosValidos.length > 0) {
          const { error: docsError } = await supabaseClient
            .from('documents')
            .insert(documentosValidos);
            
          if (docsError) {
            console.error('❌ Erro ao salvar documentos:', {
              error: docsError,
              message: docsError.message,
              details: docsError.details,
              hint: docsError.hint,
              code: docsError.code
            });
            throw docsError;
          }
        } else {
          console.warn(`⚠️ Nenhum documento com URL válida para salvar (total: ${documentos.length})`);
        }
      }

      return mapSupabaseAuctionToApp(created);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUCTIONS_KEY }),
  });

  // Mutation para atualizar leilão
  const updateMutation = useMutation({
    // Atualização otimista: atualizar cache antes de confirmar no servidor
    onMutate: async ({ id, data }: { id: string; data: Partial<Auction> }) => {
      // Cancelar refetch em andamento
      await queryClient.cancelQueries({ queryKey: AUCTIONS_KEY });
      
      // Snapshot do estado anterior
      const previousAuctions = queryClient.getQueryData(AUCTIONS_KEY);
      
      // Atualizar cache otimisticamente
      queryClient.setQueryData(AUCTIONS_KEY, (old: any) => {
        if (!old) return old;
        return old.map((auction: Auction) => 
          auction.id === id 
            ? { ...auction, ...data }
            : auction
        );
      });
      
      // Retornar contexto com snapshot para rollback se necessário
      return { previousAuctions };
    },
    // Se mutation falhar, fazer rollback
    onError: (_err, _variables, context) => {
      if (context?.previousAuctions) {
        queryClient.setQueryData(AUCTIONS_KEY, context.previousAuctions);
      }
    },
    mutationFn: async ({ id, data }: { id: string; data: Partial<Auction> }) => {
      // Separar campos de documentos dos demais dados
      const { fotosMercadoria, documentos, ...sanitizedData } = data;
      
      const updateData: AuctionUpdate = {};
      
      if (sanitizedData.nome !== undefined) updateData.nome = sanitizedData.nome;
      if (sanitizedData.identificacao !== undefined) updateData.identificacao = sanitizedData.identificacao;
      if (sanitizedData.local !== undefined) updateData.local = sanitizedData.local as Database['public']['Enums']['location_type'];
      if (sanitizedData.endereco !== undefined) updateData.endereco = sanitizedData.endereco;
      if (sanitizedData.dataInicio !== undefined) updateData.data_inicio = sanitizedData.dataInicio;
      if (sanitizedData.dataEncerramento !== undefined) updateData.data_encerramento = sanitizedData.dataEncerramento;
      if (sanitizedData.tipoPagamento !== undefined) updateData.tipo_pagamento = sanitizedData.tipoPagamento;
      if (sanitizedData.mesInicioPagamento !== undefined) updateData.mes_inicio_pagamento = sanitizedData.mesInicioPagamento;
      if (sanitizedData.diaVencimentoPadrao !== undefined) updateData.dia_vencimento_padrao = sanitizedData.diaVencimentoPadrao;
      if (sanitizedData.dataEntrada !== undefined) updateData.data_entrada = sanitizedData.dataEntrada;
      if (sanitizedData.dataVencimentoVista !== undefined) updateData.data_vencimento_vista = sanitizedData.dataVencimentoVista;
      if (sanitizedData.parcelasPadrao !== undefined) updateData.parcelas_padrao = sanitizedData.parcelasPadrao;
      if (sanitizedData.status !== undefined) updateData.status = sanitizedData.status as Database['public']['Enums']['auction_status'];
      if (sanitizedData.custos !== undefined) updateData.custos_texto = sanitizedData.custos;
      if (sanitizedData.custosNumerico !== undefined) updateData.custos_numerico = sanitizedData.custosNumerico;
      if (sanitizedData.detalheCustos !== undefined) updateData.detalhe_custos = sanitizedData.detalheCustos as any;
      if (sanitizedData.detalhePatrocinios !== undefined) updateData.detalhe_patrocinios = sanitizedData.detalhePatrocinios as any;
      if (sanitizedData.patrociniosTotal !== undefined) updateData.patrocinios_total = sanitizedData.patrociniosTotal;
      if (sanitizedData.lotes !== undefined) updateData.lotes = sanitizedData.lotes as any;
      if (sanitizedData.historicoNotas !== undefined) updateData.historico_notas = sanitizedData.historicoNotas;
      if (sanitizedData.arquivado !== undefined) updateData.arquivado = sanitizedData.arquivado;

      // Se tem arrematante, precisamos lidar com isso separadamente
      if (data.arrematante !== undefined) {
        if (data.arrematante) {
          // Primeiro, remover arrematante existente (se houver)
          await supabaseClient
            .from('bidders')
            .delete()
            .eq('auction_id', id);

          // Remover documentos existentes do arrematante
          await supabaseClient
            .from('documents')
            .delete()
            .eq('auction_id', id)
            .eq('categoria', 'arrematante_documentos');

          // Depois, inserir o novo arrematante
          const { error: bidderError } = await supabaseClient
            .from('bidders')
            .insert({
              auction_id: id,
            nome: data.arrematante.nome,
            documento: data.arrematante.documento,
            endereco: data.arrematante.endereco,
            telefone: data.arrematante.telefone,
            email: data.arrematante.email,
            lote_id: data.arrematante.loteId,
            valor_pagar_texto: data.arrematante.valorPagar,
            valor_pagar_numerico: data.arrematante.valorPagarNumerico,
            valor_entrada_texto: data.arrematante.valorEntrada || null,
            dia_vencimento_mensal: data.arrematante.diaVencimentoMensal,
            quantidade_parcelas: data.arrematante.quantidadeParcelas,
            parcelas_pagas: data.arrematante.parcelasPagas,
            mes_inicio_pagamento: data.arrematante.mesInicioPagamento,
            pago: data.arrematante.pago || false,
            percentual_juros_atraso: data.arrematante.percentualJurosAtraso || 0,
            tipo_juros_atraso: data.arrematante.tipoJurosAtraso || 'composto',
            });

          if (bidderError) throw bidderError;

          // Salvar documentos do arrematante na tabela documents
          if (data.arrematante.documentos && data.arrematante.documentos.length > 0) {
            const documentosParaInserir = await Promise.all(
              data.arrematante.documentos.map(async (doc, index) => {
                let base64Data = null;
                
                // Se o documento tem uma URL (blob ou base64), processar
                if (doc.url) {
                  if (doc.url.startsWith('blob:')) {
                    try {
                      const response = await fetch(doc.url);
                      const blob = await response.blob();
                      base64Data = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = () => reject(new Error('Erro no FileReader'));
                        reader.readAsDataURL(blob);
                      });
                    } catch (error) {
                      console.error(`❌ Erro ao converter ${doc.nome} para base64:`, error);
                    }
                  } else if (doc.url.startsWith('data:')) {
                    base64Data = doc.url;
                  }
                }

                return {
                  auction_id: id,
                  nome: doc.nome,
                  categoria: 'arrematante_documentos' as const,
                  tipo: doc.tipo.includes('pdf') ? 'pdf' as const :
                        doc.tipo.includes('doc') ? 'doc' as const :
                        doc.tipo.includes('docx') ? 'docx' as const :
                        doc.tipo.includes('xls') ? 'xls' as const :
                        doc.tipo.includes('xlsx') ? 'xlsx' as const :
                        doc.tipo.includes('jpeg') || doc.tipo.includes('jpg') ? 'jpg' as const :
                        doc.tipo.includes('png') ? 'png' as const : 'outros' as const,
                  tamanho: doc.tamanho,
                  data_upload: doc.dataUpload,
                  url: base64Data, // Salvar base64 do documento
                  storage_path: doc.nome,
                  descricao: `Arrematante ${data.arrematante.nome}` // Identificar o arrematante
                };
              })
            );

            const { error: docsError } = await supabaseClient
              .from('documents')
              .insert(documentosParaInserir);
              
            if (docsError) {
              console.error('❌ Erro ao salvar documentos do arrematante:', {
                error: docsError,
                message: docsError.message,
                details: docsError.details,
                hint: docsError.hint,
                code: docsError.code
              });
              throw docsError;
            }
          }
        } else {
          // Remover arrematante e seus documentos
          await supabaseClient
            .from('bidders')
            .delete()
            .eq('auction_id', id);

          // Remover documentos do arrematante
          const { error: deleteDocsError } = await supabaseClient
            .from('documents')
            .delete()
            .eq('auction_id', id)
            .eq('categoria', 'arrematante_documentos');

          if (deleteDocsError) throw deleteDocsError;
        }
      }

      // Salvar fotos da mercadoria (sempre processar, mesmo que array vazio)
      if (fotosMercadoria !== undefined) {
        // Remover documentos existentes de fotos da mercadoria
        await supabaseClient
          .from('documents')
          .delete()
          .eq('auction_id', id)
          .eq('categoria', 'leilao_fotos_mercadoria');

        // Inserir novos documentos de fotos (se houver)
        if (fotosMercadoria.length > 0) {
          const documentosParaInserir = await Promise.all(
            fotosMercadoria.map(async (foto, index) => {
              let base64Data = null;
              
              // Se a foto tem uma URL blob, converter para base64
              if (foto.url && foto.url.startsWith('blob:')) {
                try {
                  const response = await fetch(foto.url);
                  const blob = await response.blob();
                  const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                  });
                  base64Data = base64;
                  
                  if (base64Data && base64Data.length > 7000000) {
                    console.warn(`⚠️ Foto ${foto.nome} muito grande (${base64Data.length} chars)`);
                  }
                } catch (error) {
                  console.error(`❌ Erro ao converter ${foto.nome} para base64:`, error);
                }
              } else if (foto.url && foto.url.startsWith('data:')) {
                // Se já é base64, manter
                base64Data = foto.url;
              }

              return {
                auction_id: id,
                nome: foto.nome,
                categoria: 'leilao_fotos_mercadoria' as const,
                tipo: foto.tipo.includes('jpeg') ? 'jpeg' as const :
                      foto.tipo.includes('jpg') ? 'jpg' as const :
                      foto.tipo.includes('png') ? 'png' as const :
                      foto.tipo.includes('gif') ? 'gif' as const : 'outros' as const,
                tamanho: foto.tamanho,
                data_upload: foto.dataUpload,
                url: base64Data, // Salvar base64 da imagem
                storage_path: foto.nome,
                descricao: `Leilão ${id}` // Identificar o leilão
              };
            })
          );

          const { error: docsError } = await supabaseClient
            .from('documents')
            .insert(documentosParaInserir);

          if (docsError) {
            console.error('❌ Erro ao salvar fotos na atualização:', docsError);
            throw docsError;
          }
        }
      }

      // Salvar documentos gerais (sempre processar, mesmo que array vazio)
      if (documentos !== undefined) {
        // Remover documentos existentes gerais
        await supabaseClient
          .from('documents')
          .delete()
          .eq('auction_id', id)
          .eq('categoria', 'leilao_geral');

        // Inserir novos documentos gerais (se houver)
        if (documentos.length > 0) {
          const documentosParaInserir = await Promise.all(
            documentos.map(async (doc, index) => {
              let base64Data = null;
              
              // Se o documento tem uma URL blob, converter para base64
              if (doc.url && doc.url.startsWith('blob:')) {
                try {
                  const response = await fetch(doc.url);
                  const blob = await response.blob();
                  const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                  });
                  base64Data = base64;
                  
                  if (base64Data && base64Data.length > 10000000) {
                    console.warn(`⚠️ Documento ${doc.nome} muito grande (${base64Data.length} chars)`);
                  }
                } catch (error) {
                  console.error(`❌ Erro ao converter ${doc.nome} para base64:`, error);
                }
              } else if (doc.url && doc.url.startsWith('data:')) {
                // Se já é base64, manter
                base64Data = doc.url;
              }

              return {
                auction_id: id,
                nome: doc.nome,
                categoria: 'leilao_geral' as const,
                tipo: doc.tipo.includes('pdf') ? 'pdf' as const :
                      doc.tipo.includes('doc') ? 'doc' as const :
                      doc.tipo.includes('docx') ? 'docx' as const :
                      doc.tipo.includes('txt') ? 'txt' as const : 'outros' as const,
                tamanho: doc.tamanho,
                data_upload: doc.dataUpload,
                url: base64Data, // Salvar base64 do documento
                storage_path: doc.nome,
                descricao: `Leilão ${id}` // Identificar o leilão
              };
            })
          );

          const { error: docsError } = await supabaseClient
            .from('documents')
            .insert(documentosParaInserir);

          if (docsError) {
            console.error('❌ Erro ao salvar documentos na atualização:', docsError);
            throw docsError;
          }
        }
      }

      // Só atualizar a tabela auctions se houver dados para atualizar
      if (Object.keys(updateData).length > 0) {
        const { data: updated, error } = await supabaseClient
          .from('auctions')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return mapSupabaseAuctionToApp(updated);
      } else {
        // Se só atualizamos o arrematante, buscar os dados atualizados do leilão
        const { data: current, error } = await supabaseClient
          .from('auctions')
          .select(`
            *,
            bidders (
              nome,
              valor_pagar_texto,
              valor_pagar_numerico,
              valor_entrada_texto,
              dia_vencimento_mensal,
              quantidade_parcelas,
              parcelas_pagas,
              mes_inicio_pagamento,
              observacoes,
              documento,
              endereco,
              email,
              telefone,
              lote_id,
              pago
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        
        const mappedAuction = mapSupabaseAuctionToApp(current);
        
        // Adicionar arrematante atualizado se existir
        if (current.bidders && current.bidders.length > 0) {
          const bidder = current.bidders[0] as any;
          mappedAuction.arrematante = {
            nome: bidder.nome,
            documento: bidder.documento || undefined,
            endereco: bidder.endereco || undefined,
            telefone: bidder.telefone || undefined,
            email: bidder.email || undefined,
            loteId: bidder.lote_id || undefined,
            valorPagar: bidder.valor_pagar_texto || '',
            valorPagarNumerico: bidder.valor_pagar_numerico ? Number(bidder.valor_pagar_numerico) : 0,
            valorEntrada: bidder.valor_entrada_texto || undefined,
            diaVencimentoMensal: bidder.dia_vencimento_mensal || 15,
            quantidadeParcelas: bidder.quantidade_parcelas || 12,
            parcelasPagas: bidder.parcelas_pagas || 0,
            mesInicioPagamento: bidder.mes_inicio_pagamento || new Date().toISOString().slice(0, 7),
            pago: bidder.pago || false,
            documentos: [],
          };
        }
        
        return mappedAuction;
      }
    },
    // Invalidar queries sem aguardar (background)
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUCTIONS_KEY });
    },
    // Sempre invalidar ao finalizar (mesmo com erro)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: AUCTIONS_KEY });
    }
  });

  // Mutation para deletar leilão
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseClient
        .from('auctions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUCTIONS_KEY }),
  });

  // Mutation para arquivar leilão
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      
      const { data, error } = await supabaseClient
        .from('auctions')
        .update({ arquivado: true })
        .eq('id', id)
        .select('id, arquivado');

      if (error) {
        console.error('❌ Erro ao arquivar leilão:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: AUCTIONS_KEY });
    },
  });

  // Mutation para desarquivar leilão
  const unarchiveMutation = useMutation({
    mutationFn: async (id: string) => {
      // Primeiro verificar o estado atual
      const { data: current, error: fetchError } = await supabaseClient
        .from('auctions')
        .select('id, arquivado')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('❌ Erro ao buscar leilão atual:', fetchError);
        throw fetchError;
      }
      
      // Fazer a atualização
      const { data, error } = await supabaseClient
        .from('auctions')
        .update({ 
          arquivado: false,
          updated_at: new Date().toISOString() // Forçar atualização do timestamp
        })
        .eq('id', id)
        .select('id, arquivado, updated_at');

      if (error) {
        console.error('❌ Erro ao desarquivar leilão:', error);
        throw error;
      }
      
      // Aguardar um momento para garantir que a alteração foi persistida
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verificar se a alteração foi realmente salva
      const { data: verification, error: verifyError } = await supabaseClient
        .from('auctions')
        .select('id, arquivado, updated_at')
        .eq('id', id)
        .single();
        
      if (verifyError) {
        console.error('❌ Erro na verificação:', verifyError);
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Limpar cache específico do leilão
      queryClient.removeQueries({ queryKey: AUCTIONS_KEY });
      
      // Forçar refetch imediato
      queryClient.invalidateQueries({ queryKey: AUCTIONS_KEY });
      queryClient.refetchQueries({ queryKey: AUCTIONS_KEY });
    },
  });

  // Mutation para duplicar leilão
  const duplicateMutation = useMutation({
    mutationFn: async (auction: Auction) => {
      const { id, ...auctionData } = auction;
      const duplicatedAuction = {
        ...auctionData,
        nome: `${auction.nome} (Cópia)`,
        identificacao: auction.identificacao ? `${auction.identificacao}-COPY` : undefined,
        arquivado: false
      };

      const { data: created, error } = await supabaseClient
        .from('auctions')
        .insert(mapAppAuctionToSupabase(duplicatedAuction))
        .select()
        .single();

      if (error) throw error;
      return mapSupabaseAuctionToApp(created);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUCTIONS_KEY }),
  });

  // Processar leilões: ordenar por prioridade
  const processedAuctions = useMemo(() => {
    if (!listQuery.data) return [];
    
    return [...listQuery.data].sort((a, b) => {
      // Prioridade por status: em_andamento > agendado > finalizado
      const statusPriority = {
        em_andamento: 3,
        agendado: 2,
        finalizado: 1
      };
      
      const priorityA = statusPriority[a.status];
      const priorityB = statusPriority[b.status];
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Maior prioridade primeiro
      }
      
      // Se mesmo status, ordenar por data de início (mais próxima primeiro)
      const dateA = new Date(a.dataInicio + 'T00:00:00.000Z');
      const dateB = new Date(b.dataInicio + 'T00:00:00.000Z');
      
      return dateA.getTime() - dateB.getTime();
    });
  }, [listQuery.data]);

  return useMemo(() => ({
    auctions: processedAuctions,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error,
    createAuction: createMutation.mutateAsync,
    updateAuction: updateMutation.mutateAsync,
    deleteAuction: deleteMutation.mutateAsync,
    archiveAuction: archiveMutation.mutateAsync,
    unarchiveAuction: unarchiveMutation.mutateAsync,
    duplicateAuction: duplicateMutation.mutateAsync,
  }), [
    processedAuctions, 
    listQuery.isLoading, 
    listQuery.isFetching, 
    listQuery.error,
    createMutation.mutateAsync, 
    updateMutation.mutateAsync, 
    deleteMutation.mutateAsync, 
    archiveMutation.mutateAsync, 
    unarchiveMutation.mutateAsync, 
    duplicateMutation.mutateAsync
  ]);
}
