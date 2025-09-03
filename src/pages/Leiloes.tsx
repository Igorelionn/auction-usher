import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar, MapPin, Users } from "lucide-react";

const mockLeiloes = [
  {
    id: 1,
    nome: "Leilão de Gado - Fazenda Santa Maria",
    local: "Presencial - Fazenda Santa Maria, MG",
    dataInicio: "2024-01-15",
    dataAndamento: "2024-01-15",
    dataEncerramento: "2024-01-16",
    prazoFinalPagamento: "2024-01-30",
    status: "agendado",
    totalLotes: 45,
    valorEstimado: "R$ 450.000,00"
  },
  {
    id: 2,
    nome: "Leilão Rural - Equipamentos Agrícolas",
    local: "Online",
    dataInicio: "2024-01-20",
    dataAndamento: "2024-01-20",
    dataEncerramento: "2024-01-21",
    prazoFinalPagamento: "2024-02-05",
    status: "agendado",
    totalLotes: 28,
    valorEstimado: "R$ 280.000,00"
  },
  {
    id: 3,
    nome: "Leilão de Reprodutores Elite",
    local: "Híbrido - Centro de Eventos",
    dataInicio: "2024-01-10",
    dataAndamento: "2024-01-10",
    dataEncerramento: "2024-01-11",
    prazoFinalPagamento: "2024-01-25",
    status: "em_andamento",
    totalLotes: 15,
    valorEstimado: "R$ 750.000,00"
  },
  {
    id: 4,
    nome: "Leilão de Terras Rurais",
    local: "Presencial - Auditório Municipal",
    dataInicio: "2023-12-20",
    dataAndamento: "2023-12-20",
    dataEncerramento: "2023-12-21",
    prazoFinalPagamento: "2024-01-05",
    status: "finalizado",
    totalLotes: 8,
    valorEstimado: "R$ 1.200.000,00"
  },
];

export default function Leiloes() {
  const [searchTerm, setSearchTerm] = useState("");

  const getStatusBadge = (status: string) => {
    const statusMap = {
      agendado: { label: "Agendado", variant: "secondary" as const },
      em_andamento: { label: "Em Andamento", variant: "default" as const },
      finalizado: { label: "Finalizado", variant: "success" as const },
    };
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const };
  };

  const filteredLeiloes = mockLeiloes.filter(leilao =>
    leilao.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leilao.local.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Leilões</h1>
          <p className="text-muted-foreground">Gerencie todos os leilões do sistema</p>
        </div>
        
        <Button className="gap-2">
          <Plus size={20} />
          Novo Leilão
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Buscar leilões..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-6">
        {filteredLeiloes.map((leilao) => (
          <Card key={leilao.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{leilao.nome}</CardTitle>
                  <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                    <MapPin size={16} />
                    <span>{leilao.local}</span>
                  </div>
                </div>
                <Badge variant={getStatusBadge(leilao.status).variant}>
                  {getStatusBadge(leilao.status).label}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Data de Início</div>
                  <div className="flex items-center gap-1">
                    <Calendar size={16} />
                    <span>{leilao.dataInicio}</span>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Encerramento</div>
                  <div className="flex items-center gap-1">
                    <Calendar size={16} />
                    <span>{leilao.dataEncerramento}</span>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Total de Lotes</div>
                  <div className="flex items-center gap-1">
                    <Users size={16} />
                    <span>{leilao.totalLotes} lotes</span>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Valor Estimado</div>
                  <div className="font-semibold text-primary">{leilao.valorEstimado}</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Prazo final para pagamento: <span className="font-medium">{leilao.prazoFinalPagamento}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Ver Detalhes
                    </Button>
                    <Button size="sm">
                      Editar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}