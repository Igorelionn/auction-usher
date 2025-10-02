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
    queryFn: async () => {
      console.log('🔍 Buscando leilões do banco de dados...');
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

          console.log(`📄 Carregando documentos para arrematante ${bidder.nome}:`, {
            totalDocuments: auction.documents?.length || 0,
            arrematanteDocuments: arrematanteDocumentos.length,
            documentsList: arrematanteDocumentos.map((doc: any) => ({
              nome: doc.nome,
              tipo: doc.tipo,
              hasUrl: !!doc.url
            }))
          });
          
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
        console.log('🔄 Iniciando conversão de fotos da mercadoria:', fotosMercadoria.map(f => ({nome: f.nome, hasUrl: !!f.url, urlType: f.url?.substring(0, 10)})));
        
        const documentosParaInserir = await Promise.all(
          fotosMercadoria.map(async (foto, index) => {
            let base64Data = null;
            
            console.log(`📸 Processando foto ${index + 1}:`, {
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
                  console.warn(`⚠️ Foto ${foto.nome} muito grande (${base64Data.length} chars), reduzindo qualidade...`);
                }
              } catch (error) {
                console.error(`❌ Erro ao converter ${foto.nome} para base64:`, error);
              }
            } else {
              console.log(`⚠️ Foto ${foto.nome} não tem URL blob válida`);
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

        console.log('📤 Enviando fotos para Supabase:', documentosParaInserir.map(doc => ({
          auction_id: doc.auction_id,
          nome: doc.nome,
          categoria: doc.categoria,
          tipo: doc.tipo,
          tamanho: doc.tamanho,
          hasUrl: !!doc.url,
          urlLength: doc.url?.length || 0,
          descricao: doc.descricao
        })));
        
        const { error: docsError } = await supabaseClient
          .from('documents')
          .insert(documentosParaInserir);
          
        if (docsError) {
          console.error('❌ Erro ao salvar fotos:', {
            error: docsError,
            message: docsError.message,
            details: docsError.details,
            hint: docsError.hint,
            code: docsError.code
          });
          throw docsError;
        } else {
          console.log(`✅ ${fotosMercadoria.length} fotos salvas com sucesso`);
        }
      }

      // Salvar documentos gerais (se houver)
      if (documentos && documentos.length > 0) {
        console.log('🔄 Iniciando conversão de documentos:', documentos.map(d => ({nome: d.nome, hasUrl: !!d.url, urlType: d.url?.substring(0, 10)})));
        
        const documentosParaInserir = await Promise.all(
          documentos.map(async (doc, index) => {
            let base64Data = null;
            
            console.log(`📄 Processando documento ${index + 1}:`, {
              nome: doc.nome,
              tipo: doc.tipo,
              tamanho: doc.tamanho,
              hasUrl: !!doc.url,
              urlStart: doc.url?.substring(0, 20)
            });
            
            // Se o documento tem uma URL blob, converter para base64
            if (doc.url && doc.url.startsWith('blob:')) {
              try {
                console.log(`🔄 Convertendo ${doc.nome} para base64...`);
                const response = await fetch(doc.url);
                const blob = await response.blob();
                const base64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                });
                base64Data = base64;
                console.log(`✅ Conversão concluída para ${doc.nome}:`, {
                  base64Length: base64Data?.length || 0,
                  base64Start: base64Data?.substring(0, 50)
                });
                
                // Verificar se o base64 não é muito grande (limite de ~10MB em base64 para documentos)
                if (base64Data && base64Data.length > 10000000) {
                  console.warn(`⚠️ Documento ${doc.nome} muito grande (${base64Data.length} chars), mas será salvo assim mesmo`);
                }
              } catch (error) {
                console.error(`❌ Erro ao converter ${doc.nome} para base64:`, error);
              }
            } else {
              console.log(`⚠️ Documento ${doc.nome} não tem URL blob válida`);
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
        
        const { error: docsError } = await supabaseClient
          .from('documents')
          .insert(documentosParaInserir);
          
        if (docsError) {
          console.error('❌ Erro ao salvar documentos:', {
            error: docsError,
            message: docsError.message,
            details: docsError.details,
            hint: docsError.hint,
            code: docsError.code
          });
          throw docsError;
        } else {
          console.log(`✅ ${documentos.length} documentos salvos com sucesso`);
        }
      }

      return mapSupabaseAuctionToApp(created);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUCTIONS_KEY }),
  });

  // Mutation para atualizar leilão
  const updateMutation = useMutation({
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
            console.log('🔄 Iniciando conversão de documentos do arrematante:', data.arrematante.documentos.map(d => ({nome: d.nome, hasUrl: !!d.url, urlType: d.url?.substring(0, 10)})));
            
            const documentosParaInserir = await Promise.all(
              data.arrematante.documentos.map(async (doc, index) => {
                let base64Data = null;
                
                console.log(`📄 Processando documento ${index + 1} (arrematante):`, {
                  nome: doc.nome,
                  tipo: doc.tipo,
                  tamanho: doc.tamanho,
                  hasUrl: !!doc.url,
                  urlStart: doc.url?.substring(0, 20)
                });
                
                // Se o documento tem uma URL (blob ou base64), processar
                if (doc.url) {
                  if (doc.url.startsWith('blob:')) {
                    try {
                      console.log(`🔄 Convertendo ${doc.nome} para base64...`);
                      const response = await fetch(doc.url);
                      const blob = await response.blob();
                      base64Data = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = () => reject(new Error('Erro no FileReader'));
                        reader.readAsDataURL(blob);
                      });
                      console.log(`✅ Documento ${doc.nome} convertido com sucesso (${base64Data.length} chars)`);
                    } catch (error) {
                      console.error(`❌ Erro ao converter ${doc.nome} para base64:`, error);
                    }
                  } else if (doc.url.startsWith('data:')) {
                    console.log(`✅ Documento ${doc.nome} já em base64, mantendo...`);
                    base64Data = doc.url;
                  } else {
                    console.log(`⚠️ Documento ${doc.nome} tem URL não reconhecida`);
                  }
                } else {
                  console.log(`⚠️ Documento ${doc.nome} não tem URL`);
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

            console.log('📤 Enviando documentos do arrematante para Supabase:', documentosParaInserir.map(doc => ({
              auction_id: doc.auction_id,
              nome: doc.nome,
              categoria: doc.categoria,
              tipo: doc.tipo,
              tamanho: doc.tamanho,
              hasUrl: !!doc.url,
              urlLength: doc.url?.length || 0,
              descricao: doc.descricao
            })));
            
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
            } else {
              console.log(`✅ ${data.arrematante.documentos.length} documentos do arrematante salvos com sucesso`);
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
          console.log('🔄 Iniciando conversão de fotos na atualização:', fotosMercadoria.map(f => ({nome: f.nome, hasUrl: !!f.url, urlType: f.url?.substring(0, 10)})));
          
          const documentosParaInserir = await Promise.all(
            fotosMercadoria.map(async (foto, index) => {
              let base64Data = null;
              
              console.log(`📸 Processando foto ${index + 1} (update):`, {
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
                  
                  if (base64Data && base64Data.length > 7000000) {
                    console.warn(`⚠️ Foto ${foto.nome} muito grande (${base64Data.length} chars)`);
                  }
                } catch (error) {
                  console.error(`❌ Erro ao converter ${foto.nome} para base64:`, error);
                }
              } else if (foto.url && foto.url.startsWith('data:')) {
                // Se já é base64, manter
                base64Data = foto.url;
                console.log(`✅ Foto ${foto.nome} já em base64, mantendo...`);
              } else {
                console.log(`⚠️ Foto ${foto.nome} não tem URL válida`);
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
          } else {
            console.log(`✅ ${fotosMercadoria.length} fotos atualizadas com sucesso`);
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
          console.log('🔄 Iniciando conversão de documentos na atualização:', documentos.map(d => ({nome: d.nome, hasUrl: !!d.url, urlType: d.url?.substring(0, 10)})));
          
          const documentosParaInserir = await Promise.all(
            documentos.map(async (doc, index) => {
              let base64Data = null;
              
              console.log(`📄 Processando documento ${index + 1} (update):`, {
                nome: doc.nome,
                tipo: doc.tipo,
                tamanho: doc.tamanho,
                hasUrl: !!doc.url,
                urlStart: doc.url?.substring(0, 20)
              });
              
              // Se o documento tem uma URL blob, converter para base64
              if (doc.url && doc.url.startsWith('blob:')) {
                try {
                  console.log(`🔄 Convertendo ${doc.nome} para base64...`);
                  const response = await fetch(doc.url);
                  const blob = await response.blob();
                  const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                  });
                  base64Data = base64;
                  console.log(`✅ Conversão concluída para ${doc.nome}:`, {
                    base64Length: base64Data?.length || 0,
                    base64Start: base64Data?.substring(0, 50)
                  });
                  
                  if (base64Data && base64Data.length > 10000000) {
                    console.warn(`⚠️ Documento ${doc.nome} muito grande (${base64Data.length} chars)`);
                  }
                } catch (error) {
                  console.error(`❌ Erro ao converter ${doc.nome} para base64:`, error);
                }
              } else if (doc.url && doc.url.startsWith('data:')) {
                // Se já é base64, manter
                base64Data = doc.url;
                console.log(`✅ Documento ${doc.nome} já em base64, mantendo...`);
              } else {
                console.log(`⚠️ Documento ${doc.nome} não tem URL válida`);
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
          } else {
            console.log(`✅ ${documentos.length} documentos atualizados com sucesso`);
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUCTIONS_KEY }),
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
      console.log('🗂️ Arquivando leilão:', id);
      
      const { data, error } = await supabaseClient
        .from('auctions')
        .update({ arquivado: true })
        .eq('id', id)
        .select('id, arquivado');

      if (error) {
        console.error('❌ Erro ao arquivar leilão:', error);
        throw error;
      }
      
      console.log('✅ Leilão arquivado com sucesso:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('🔄 Invalidando cache após arquivar...');
      queryClient.invalidateQueries({ queryKey: AUCTIONS_KEY });
    },
  });

  // Mutation para desarquivar leilão
  const unarchiveMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('📤 Desarquivando leilão:', id);
      
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
      
      console.log('📋 Estado atual do leilão:', current);
      
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
      
      console.log('✅ Leilão desarquivado com sucesso:', data);
      
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
      } else {
        console.log('🔍 Verificação pós-desarquivamento:', verification);
      }
      
      return data;
    },
    onSuccess: (data) => {
      console.log('🔄 Invalidando cache após desarquivar...');
      
      // Limpar cache específico do leilão
      queryClient.removeQueries({ queryKey: AUCTIONS_KEY });
      
      // Forçar refetch imediato
      queryClient.invalidateQueries({ queryKey: AUCTIONS_KEY });
      queryClient.refetchQueries({ queryKey: AUCTIONS_KEY });
      
      // Aguardar mais um momento e verificar novamente
      setTimeout(async () => {
        console.log('🔄 Verificação final após invalidação do cache...');
        const { data: finalCheck } = await supabaseClient
          .from('auctions')
          .select('id, arquivado')
          .eq('id', data?.[0]?.id)
          .single();
        console.log('🏁 Estado final do leilão:', finalCheck);
        
        // Verificar se o cache local também está correto
        const cachedData = queryClient.getQueryData(AUCTIONS_KEY) as Auction[];
        if (cachedData) {
          const cachedAuction = cachedData.find(a => a.id === data?.[0]?.id);
          console.log('💾 Estado no cache local:', cachedAuction ? { id: cachedAuction.id, arquivado: cachedAuction.arquivado } : 'não encontrado');
        }
      }, 1000);
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
