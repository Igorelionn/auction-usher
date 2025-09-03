import { Sidebar } from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Bell, User, LogOut } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Sistema de Gestão de Leilões
            </h2>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell size={20} />
              </Button>
              
              <div className="flex items-center space-x-2">
                <div className="text-sm text-right">
                  <div className="font-medium">Administrador</div>
                  <div className="text-muted-foreground">admin@leiloes.com</div>
                </div>
                <Button variant="ghost" size="sm">
                  <User size={20} />
                </Button>
              </div>
              
              <Button variant="ghost" size="sm" className="text-destructive">
                <LogOut size={20} />
              </Button>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}