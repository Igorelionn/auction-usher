import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Gavel,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Users,
  Package,
  ArrowRight,
  FileText,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";
import { Invoice } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useSupabaseAuctions } from "@/hooks/use-supabase-auctions";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { auctions } = useSupabaseAuctions();
  const { stats } = useDashboardStats();
  
  // Carrossel da agenda
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const slides = [
    { id: 'leiloes', title: 'Próximos Leilões', icon: Calendar },
    { id: 'inadimplentes', title: 'Inadimplentes', icon: AlertTriangle },
    { id: 'arrematantes', title: 'Arrematantes', icon: Users },
  ];

  // Rotação automática
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 300);
    }, 8000);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  const nextSlide = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 300);
  };
  
  const prevSlide = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 300);
  };

  // Filtrar apenas leilões não arquivados
  const activeAuctions = auctions.filter(auction => !auction.arquivado);

  // Função para verificar se um arrematante está inadimplente (considera tipos de pagamento por lote)
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

  // Calcular total recebido localmente (valores já pagos)
  const localTotalRecebido = activeAuctions
    .filter(auction => auction.arrematante?.pago)
    .reduce((total, auction) => {
      const valorPago = auction.arrematante?.valorPagarNumerico || 0;
      return total + valorPago;
    }, 0);

  // Calcular inadimplentes localmente com lógica correta
  const localOverdueCount = activeAuctions
    .filter(auction => auction.arrematante && isOverdue(auction.arrematante, auction))
    .length;

  // Calcular leilões em andamento localmente (apenas não arquivados)
  // CORREÇÃO: Usar cálculo local para garantir que conte apenas leilões não arquivados
  const localActiveAuctionsCount = activeAuctions.filter(a => a.status === "em_andamento").length;

  // Usar estatísticas do Supabase quando disponíveis, senão usar cálculos locais como fallback
  const totalReceiverNumber = stats?.total_a_receber || 0;
  const auctionCostsNumber = stats?.total_custos || 0;
  const overdueCount = localOverdueCount; // Usar cálculo local corrigido
  const totalRecebido = stats?.total_recebido || localTotalRecebido;
  const activeAuctionsCount = localActiveAuctionsCount; // Usar cálculo local corrigido para leilões em andamento
  const scheduledAuctionsCount = activeAuctions.filter(a => a.status === "agendado").length;
  const totalArrematantes = stats?.total_arrematantes || 0;

  const todayString = new Date().toISOString().slice(0, 10);

  // Função para calcular próxima data de vencimento baseada nas configurações específicas do lote
  const calculateNextPaymentDate = (arrematante: any, auction: any) => {
    if (!arrematante || arrematante.pago) return null;
    
    const loteArrematado = auction.lotes?.find((lote: any) => lote.id === arrematante.loteId);
    if (!loteArrematado || !loteArrematado.tipoPagamento) return null;
    
    const tipoPagamento = loteArrematado.tipoPagamento;
    
    switch (tipoPagamento) {
      case 'a_vista': {
        // CORREÇÃO: Evitar problema de fuso horário do JavaScript
        const dateStr = loteArrematado.dataVencimentoVista || new Date().toISOString().split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        
        // Usar construtor Date(year, month, day) que ignora fuso horário
        return new Date(year, month - 1, day); // month é zero-indexed
      }
      
      case 'entrada_parcelamento': {
        const parcelasPagas = arrematante.parcelasPagas || 0;
        const quantidadeParcelas = (loteArrematado.parcelasPadrao || 1) + 1;
        
        if (parcelasPagas >= quantidadeParcelas) return null;
        
        if (parcelasPagas === 0) {
          // Próximo pagamento é a entrada
          if (!loteArrematado.dataEntrada) return null;
          return new Date(loteArrematado.dataEntrada);
        } else {
          // Próximo pagamento é uma parcela após entrada
          if (!loteArrematado.mesInicioPagamento || !loteArrematado.diaVencimentoPadrao) return null;
          const [startYear, startMonth] = loteArrematado.mesInicioPagamento.split('-').map(Number);
          return new Date(startYear, startMonth - 1 + (parcelasPagas - 1), loteArrematado.diaVencimentoPadrao);
        }
      }
      
      case 'parcelamento':
      default: {
        if (!loteArrematado.mesInicioPagamento || !loteArrematado.diaVencimentoPadrao) return null;
        
        const parcelasPagas = arrematante.parcelasPagas || 0;
        const quantidadeParcelas = loteArrematado.parcelasPadrao || 1;
        
        if (parcelasPagas >= quantidadeParcelas) return null;
        
        const [startYear, startMonth] = loteArrematado.mesInicioPagamento.split('-').map(Number);
        return new Date(startYear, startMonth - 1 + parcelasPagas, loteArrematado.diaVencimentoPadrao);
      }
    }
  };

  const getProximaDataVencimento = (arrematante: any, auction: any) => {
    const nextDate = calculateNextPaymentDate(arrematante, auction);
    return nextDate ? nextDate.toLocaleDateString('pt-BR') : "—";
  };

  const nextAuctions = activeAuctions
    .filter((a) => a.dataInicio >= todayString || a.status === "em_andamento")
    .slice(0, 6);

  // Criar faturas fictícias a partir dos leilões com arrematantes para demonstração
  const recentInvoices: Array<{ 
    id: string; 
    bidder: string; 
    amount: string; 
    dueDate: string; 
    status: Invoice["status"];
    parcelas: string;
    leilao: string;
  }> = activeAuctions
    .filter(auction => auction.arrematante)
    .slice(0, 6)
    .map((auction) => {
      // Calcular valor por parcela baseado no tipo de pagamento específico do lote
      const arrematante = auction.arrematante;
      const loteArrematado = auction.lotes?.find((lote: any) => lote.id === arrematante?.loteId);
      
      let valorPorParcela = 0;
      if (arrematante && loteArrematado && loteArrematado.tipoPagamento) {
        const valorTotal = arrematante.valorPagarNumerico !== undefined 
          ? arrematante.valorPagarNumerico 
          : (typeof arrematante.valorPagar === 'number' ? arrematante.valorPagar : 0);
        
        switch (loteArrematado.tipoPagamento) {
          case 'a_vista':
            valorPorParcela = valorTotal;
            break;
          case 'entrada_parcelamento':
            const parcelasPagas = arrematante.parcelasPagas || 0;
            const quantidadeParcelas = (loteArrematado.parcelasPadrao || 1) + 1;
            if (parcelasPagas === 0) {
              // Valor da entrada (50%)
              valorPorParcela = valorTotal * 0.5;
            } else {
              // Parcelas após entrada
              const valorRestante = valorTotal - (valorTotal * 0.5);
              valorPorParcela = valorRestante / (quantidadeParcelas - 1);
            }
            break;
          case 'parcelamento':
          default:
            valorPorParcela = valorTotal / (loteArrematado.parcelasPadrao || 1);
            break;
        }
      }
      
      // Determinar status correto baseado no pagamento e atraso
      let status: Invoice["status"] = "em_aberto";
      if (auction.arrematante?.pago) {
        status = "pago";
      } else if (isOverdue(auction.arrematante, auction)) {
        status = "atrasado";
      }
      
      return {
        id: `invoice-${auction.id}`,
        bidder: auction.arrematante?.nome || "—",
        amount: currency.format(valorPorParcela),
        dueDate: getProximaDataVencimento(auction.arrematante, auction),
        status,
        parcelas: (() => {
          if (!loteArrematado || !loteArrematado.tipoPagamento) {
            return `${auction.arrematante?.parcelasPagas || 0}/${auction.arrematante?.quantidadeParcelas || 1}`;
          }
          
          const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
          
          switch (loteArrematado.tipoPagamento) {
            case 'a_vista':
              return parcelasPagas > 0 ? "1/1" : "0/1"; // À vista é sempre 1 parcela total
            case 'entrada_parcelamento':
              const quantidadeTotal = (loteArrematado.parcelasPadrao || 1) + 1; // +1 para entrada
              return `${parcelasPagas}/${quantidadeTotal}`;
            case 'parcelamento':
            default:
              return `${parcelasPagas}/${loteArrematado.parcelasPadrao || 1}`;
          }
        })(),
        leilao: auction.nome
      };
    });

  // Dados para carrossel - arrematantes em atraso (usando lógica atualizada)
  const overdueAuctions = activeAuctions.filter(auction => {
    return auction.arrematante && isOverdue(auction.arrematante, auction);
  });
  const overdueArrematantes = overdueAuctions.slice(0, 6);
  const recentArrematantes = activeAuctions
    .filter(auction => auction.arrematante)
    .slice(0, 6);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      agendado: { label: "Agendado", variant: "secondary" as const },
      em_andamento: { label: "Em Andamento", variant: "default" as const },
      finalizado: { label: "Finalizado", variant: "outline" as const },
      em_aberto: { label: "Em Aberto", variant: "warning" as const },
      pago: { label: "Pago", variant: "success" as const },
      atrasado: { label: "Atrasado", variant: "destructive" as const },
    };
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const };
  };

  // Horário de Brasília sincronizado
  const brasiliaDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const currentHour = brasiliaDate.getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";

  return (
          <div className="space-y-8">
        <div className="pt-4 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground mb-2">
              {greeting}, {user?.full_name || user?.name || "Usuário"}!
            </h1>
            <p className="text-lg text-muted-foreground">Aqui está o resumo dos leilões</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Data atual</p>
            <p className="text-lg font-medium text-foreground">
              {brasiliaDate.toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric", 
                month: "long",
                day: "numeric"
              })}
            </p>
          </div>
        </div>

      {/* Layout Principal: Conteúdo à esquerda, Agenda à direita */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conteúdo Principal - 2 colunas */}
        <div className="lg:col-span-2 lg:min-h-[calc(100vh-150px)] flex flex-col space-y-6">
          {/* Resumo Geral - Layout Limpo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <TrendingUp className="h-6 w-6" />
                Resumo Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="text-center px-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3 flex items-center justify-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total a Receber
                  </p>
                  <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
                  <p className="text-4xl font-extralight text-gray-900 mb-2 tracking-tight">{currency.format(totalReceiverNumber)}</p>
                </div>

                <div className="text-center px-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3 flex items-center justify-center gap-2">
                    <Users className="h-4 w-4" />
                    Arrematantes
                  </p>
                  <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
                  <p className="text-4xl font-extralight text-gray-900 mb-2 tracking-tight">{totalArrematantes}</p>
                </div>

                <div className="text-center px-2">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-[0.15em] mb-3 flex items-center justify-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Inadimplentes
                  </p>
                  <div className="h-px w-20 bg-red-300 mx-auto mb-4"></div>
                  <p className="text-4xl font-extralight text-red-600 mb-2 tracking-tight">{overdueCount}</p>
                </div>

                <div className="text-center px-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3 flex items-center justify-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Recebido
                  </p>
                  <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
                  <p className="text-4xl font-extralight text-gray-900 mb-2 tracking-tight">{currency.format(totalRecebido)}</p>
                </div>
              </div>

              <div className="mt-6 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5 text-black" />
                  <span className="text-lg font-semibold text-black">Dados do Sistema</span>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="text-center px-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Total de Leilões</p>
                    <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
                    <p className="text-4xl font-extralight text-gray-900 mb-2 tracking-tight">{auctions.length}</p>
                    <p className="text-sm text-gray-600 font-medium">Eventos Cadastrados</p>
                  </div>
                  <div className="text-center px-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Em Andamento</p>
                    <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
                    <p className="text-4xl font-extralight text-gray-900 mb-2 tracking-tight">{activeAuctionsCount}</p>
                    <p className="text-sm text-gray-600 font-medium">Leilões Em Andamento</p>
                  </div>
                  <div className="text-center px-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Programados</p>
                    <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
                    <p className="text-4xl font-extralight text-gray-900 mb-2 tracking-tight">{scheduledAuctionsCount}</p>
                    <p className="text-sm text-gray-600 font-medium">Eventos Futuros</p>
                  </div>
                  <div className="text-center px-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.15em] mb-3">Investimento</p>
                    <div className="h-px w-20 bg-gray-300 mx-auto mb-4"></div>
                    <p className="text-3xl font-light text-gray-900 mb-2 tracking-tight">{currency.format(auctionCostsNumber)}</p>
                    <p className="text-sm text-gray-600 font-medium">Custos Totais</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Faturas Recentes */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xl">
                  <FileText className="h-6 w-6" />
                  Faturas Recentes
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate("/faturas")}
                  className="hover:bg-gray-100 hover:text-gray-800 transition-all duration-200"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto">
                {recentInvoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">Nenhuma fatura encontrada</p>
                    <p className="text-sm">Ainda não há faturas emitidas no sistema.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentInvoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-start justify-between p-4 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-muted-foreground/20 transition-colors duration-200">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{invoice.bidder}</p>
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {(() => {
                              // Adaptar exibição baseado no tipo de pagamento
                              const auction = activeAuctions.find(a => `invoice-${a.id}` === invoice.id);
                              if (!auction || !auction.arrematante) return `Parcelas: ${invoice.parcelas} • ${invoice.amount}`;
                              
                              const loteArrematado = auction.lotes?.find((lote: any) => lote.id === auction.arrematante?.loteId);
                              if (!loteArrematado || !loteArrematado.tipoPagamento) {
                                return `Parcelas: ${invoice.parcelas} • ${invoice.amount} por parcela`;
                              }
                              
                              switch (loteArrematado.tipoPagamento) {
                                case 'a_vista':
                                  return `Valor: ${invoice.amount} (à vista)`;
                                case 'entrada_parcelamento':
                                  const parcelasPagas = auction.arrematante.parcelasPagas || 0;
                                  if (parcelasPagas === 0) {
                                    return `Entrada + ${loteArrematado.parcelasPadrao || 1} parcelas: ${invoice.parcelas} • ${invoice.amount} (entrada)`;
                                  } else {
                                    return `Entrada + ${loteArrematado.parcelasPadrao || 1} parcelas: ${invoice.parcelas} • ${invoice.amount} por parcela`;
                                  }
                                case 'parcelamento':
                                default:
                                  return `Parcelas: ${invoice.parcelas} • ${invoice.amount} por parcela`;
                              }
                            })()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 font-medium">
                            Venc: {invoice.dueDate}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Leilão: {invoice.leilao}
                          </p>
                        </div>
                        <Badge variant={getStatusBadge(invoice.status).variant} className="ml-2 flex-shrink-0">
                          {getStatusBadge(invoice.status).label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
                <div className="flex-shrink-0 pt-4">
                  <Button className="w-full h-12 hover:bg-gray-100 hover:text-gray-800 transition-all duration-300 ease-out" variant="outline">
                    <span className="text-sm font-medium">Ver Todas as Faturas</span>
                  </Button>
                </div>
            </CardContent>
          </Card>
        </div>

        {/* Carrossel - Lado direito, altura alinhada */}
        <Card 
          className="lg:row-span-3 h-[calc(100vh-150px)] flex flex-col relative group"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xl">
{(() => {
                  const IconComponent = slides[currentSlide].icon;
                  return <IconComponent className="h-6 w-6" />;
                })()}
                {slides[currentSlide].title}
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  const routes = { leiloes: '/leiloes', inadimplentes: '/inadimplencia', arrematantes: '/arrematantes' };
                  navigate(routes[slides[currentSlide].id as keyof typeof routes]);
                }}
                className="hover:bg-gray-100 hover:text-gray-800 transition-all duration-200"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          
          {/* Controles de navegação nas laterais - aparecem no hover */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-800 transition-all duration-300"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-800 transition-all duration-300"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 relative overflow-hidden">
              <div className={`h-full transition-opacity duration-500 ease-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                {currentSlide === 0 && (
                  // Próximos Leilões
                  nextAuctions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Nenhum leilão agendado</p>
                      <p className="text-sm">Cadastre um novo leilão para começar</p>
                    </div>
                  ) : (
                    <div className="space-y-4 overflow-y-auto max-h-full">
                      {nextAuctions.map((auction) => (
                        <div key={auction.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2 hover:bg-muted/50 hover:border-muted-foreground/20 transition-colors duration-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base truncate">{auction.nome}</p>
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {auction.identificacao && `${auction.identificacao} • `}
                                {auction.dataInicio}
                              </p>
                            </div>
                            <Badge variant={getStatusBadge(auction.status).variant} className="ml-2 flex-shrink-0">
                              {getStatusBadge(auction.status).label}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            Local: {String(auction.local)}{auction.endereco ? ` - ${auction.endereco}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {currentSlide === 1 && (
                  // Inadimplentes
                  overdueArrematantes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <AlertTriangle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Nenhuma inadimplência</p>
                      <p className="text-sm">Todos os pagamentos em dia</p>
                    </div>
                  ) : (
                    <div className="space-y-4 overflow-y-auto max-h-full">
                      {overdueArrematantes.map((auction) => (
                        <div key={auction.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2 hover:bg-muted/50 hover:border-muted-foreground/20 transition-colors duration-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base truncate">
                                {auction.arrematante?.nome || "—"}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {(() => {
                                  // Adaptar texto baseado no tipo de pagamento
                                  const loteArrematado = auction.lotes?.find((lote: any) => lote.id === auction.arrematante?.loteId);
                                  const dataVencimento = getProximaDataVencimento(auction.arrematante, auction);
                                  
                                  if (loteArrematado?.tipoPagamento === 'a_vista') {
                                    return `Data pagamento: ${dataVencimento}`;
                                  } else {
                                    return `Próximo venc: ${dataVencimento}`;
                                  }
                                })()} • {(() => {
                                  // Calcular valor por parcela baseado no tipo de pagamento do lote
                                  const loteArrematado = auction.lotes?.find((lote: any) => lote.id === auction.arrematante?.loteId);
                                  if (!loteArrematado || !loteArrematado.tipoPagamento) return "R$ 0,00";
                                  
                                  const valorTotal = auction.arrematante?.valorPagarNumerico !== undefined 
                                    ? auction.arrematante.valorPagarNumerico 
                                    : (typeof auction.arrematante?.valorPagar === 'number' ? auction.arrematante.valorPagar : 0);
                                  
                                  let valorPorParcela = 0;
                                  switch (loteArrematado.tipoPagamento) {
                                    case 'a_vista':
                                      return currency.format(valorTotal) + " (à vista)";
                                    case 'entrada_parcelamento':
                                      const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
                                      if (parcelasPagas === 0) {
                                        valorPorParcela = valorTotal * 0.5; // Entrada
                                      } else {
                                        const valorRestante = valorTotal - (valorTotal * 0.5);
                                        valorPorParcela = valorRestante / ((loteArrematado.parcelasPadrao || 1));
                                      }
                                      break;
                                    case 'parcelamento':
                                    default:
                                      valorPorParcela = valorTotal / (loteArrematado.parcelasPadrao || 1);
                                      break;
                                  }
                                  return currency.format(valorPorParcela) + " por parcela";
                                })()}
                              </p>
                            </div>
                            <Badge variant="destructive" className="ml-2 flex-shrink-0">
                              Atrasado
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Leilão: {auction.nome}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {currentSlide === 2 && (
                  // Arrematantes
                  recentArrematantes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Nenhum arrematante encontrado</p>
                      <p className="text-sm">Ainda não há arrematantes cadastrados no sistema.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 overflow-y-auto max-h-full">
                      {recentArrematantes.map((auction) => {
                        const nextPaymentDate = calculateNextPaymentDate(auction.arrematante, auction);
                        const proximoVencimento = nextPaymentDate ? nextPaymentDate.toLocaleDateString('pt-BR') : null;
                        
                        return (
                          <div key={auction.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2 hover:bg-muted/50 hover:border-muted-foreground/20 transition-colors duration-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-base truncate">{auction.arrematante?.nome}</p>
                                <p className="text-sm text-muted-foreground mt-1 truncate">
                                  {(() => {
                                    // Adaptar exibição baseado no tipo de pagamento do lote
                                    const loteArrematado = auction.lotes?.find((lote: any) => lote.id === auction.arrematante?.loteId);
                                    const valorTotal = auction.arrematante?.valorPagarNumerico !== undefined 
                                      ? auction.arrematante.valorPagarNumerico 
                                      : (typeof auction.arrematante?.valorPagar === 'number' ? auction.arrematante.valorPagar : 0);
                                    
                                    if (!loteArrematado || !loteArrematado.tipoPagamento) {
                                      return `Parcelas: ${auction.arrematante?.parcelasPagas || 0}/${auction.arrematante?.quantidadeParcelas || 1} • ${currency.format(valorTotal / (auction.arrematante?.quantidadeParcelas || 1))} por parcela`;
                                    }
                                    
                                    switch (loteArrematado.tipoPagamento) {
                                      case 'a_vista':
                                        return `Valor total: ${currency.format(valorTotal)} (à vista)`;
                                      
                                      case 'entrada_parcelamento': {
                                        const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
                                        const quantidadeParcelas = (loteArrematado.parcelasPadrao || 1) + 1; // +1 para entrada
                                        
                                        if (parcelasPagas === 0) {
                                          // Mostra que é entrada
                                          return `Entrada + ${loteArrematado.parcelasPadrao || 1} parcelas: ${parcelasPagas}/${quantidadeParcelas} • ${currency.format(valorTotal * 0.5)} (entrada)`;
                                        } else {
                                          // Mostra parcelas após entrada
                                          const valorRestante = valorTotal - (valorTotal * 0.5);
                                          const valorPorParcela = valorRestante / (loteArrematado.parcelasPadrao || 1);
                                          return `Entrada + ${loteArrematado.parcelasPadrao || 1} parcelas: ${parcelasPagas}/${quantidadeParcelas} • ${currency.format(valorPorParcela)} por parcela`;
                                        }
                                      }
                                      
                                      case 'parcelamento':
                                      default: {
                                        const quantidadeParcelas = loteArrematado.parcelasPadrao || 1;
                                        const parcelasPagas = auction.arrematante?.parcelasPagas || 0;
                                        const valorPorParcela = valorTotal / quantidadeParcelas;
                                        return `Parcelas: ${parcelasPagas}/${quantidadeParcelas} • ${currency.format(valorPorParcela)} por parcela`;
                                      }
                                    }
                                  })()}
                                </p>
                                {proximoVencimento && (
                                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                                    {(() => {
                                      // Adaptar texto baseado no tipo de pagamento
                                      const loteArrematado = auction.lotes?.find((lote: any) => lote.id === auction.arrematante?.loteId);
                                      
                                      if (loteArrematado?.tipoPagamento === 'a_vista') {
                                        return `Data do pagamento: ${proximoVencimento}`;
                                      } else {
                                        return `Próximo pagamento: ${proximoVencimento}`;
                                      }
                                    })()}
                                  </p>
                                )}
                              </div>
                              <Badge 
                                variant={
                                  auction.arrematante?.pago 
                                    ? "default" 
                                    : isOverdue(auction.arrematante, auction) 
                                      ? "destructive" 
                                      : "warning"
                                } 
                                className="ml-2 flex-shrink-0"
                              >
                                {auction.arrematante?.pago 
                                  ? "Pago" 
                                  : isOverdue(auction.arrematante, auction) 
                                    ? "Atrasado" 
                                    : "Em Aberto"
                                }
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Leilão: {auction.nome}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="flex-shrink-0 pt-6">
              <Button 
                className="w-full h-12 hover:bg-gray-100 hover:text-gray-800 transition-all duration-300 ease-out" 
                variant="outline" 
                onClick={() => {
                  const routes = { leiloes: '/leiloes', inadimplentes: '/inadimplencia', arrematantes: '/arrematantes' };
                  navigate(routes[slides[currentSlide].id as keyof typeof routes]);
                }}
              >
                <span className="text-sm font-medium">Ver Todos os {slides[currentSlide].title}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}