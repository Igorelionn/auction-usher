import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  Gavel,
  Package,
  Users,
  FileText,
  AlertTriangle,
  BarChart3,
  Settings,
} from "lucide-react";

const menuItems = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: Gavel, label: "Leilões", path: "/leiloes" },
  { icon: Package, label: "Lotes", path: "/lotes" },
  { icon: Users, label: "Arrematantes", path: "/arrematantes" },
  { icon: FileText, label: "Faturas", path: "/faturas" },
  { icon: AlertTriangle, label: "Inadimplência", path: "/inadimplencia" },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-card border-r border-border h-screen flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-primary">Sistema de Leilões</h1>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}