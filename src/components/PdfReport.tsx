import React, { useState } from 'react';
import { Auction } from '@/lib/types';
import { Calendar, MapPin, DollarSign, FileText, Clock, Building, Globe, Users, CreditCard, User, Package, Image, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface PdfReportProps {
  auction: Auction;
}

export const PdfReport: React.FC<PdfReportProps> = ({ auction }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableData, setEditableData] = useState({
    nome: auction.nome || '',
    endereco: auction.endereco || '',
    observacoes: auction.historicoNotas?.join('; ') || '',
    identificacao: auction.identificacao || '',
    custos: auction.custosNumerico ? auction.custosNumerico.toString() : (auction.custos || ''),
    // Arrematante
    arrematanteNome: auction.arrematante?.nome || '',
    arrematanteDocumento: auction.arrematante?.documento || '',
    arrematanteEmail: auction.arrematante?.email || '',
    arrematanteTelefone: auction.arrematante?.telefone || '',
    arrematanteEndereco: auction.arrematante?.endereco || '',
    arrematanteValorPagar: auction.arrematante?.valorPagar || '',
    // Configurações
    diaVencimentoPadrao: auction.diaVencimentoPadrao?.toString() || '',
    parcelasPadrao: auction.parcelasPadrao?.toString() || '',
    mesInicioPagamento: auction.mesInicioPagamento || '',
  });
  const formatCurrency = (value: string | number | undefined) => {
    if (!value && value !== 0) return 'R$ 0,00';
    
    if (typeof value === 'number') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    }
    
    if (typeof value === 'string') {
      // Se já tem formatação R$, retorna como está
      if (value.startsWith('R$')) return value;
      
      // Tenta converter string para número
      const cleanValue = value.replace(/[^\d.,]/g, '');
      if (cleanValue.includes(',')) {
        // Formato brasileiro (ex: 90.000,00 ou 90000,00)
        const numericValue = parseFloat(cleanValue.replace(/\./g, '').replace(',', '.'));
        if (!isNaN(numericValue)) {
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(numericValue);
        }
      } else if (cleanValue) {
        // Formato americano ou número inteiro
        const numericValue = parseFloat(cleanValue);
        if (!isNaN(numericValue)) {
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(numericValue);
        }
      }
      
      // Se não conseguiu converter, adiciona R$ se não tiver
      return `R$ ${value}`;
    }
    
    return 'R$ 0,00';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    try {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Não informado';
    return timeString;
  };

  const formatMonthYear = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    try {
      const date = new Date(dateString + 'T00:00:00');
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      return `${monthNames[date.getMonth()]}/${date.getFullYear()}`;
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

  const getPaymentStatus = () => {
    if (!auction.arrematante) return 'Não informado';
    
    if (auction.arrematante.pago) return 'Pago';
    
    // Encontrar o lote arrematado baseado no loteId do arrematante
    const loteArrematado = auction.arrematante?.loteId 
      ? auction.lotes?.find(lote => lote.id === auction.arrematante.loteId)
      : null;
    
    // Usar tipo de pagamento do lote específico ou fallback para global
    const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento;
    
    // Verificar se está atrasado baseado no tipo de pagamento
    const now = new Date();
    
    if (tipoPagamento === 'a_vista') {
      const dataVencimento = loteArrematado?.dataVencimentoVista || auction.dataVencimentoVista;
      if (dataVencimento) {
        const dueDate = new Date(dataVencimento);
        dueDate.setHours(23, 59, 59, 999);
        return now > dueDate ? 'Atrasado' : 'Pendente';
      }
    }
    
    if (tipoPagamento === 'entrada_parcelamento') {
      const dataEntrada = loteArrematado?.dataEntrada || auction.dataEntrada;
      if (dataEntrada) {
        const entryDueDate = new Date(dataEntrada);
        entryDueDate.setHours(23, 59, 59, 999);
        if (now > entryDueDate) return 'Atrasado';
      }
    }
    
    // Para parcelamento ou entrada+parcelamento, verificar primeira parcela
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
          return 'Atrasado';
        }
      } catch (error) {
        console.error('Erro ao calcular status de pagamento:', error);
      }
    }
    
    return 'Pendente';
  };

  const getTipoPagamentoLabel = (tipoPagamento?: string) => {
    switch (tipoPagamento) {
      case 'a_vista': return 'À Vista';
      case 'parcelamento': return 'Parcelamento';
      case 'entrada_parcelamento': return 'Entrada + Parcelamento';
      default: return 'Parcelamento (padrão)';
    }
  };


  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      {/* Botões de Controle de Edição */}
      <div className="flex justify-end gap-2 mb-4 print:hidden">
        {!isEditMode ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditMode(true)}
            className="gap-2 hover:bg-gray-100 hover:text-gray-900"
          >
            <Edit className="h-4 w-4" />
            Editar PDF
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditMode(false)}
              className="gap-2 hover:bg-gray-100 hover:text-gray-900"
            >
              <Save className="h-4 w-4" />
              Salvar
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setEditableData({
                  nome: auction.nome || '',
                  endereco: auction.endereco || '',
                  observacoes: auction.historicoNotas?.join('; ') || '',
                  identificacao: auction.identificacao || '',
                  custos: auction.custosNumerico ? auction.custosNumerico.toString() : (auction.custos || ''),
                  // Arrematante
                  arrematanteNome: auction.arrematante?.nome || '',
                  arrematanteDocumento: auction.arrematante?.documento || '',
                  arrematanteEmail: auction.arrematante?.email || '',
                  arrematanteTelefone: auction.arrematante?.telefone || '',
                  arrematanteEndereco: auction.arrematante?.endereco || '',
                  arrematanteValorPagar: auction.arrematante?.valorPagar || '',
                  // Configurações
                  diaVencimentoPadrao: auction.diaVencimentoPadrao?.toString() || '',
                  parcelasPadrao: auction.parcelasPadrao?.toString() || '',
                  mesInicioPagamento: auction.mesInicioPagamento || '',
                });
                setIsEditMode(false);
              }}
              className="gap-2 hover:bg-gray-100 hover:text-gray-900"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        )}
      </div>

      <div id="pdf-content" className="bg-white p-8 max-w-4xl mx-auto text-black" style={{ pageBreakInside: 'avoid' }}>
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-gray-300 pb-6 break-inside-avoid" style={{ pageBreakInside: 'avoid', pageBreakAfter: 'avoid' }}>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            RELATÓRIO DE LEILÃO
            {(editableData.identificacao || editableData.nome) && (
              <span className="block text-lg font-medium text-gray-600 mt-2">
                {editableData.identificacao ? `#${editableData.identificacao}` : `${editableData.nome}`}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-4">
            Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
          </p>
        </div>

       {/* Identificação do Leilão */}
       <div className="mb-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
         <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
           <FileText className="h-5 w-5" />
           IDENTIFICAÇÃO DO LEILÃO
         </h2>
         <div className="grid grid-cols-2 gap-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
           <div>
             <strong>Código de Identificação:</strong>{' '}
             {isEditMode ? (
               <Input
                 value={editableData.identificacao}
                 onChange={(e) => setEditableData({ ...editableData, identificacao: e.target.value })}
                 className="inline-block w-auto min-w-[150px] h-6 text-sm border-gray-300"
                 placeholder="Código do leilão"
               />
             ) : (
               editableData.identificacao || auction.identificacao || 'Não informado'
             )}
           </div>
           <div>
             <strong>Nome do Evento:</strong>{' '}
             {isEditMode ? (
               <Input
                 value={editableData.nome}
                 onChange={(e) => setEditableData({ ...editableData, nome: e.target.value })}
                 className="inline-block w-auto min-w-[200px] h-6 text-sm border-gray-300"
                 placeholder="Nome do evento"
               />
             ) : (
               editableData.nome || auction.nome || 'Não informado'
             )}
           </div>
           <div>
             <strong>Status:</strong> {getStatusLabel(auction.status)}
           </div>
         </div>
       </div>

      {/* Cronograma */}
      <div className="mb-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
          <Building className="h-5 w-5" />
          CRONOGRAMA DO EVENTO
        </h2>
        <div className="grid grid-cols-2 gap-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
          <div>
            <strong>Data de Início:</strong> {formatDate(auction.dataInicio)}
          </div>
          <div>
            <strong>Data de Encerramento:</strong> {formatDate(auction.dataEncerramento || '')}
          </div>
          <div className="col-span-2">
            <strong>Observações:</strong>{' '}
            {isEditMode ? (
              <Textarea
                value={editableData.observacoes}
                onChange={(e) => setEditableData({ ...editableData, observacoes: e.target.value })}
                className="w-full text-sm border-gray-300 mt-1 min-h-[60px]"
                placeholder="Observações e notas do leilão"
              />
            ) : (
              editableData.observacoes || auction.historicoNotas?.join('; ') || 'Não informado'
            )}
          </div>
        </div>
      </div>

      {/* Local */}
      <div className="mb-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
          <MapPin className="h-5 w-5" />
          LOCAL DO EVENTO
        </h2>
        <div className="grid grid-cols-1 gap-3 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
          <div>
            <strong>Modalidade:</strong> {getLocalLabel(auction.local)}
          </div>
          <div>
            <strong>Endereço do Evento:</strong>{' '}
            {isEditMode ? (
              <Input
                value={editableData.endereco}
                onChange={(e) => setEditableData({ ...editableData, endereco: e.target.value })}
                className="inline-block w-full max-w-lg h-8 text-sm border-gray-300 mt-1"
                placeholder="Endereço do evento"
              />
            ) : (
              editableData.endereco || auction.endereco || 'Não informado'
            )}
          </div>
        </div>
      </div>

      {/* Informações Financeiras */}
      <div className="mb-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
          <DollarSign className="h-5 w-5" />
          INFORMAÇÕES FINANCEIRAS
        </h2>
        <div className="grid grid-cols-1 gap-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
          <div>
            <strong>Custos:</strong>{' '}
            {isEditMode ? (
              <Input
                value={editableData.custos}
                onChange={(e) => setEditableData({ ...editableData, custos: e.target.value })}
                className="inline-block w-auto min-w-[120px] h-6 text-sm border-gray-300"
                placeholder="R$ 0,00"
              />
            ) : (
              (() => {
                // Priorizar custosNumerico se disponível
                if (auction.custosNumerico && auction.custosNumerico > 0) {
                  return formatCurrency(auction.custosNumerico);
                }
                
                // Fallback para custos como string (editableData ou auction.custos)
                const custosValue = editableData.custos || auction.custos;
                if (custosValue && custosValue.toString().trim() !== "") {
                  if (typeof custosValue === 'string') {
                    return custosValue.startsWith('R$') ? custosValue : `R$ ${custosValue}`;
                  } else {
                    return `R$ ${(custosValue as number).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  }
                }
                
                return "R$ 0,00";
              })()
            )}
          </div>
        </div>
      </div>

       {/* Configurações de Pagamento por Lote */}
       <div className="mb-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
         <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
           <CreditCard className="h-5 w-5" />
           CONFIGURAÇÕES DE PAGAMENTO POR LOTE
         </h2>
         
         {auction.lotes && auction.lotes.length > 0 ? (
           <div className="space-y-4">
             {auction.lotes.map((lote, index) => {
               // Calcular valor total das mercadorias do lote
               const valorTotal = lote.mercadorias?.reduce((sum, mercadoria) => sum + (mercadoria.valorNumerico || 0), 0) || 0;
               
               return (
                 <div key={lote.id || index} className="p-4 bg-gray-50 rounded border border-gray-200">
                   <div className="flex justify-between items-start mb-3">
                     <h3 className="font-semibold text-gray-800">Lote {lote.numero}</h3>
                    {valorTotal > 0 && (
                      <span className="text-gray-600 font-medium text-lg">R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    )}
                   </div>
                   
                   {lote.descricao && (
                     <p className="text-gray-600 mb-3 text-sm">{lote.descricao}</p>
                   )}

                   {/* Configurações de pagamento específicas do lote */}
                   {lote.tipoPagamento ? (
                     <div className="bg-gray-50 border border-gray-300 p-3 rounded">
                       <h4 className="text-sm font-medium text-gray-700 mb-2">Configurações Específicas de Pagamento:</h4>
                       
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                         {/* Tipo de Pagamento */}
                         <div>
                           <strong className="text-gray-600">Tipo:</strong> {getTipoPagamentoLabel(lote.tipoPagamento)}
                         </div>

                         {/* Configurações por tipo de pagamento */}
                         {lote.tipoPagamento === 'a_vista' && lote.dataVencimentoVista && (
                           <div>
                             <strong className="text-gray-600">Data de Pagamento:</strong> {formatDate(lote.dataVencimentoVista)}
                           </div>
                         )}

                         {lote.tipoPagamento === 'entrada_parcelamento' && lote.dataEntrada && (
                           <div>
                             <strong className="text-gray-600">Data da Entrada:</strong> {formatDate(lote.dataEntrada)}
                           </div>
                         )}

                         {(lote.tipoPagamento === 'parcelamento' || lote.tipoPagamento === 'entrada_parcelamento') && (
                           <>
                             {lote.mesInicioPagamento && (
                               <div>
                                 <strong className="text-gray-600">Mês de Início:</strong> {(() => {
                                   const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                                                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                                   return meses[parseInt(lote.mesInicioPagamento) - 1] || lote.mesInicioPagamento;
                                 })()}
                               </div>
                             )}
                             
                             {lote.diaVencimentoPadrao && (
                               <div>
                                 <strong className="text-gray-600">Dia do Vencimento:</strong> Dia {lote.diaVencimentoPadrao}
                               </div>
                             )}
                             
                             {lote.parcelasPadrao && (
                               <div>
                                 <strong className="text-gray-600">Parcelas:</strong> {lote.parcelasPadrao}x{lote.tipoPagamento === 'entrada_parcelamento' ? ' (após entrada)' : ''}
                               </div>
                             )}
                           </>
                         )}
                       </div>
                     </div>
                   ) : (
                     <div className="bg-gray-100 border border-gray-300 p-3 rounded">
                       <p className="text-gray-600 text-xs">
                         ⚠️ Configurações de pagamento não definidas para este lote
                       </p>
                     </div>
                   )}

                   {/* Mercadorias do lote */}
                   {lote.mercadorias && lote.mercadorias.length > 0 && (
                     <div className="mt-3 pt-3 border-t border-gray-200">
                       <h4 className="text-xs font-medium text-gray-700 mb-2">Mercadorias:</h4>
                       <div className="space-y-1">
                         {lote.mercadorias.map((mercadoria, mercIndex) => (
                           <div key={mercadoria.id || mercIndex} className="text-xs text-gray-600 flex justify-between">
                             <span>
                               • {mercadoria.nome || mercadoria.tipo} - {mercadoria.descricao}
                               {mercadoria.quantidade && ` (Qtd: ${mercadoria.quantidade})`}
                             </span>
                            <span className="text-gray-500 font-medium">
                              R$ {mercadoria.valorNumerico?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>
               );
             })}
           </div>
         ) : (
           <div className="p-4 bg-gray-50 rounded border border-gray-200">
             <p className="text-gray-600 text-center">Nenhum lote cadastrado neste leilão</p>
           </div>
         )}

       </div>

       {/* Arrematante */}
       {auction.arrematante && (
         <div className="mb-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
           <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
             <User className="h-5 w-5" />
             INFORMAÇÕES DO ARREMATANTE
           </h2>

           {/* Dados Pessoais */}
           <div className="mb-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
             <h3 className="text-sm font-medium text-gray-700 mb-3 border-l-4 border-gray-400 pl-3 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>Dados Pessoais</h3>
             <div className="grid grid-cols-2 gap-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
               <div>
                 <strong>Nome Completo:</strong>{' '}
                 {isEditMode ? (
                   <Input
                     value={editableData.arrematanteNome}
                     onChange={(e) => setEditableData({ ...editableData, arrematanteNome: e.target.value })}
                     className="inline-block w-full max-w-xs h-6 text-sm border-gray-300 mt-1"
                     placeholder="Nome completo"
                   />
                 ) : (
                   editableData.arrematanteNome || auction.arrematante.nome || 'Não informado'
                 )}
               </div>
               <div>
                 <strong>CPF/CNPJ:</strong>{' '}
                 {isEditMode ? (
                   <Input
                     value={editableData.arrematanteDocumento}
                     onChange={(e) => setEditableData({ ...editableData, arrematanteDocumento: e.target.value })}
                     className="inline-block w-full max-w-xs h-6 text-sm border-gray-300 mt-1"
                     placeholder="000.000.000-00"
                   />
                 ) : (
                   editableData.arrematanteDocumento || auction.arrematante.documento || 'Não informado'
                 )}
               </div>
               <div>
                 <strong>Email:</strong>{' '}
                 {isEditMode ? (
                   <Input
                     value={editableData.arrematanteEmail}
                     onChange={(e) => setEditableData({ ...editableData, arrematanteEmail: e.target.value })}
                     className="inline-block w-full max-w-xs h-6 text-sm border-gray-300 mt-1"
                     placeholder="email@exemplo.com"
                   />
                 ) : (
                   editableData.arrematanteEmail || auction.arrematante.email || 'Não informado'
                 )}
               </div>
               <div>
                 <strong>Telefone:</strong>{' '}
                 {isEditMode ? (
                   <Input
                     value={editableData.arrematanteTelefone}
                     onChange={(e) => setEditableData({ ...editableData, arrematanteTelefone: e.target.value })}
                     className="inline-block w-full max-w-xs h-6 text-sm border-gray-300 mt-1"
                     placeholder="(00) 00000-0000"
                   />
                 ) : (
                   editableData.arrematanteTelefone || auction.arrematante.telefone || 'Não informado'
                 )}
               </div>
               <div className="col-span-2">
                 <strong>Endereço Completo:</strong>{' '}
                 {isEditMode ? (
                   <Input
                     value={editableData.arrematanteEndereco}
                     onChange={(e) => setEditableData({ ...editableData, arrematanteEndereco: e.target.value })}
                     className="w-full h-8 text-sm border-gray-300 mt-1"
                     placeholder="Endereço completo"
                   />
                 ) : (
                   editableData.arrematanteEndereco || auction.arrematante.endereco || 'Não informado'
                 )}
               </div>
             </div>
           </div>

           {/* Informações Financeiras */}
           <div className="mb-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
             <h3 className="text-sm font-medium text-gray-700 mb-3 border-l-4 border-gray-400 pl-3 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>Informações Financeiras</h3>
             <div className="grid grid-cols-2 gap-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
               <div>
                 <strong>Valor Total a Pagar:</strong>{' '}
                 {isEditMode ? (
                   <Input
                     value={editableData.arrematanteValorPagar}
                     onChange={(e) => setEditableData({ ...editableData, arrematanteValorPagar: e.target.value })}
                     className="inline-block w-auto min-w-[120px] h-6 text-sm border-gray-300"
                     placeholder="R$ 0,00"
                   />
                 ) : (
                   formatCurrency(editableData.arrematanteValorPagar || auction.arrematante.valorPagar)
                 )}
               </div>
               <div>
                 <strong>Status Pagamento:</strong> {getPaymentStatus()}
               </div>
              {/* Valor por Parcela - apenas para tipos com parcelamento */}
              {(() => {
                // Encontrar o lote arrematado baseado no loteId do arrematante
                const loteArrematado = auction.arrematante?.loteId 
                  ? auction.lotes?.find(lote => lote.id === auction.arrematante.loteId)
                  : null;
                
                // Usar tipo de pagamento do lote específico ou fallback para global
                const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento;
                
                // Mostrar valor por parcela apenas se não for pagamento à vista
                if (tipoPagamento !== 'a_vista') {
                  return (
                    <div className="col-span-2">
                      <strong>Valor por Parcela:</strong> {formatCurrency(auction.arrematante.valorPagarNumerico / auction.arrematante.quantidadeParcelas)}
                    </div>
                  );
                }
                return null;
              })()}
             </div>
           </div>

          {/* Configurações de Pagamento do Arrematante */}
          <div className="mb-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
            <h3 className="text-sm font-medium text-gray-700 mb-3 border-l-4 border-gray-400 pl-3 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
              Configurações de Pagamento
            </h3>
            
            {(() => {
              // Encontrar o lote arrematado baseado no loteId do arrematante
              const loteArrematado = auction.arrematante?.loteId 
                ? auction.lotes?.find(lote => lote.id === auction.arrematante.loteId)
                : null;
              
              // Usar tipo de pagamento do lote específico ou fallback para global
              const tipoPagamento = loteArrematado?.tipoPagamento || auction.tipoPagamento;
              
              if (tipoPagamento === 'a_vista') {
                const dataVencimento = loteArrematado?.dataVencimentoVista || auction.dataVencimentoVista;
                return (
                  <div className="grid grid-cols-1 gap-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                    <div>
                      <strong>Modalidade:</strong> Pagamento à Vista
                    </div>
                    {dataVencimento && (
                      <div>
                        <strong>Data de Vencimento:</strong> {formatDate(dataVencimento)}
                      </div>
                    )}
                  </div>
                );
              }
              
              if (tipoPagamento === 'entrada_parcelamento') {
                const dataEntrada = loteArrematado?.dataEntrada || auction.dataEntrada;
                return (
                  <div className="space-y-3">
                    <div>
                      <strong>Modalidade:</strong> Entrada + Parcelamento
                    </div>
                    
                    {dataEntrada && (
                      <div className="p-2 bg-gray-50 rounded border">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <strong>Data de Vencimento:</strong> {formatDate(dataEntrada)}
                          </div>
                          {auction.arrematante?.valorEntrada && (
                            <div>
                              <strong>Valor da Entrada:</strong> {formatCurrency(auction.arrematante.valorEntrada)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="p-2 bg-gray-50 rounded border">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <strong>Dia das Parcelas:</strong> Dia {auction.arrematante.diaVencimentoMensal}
                        </div>
                        <div>
                          <strong>Parcelas (após entrada):</strong> {auction.arrematante.quantidadeParcelas}x
                        </div>
                        <div>
                          <strong>Parcelas Pagas:</strong> {auction.arrematante.parcelasPagas || 0}
                        </div>
                        <div>
                          <strong>Parcelas Restantes:</strong> {auction.arrematante.quantidadeParcelas - (auction.arrematante.parcelasPagas || 0)}
                        </div>
                        <div className="col-span-2">
                          <strong>Mês Início das Parcelas:</strong> {auction.arrematante.mesInicioPagamento}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Default para parcelamento
              return (
                <div className="grid grid-cols-2 gap-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                  <div>
                    <strong>Modalidade:</strong> {(() => {
                      switch (tipoPagamento) {
                        case 'a_vista':
                          return 'Pagamento à Vista';
                        case 'entrada_parcelamento':
                          return 'Entrada + Parcelamento';
                        case 'parcelamento':
                        default:
                          return 'Parcelamento';
                      }
                    })()}
                  </div>
                  <div></div>
                  <div>
                    <strong>Dia Vencimento Mensal:</strong> Dia {auction.arrematante.diaVencimentoMensal}
                  </div>
                  <div>
                    <strong>Total de Parcelas:</strong> {auction.arrematante.quantidadeParcelas}x
                  </div>
                  <div>
                    <strong>Parcelas Pagas:</strong> {auction.arrematante.parcelasPagas || 0}
                  </div>
                  <div>
                    <strong>Parcelas Restantes:</strong> {auction.arrematante.quantidadeParcelas - (auction.arrematante.parcelasPagas || 0)}
                  </div>
                  <div>
                    <strong>Mês Início Pagamento:</strong> {auction.arrematante.mesInicioPagamento}
                  </div>
                </div>
              );
            })()}
          </div>

           {/* Documentos do Arrematante */}
           {auction.arrematante.documentos && auction.arrematante.documentos.length > 0 && (
             <div className="mb-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
               <h3 className="text-sm font-medium text-gray-700 mb-3 border-l-4 border-gray-400 pl-3 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
                 Documentos do Arrematante ({auction.arrematante.documentos.length})
               </h3>
               <div className="space-y-2">
                 {auction.arrematante.documentos.map((doc, index) => (
                   <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded border border-gray-200 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                     <FileText className="h-4 w-4 text-gray-600" />
                     <div className="flex-1">
                       <p className="font-semibold text-gray-900">{doc.nome}</p>
                       <div className="text-sm text-gray-600 grid grid-cols-3 gap-2">
                         <span><strong>Tipo:</strong> {doc.tipo}</span>
                         <span><strong>Tamanho:</strong> {formatFileSize(doc.tamanho)}</span>
                         <span><strong>Upload:</strong> {formatDate(doc.dataUpload)}</span>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}
         </div>
       )}

       {/* Lotes */}
       {auction.lotes && auction.lotes.length > 0 && (
         <div className="mb-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
           <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
             <Package className="h-5 w-5" />
             LOTES DO LEILÃO ({auction.lotes.length})
           </h2>
           
           {/* Resumo dos Lotes */}
           <div className="mb-4 bg-gray-50 p-4 rounded border border-gray-200 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
             <h3 className="text-sm font-medium text-gray-700 mb-3 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>Resumo Geral dos Lotes</h3>
             <div className="grid grid-cols-4 gap-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
               {(() => {
                 let totalMercadorias = 0;
                 let qtdDisponivel = 0;
                 let qtdArrematado = 0;
                 let qtdArquivado = 0;

                 auction.lotes!.forEach(lote => {
                   if (lote.mercadorias) {
                     totalMercadorias += lote.mercadorias.length;
                   }
                   if (lote.status === 'arrematado') qtdArrematado++;
                   else if (lote.status === 'disponivel') qtdDisponivel++;
                   else if (lote.status === 'arquivado') qtdArquivado++;
                 });

                 return (
                   <>
                     <div className="text-center">
                       <p className="text-2xl font-bold text-gray-800">{auction.lotes!.length}</p>
                       <p className="text-sm text-gray-600 uppercase tracking-wide">Total Lotes</p>
                     </div>
                     <div className="text-center">
                       <p className="text-2xl font-bold text-gray-800">{qtdArrematado}</p>
                       <p className="text-sm text-gray-600 uppercase tracking-wide">Arrematados</p>
                     </div>
                     <div className="text-center">
                       <p className="text-2xl font-bold text-gray-800">{qtdDisponivel}</p>
                       <p className="text-sm text-gray-600 uppercase tracking-wide">Disponíveis</p>
                     </div>
                     <div className="text-center">
                       <p className="text-2xl font-bold text-gray-800">{totalMercadorias}</p>
                       <p className="text-sm text-gray-600 uppercase tracking-wide">Total Mercadorias</p>
                     </div>
                   </>
                 );
               })()}
             </div>
           </div>

           {/* Lista Detalhada dos Lotes */}
           <div className="space-y-6">
             {auction.lotes.map((lote, index) => (
               <div key={lote.id || index} className="border border-gray-200 rounded-lg overflow-hidden mb-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                 
                 {/* Cabeçalho do Lote */}
                 <div className="bg-gray-50 p-4 border-b border-gray-200 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
                   <div className="flex justify-between items-center">
                     <h3 className="text-lg font-semibold text-gray-900">LOTE {lote.numero}</h3>
                     <span className="px-3 py-1 rounded text-sm font-medium bg-gray-100 text-gray-800 border">
                       {lote.status === 'arrematado' ? 'ARREMATADO' :
                        lote.status === 'arquivado' ? 'ARQUIVADO' :
                        'DISPONÍVEL'}
                     </span>
                   </div>
                 </div>

                 {/* Conteúdo do Lote */}
                 <div className="p-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                   
                   {/* Descrição Geral */}
                   <div className="mb-4 p-3 rounded border border-gray-200 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                     <p className="text-sm font-semibold text-gray-700 uppercase mb-2 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>Descrição Geral do Lote</p>
                     <p className="text-gray-800">{lote.descricao || 'Não informada'}</p>
                   </div>

                   {/* Mercadorias do Lote */}
                   {lote.mercadorias && lote.mercadorias.length > 0 && (
                     <div className="mb-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                       <h4 className="text-sm font-medium text-gray-700 mb-3 border-l-4 border-gray-400 pl-3 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
                         Mercadorias Incluídas ({lote.mercadorias.length})
                       </h4>
                       <div className="space-y-3">
                         {lote.mercadorias.map((mercadoria, mercIndex) => (
                           <div key={mercadoria.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                             
                             {/* Cabeçalho da Mercadoria */}
                             <div className="flex justify-between items-start mb-3">
                               <div>
                                 <h5 className="text-lg font-semibold text-gray-900">
                                   {mercadoria.nome || `Mercadoria ${mercIndex + 1}`}
                                 </h5>
                                 <p className="text-gray-700 font-medium">{mercadoria.tipo}</p>
                               </div>
                               <div className="text-right">
                                 <p className="text-lg font-semibold text-gray-900">{formatCurrency(mercadoria.valor)}</p>
                               </div>
                             </div>

                             {/* Detalhes da Mercadoria */}
                             <div className="grid grid-cols-1 gap-3">
                               <div className="bg-white p-2 rounded border border-gray-200">
                                 <p className="text-sm font-semibold text-gray-700 uppercase mb-1">Quantidade</p>
                                 <p className="font-bold text-gray-900">{mercadoria.quantidade || 'Não especificada'}</p>
                               </div>
                             </div>

                             {/* Descrição Detalhada */}
                             {mercadoria.descricao && (
                               <div className="mt-3 bg-white p-3 rounded border border-gray-200">
                                 <p className="text-sm font-semibold text-gray-700 uppercase mb-2">Descrição Detalhada</p>
                                 <p className="text-gray-900">{mercadoria.descricao}</p>
                               </div>
                             )}
                           </div>
                         ))}
                       </div>

                       {/* Resumo Financeiro do Lote */}
                       <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                         <h5 className="text-lg font-semibold text-gray-900 mb-3">Resumo Financeiro - Lote {lote.numero}</h5>
                         <div className="grid grid-cols-2 gap-4">
                           <div className="bg-white p-3 rounded border border-gray-200 text-center">
                             <p className="text-2xl font-bold text-gray-800">{lote.mercadorias.length}</p>
                             <p className="text-sm text-gray-600 uppercase tracking-wide">Total Mercadorias</p>
                           </div>
                           <div className="bg-white p-3 rounded border border-gray-200 text-center">
                             <p className="text-xl font-semibold text-gray-900">
                               {formatCurrency(lote.mercadorias.reduce((sum, m) => sum + (m.valorNumerico || 0), 0))}
                             </p>
                             <p className="text-sm text-gray-600 uppercase tracking-wide">Valor Total</p>
                           </div>
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             ))}
           </div>
         </div>
       )}

       {/* Documentos e Anexos */}
       {((auction.documentos && auction.documentos.length > 0) || 
         (auction.fotosMercadoria && auction.fotosMercadoria.length > 0)) && (
         <div className="mb-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
           <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
             <FileText className="h-5 w-5" />
             ANEXOS E DOCUMENTAÇÃO
           </h2>

           {/* Documentos do Leilão */}
           {auction.documentos && auction.documentos.length > 0 && (
             <div className="mb-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
               <h3 className="text-sm font-medium text-gray-700 mb-3 border-l-4 border-gray-400 pl-3 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
                 Documentos Oficiais do Leilão ({auction.documentos.length})
               </h3>
               <div className="space-y-3">
                 {auction.documentos.map((doc, index) => (
                   <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded border border-gray-200 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                     <FileText className="h-5 w-5 text-gray-600 mt-1" />
                     <div className="flex-1">
                       <h4 className="font-bold text-gray-900 mb-2">{doc.nome}</h4>
                       <div className="grid grid-cols-3 gap-3 text-sm">
                         <div>
                           <span className="font-semibold text-gray-700">Tipo:</span>
                           <p className="text-gray-800">{doc.tipo}</p>
                         </div>
                         <div>
                           <span className="font-semibold text-gray-700">Tamanho:</span>
                           <p className="text-gray-800">{formatFileSize(doc.tamanho)}</p>
                         </div>
                         <div>
                           <span className="font-semibold text-gray-700">Upload:</span>
                           <p className="text-gray-800">{formatDate(doc.dataUpload)}</p>
                         </div>
                       </div>
                       {doc.url && (
                         <div className="mt-2 bg-white p-2 rounded border border-gray-200 text-xs">
                           <span className="font-semibold text-gray-600">URL:</span>
                           <p className="text-gray-700 font-mono break-all">{doc.url}</p>
                         </div>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}

           {/* Fotos da Mercadoria */}
           {auction.fotosMercadoria && auction.fotosMercadoria.length > 0 && (
             <div className="mb-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
               <h3 className="text-sm font-medium text-gray-700 mb-3 border-l-4 border-gray-400 pl-3 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
                 Fotos da Mercadoria ({auction.fotosMercadoria.length})
               </h3>
               <div className="space-y-3">
                 {auction.fotosMercadoria.map((foto, index) => (
                   <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded border border-gray-200 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                     <Image className="h-5 w-5 text-gray-600 mt-1" />
                     <div className="flex-1">
                       <h4 className="font-bold text-gray-900 mb-2">{foto.nome}</h4>
                       <div className="grid grid-cols-3 gap-3 text-sm">
                         <div>
                           <span className="font-semibold text-gray-700">Tipo:</span>
                           <p className="text-gray-800">{foto.tipo}</p>
                         </div>
                         <div>
                           <span className="font-semibold text-gray-700">Tamanho:</span>
                           <p className="text-gray-800">{formatFileSize(foto.tamanho)}</p>
                         </div>
                         <div>
                           <span className="font-semibold text-gray-700">Upload:</span>
                           <p className="text-gray-800">{formatDate(foto.dataUpload)}</p>
                         </div>
                       </div>
                       {foto.url && (
                         <div className="mt-2 bg-white p-2 rounded border border-gray-200 text-xs">
                           <span className="font-semibold text-gray-600">URL:</span>
                           <p className="text-gray-700 font-mono break-all">{foto.url}</p>
                         </div>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}

           {/* Resumo de Anexos */}
           <div className="bg-gray-50 p-4 rounded border break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
             <h3 className="text-sm font-medium text-gray-700 mb-3 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>Resumo da Documentação</h3>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <strong>Total de Documentos:</strong> {auction.documentos?.length || 0}
               </div>
               <div>
                 <strong>Total de Fotos:</strong> {auction.fotosMercadoria?.length || 0}
               </div>
             </div>
           </div>
         </div>
       )}

      {/* Observações Históricas */}
      {auction.historicoNotas && auction.historicoNotas.length > 0 && (
        <div className="mb-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 break-after-avoid" style={{ pageBreakAfter: 'avoid' }}>
            <Clock className="h-5 w-5" />
            HISTÓRICO DE OBSERVAÇÕES
          </h2>
          <div className="space-y-3">
            {auction.historicoNotas.map((nota, index) => (
              <div key={index} className="border-l-4 border-gray-300 pl-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                <p className="text-gray-700">{nota}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-10 pt-6 border-t-2 border-gray-300 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
        <div className="text-center">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span className="font-medium">Página 1 de 1</span>
            <span>Data: {new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
