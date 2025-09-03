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
} from "lucide-react";

const mockData = {
  totalReceiver: "R$ 245.680,00",
  auctionCosts: "R$ 12.350,00",
  pendingInvoices: 8,
  activeAuctions: 3,
  overdue: 5,
  nextAuctions: [
    { id: 1, name: "Leilão de Gado - Fazenda Santa Maria", date: "2024-01-15", status: "agendado" },
    { id: 2, name: "Leilão Rural - Equipamentos", date: "2024-01-20", status: "agendado" },
    { id: 3, name: "Leilão de Reprodutores", date: "2024-01-25", status: "em_andamento" },
  ],
  recentInvoices: [
    { id: 1, bidder: "João Silva", amount: "R$ 15.000,00", dueDate: "2024-01-10", status: "em_aberto" },
    { id: 2, bidder: "Maria Santos", amount: "R$ 8.500,00", dueDate: "2024-01-12", status: "pago" },
    { id: 3, bidder: "Carlos Oliveira", amount: "R$ 22.000,00", dueDate: "2024-01-08", status: "atrasado" },
  ],
};

export default function Dashboard() {
  const getStatusBadge = (status: string) => {
    const statusMap = {
      agendado: { label: "Agendado", variant: "secondary" as const },
      em_andamento: { label: "Em Andamento", variant: "default" as const },
      finalizado: { label: "Finalizado", variant: "success" as const },
      em_aberto: { label: "Em Aberto", variant: "warning" as const },
      pago: { label: "Pago", variant: "success" as const },
      atrasado: { label: "Atrasado", variant: "destructive" as const },
    };
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema de leilões</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total a Receber"
          value={mockData.totalReceiver}
          subtitle="Valores pendentes"
          icon={DollarSign}
          variant="success"
        />
        
        <StatCard
          title="Custos do Leilão"
          value={mockData.auctionCosts}
          subtitle="Custos operacionais"
          icon={TrendingUp}
        />
        
        <StatCard
          title="Faturas Pendentes"
          value={mockData.pendingInvoices.toString()}
          subtitle="Aguardando pagamento"
          icon={Clock}
          variant="warning"
        />
        
        <StatCard
          title="Inadimplência"
          value={mockData.overdue.toString()}
          subtitle="Faturas em atraso"
          icon={AlertTriangle}
          variant="destructive"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximos Leilões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockData.nextAuctions.map((auction) => (
                <div key={auction.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{auction.name}</p>
                    <p className="text-sm text-muted-foreground">{auction.date}</p>
                  </div>
                  <Badge variant={getStatusBadge(auction.status).variant}>
                    {getStatusBadge(auction.status).label}
                  </Badge>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4" variant="outline">
              Ver Todos os Leilões
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Faturas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockData.recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{invoice.bidder}</p>
                    <p className="text-sm text-muted-foreground">
                      Venc: {invoice.dueDate} • {invoice.amount}
                    </p>
                  </div>
                  <Badge variant={getStatusBadge(invoice.status).variant}>
                    {getStatusBadge(invoice.status).label}
                  </Badge>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4" variant="outline">
              Ver Todas as Faturas
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Leilões Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{mockData.activeAuctions}</div>
              <p className="text-sm text-muted-foreground">Em andamento</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Lotes Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">156</div>
              <p className="text-sm text-muted-foreground">Total de lotes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Arrematantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">89</div>
              <p className="text-sm text-muted-foreground">Cadastrados</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}