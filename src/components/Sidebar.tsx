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
  ChevronsLeft,
  ChevronsRight,
  LogOut,
} from "lucide-react";
import { useSidebar } from "@/hooks/use-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./ui/button";

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
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { logout } = useAuth();

  return (
    <div className="relative">
      <div className={cn(
        "bg-card border-r border-border h-screen flex flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className="p-6 border-b border-border flex items-center justify-center">
          {!isCollapsed && (
            <img 
              src="/arthur-lira-logo.png" 
              alt="Arthur Lira Leilões" 
              className="h-16 w-auto object-contain"
            />
          )}
        </div>
        
        {/* Botão toggle posicionado na borda direita */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn(
            "group absolute -right-4 top-[280px] z-10 h-8 w-8 rounded-full bg-card border border-border shadow-md",
            "hover:bg-primary/10 hover:border-primary/30 hover:shadow-lg hover:scale-110 transition-all duration-200",
            "flex items-center justify-center"
          )}
        >
          {isCollapsed ? (
            <ChevronsRight className="h-4 w-4 text-foreground/70 group-hover:translate-x-0.5 transition-transform duration-200" />
          ) : (
            <ChevronsLeft className="h-4 w-4 text-foreground/70 group-hover:-translate-x-0.5 transition-transform duration-200" />
          )}
        </Button>
        
        <nav className="flex-1 p-4 flex flex-col">
          <ul className="space-y-2 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              // Definir animação específica para cada ícone
              const iconAnimation = {
                Home: "group-hover:scale-110 group-hover:rotate-[8deg] transition-all duration-300",
                Gavel: "group-hover:rotate-[15deg] group-hover:scale-110 transition-all duration-300",
                Package: "group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300",
                Users: "group-hover:scale-125 transition-all duration-300",
                FileText: "group-hover:rotate-[10deg] group-hover:scale-110 transition-all duration-300",
                AlertTriangle: "group-hover:animate-bounce",
                BarChart3: "group-hover:scale-110 group-hover:translate-y-[-2px] transition-all duration-300",
                Settings: "group-hover:rotate-90 transition-all duration-500",
              }[item.icon.name] || "group-hover:scale-110 transition-all duration-300";
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "group flex items-center rounded-lg transition-colors",
                      isCollapsed ? "justify-center py-3 px-5 mx-0" : "space-x-3 px-3 py-2",
                      isActive
                        ? "bg-gray-100 text-black"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className={cn("h-5 w-5 flex-shrink-0", iconAnimation)} />
                    {!isCollapsed && <span className="group-hover:translate-x-1 transition-transform duration-300">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
          
          {/* Botão de Logout */}
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={logout}
              className={cn(
                "w-full flex items-center rounded-lg transition-colors text-muted-foreground hover:text-red-600 hover:bg-red-50",
                isCollapsed ? "justify-center py-3 px-5" : "justify-start space-x-3 px-3 py-2"
              )}
              title={isCollapsed ? "Sair" : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>Sair</span>}
            </Button>
          </div>
        </nav>
      </div>
    </div>
  );
}