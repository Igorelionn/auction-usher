import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Leiloes from "./pages/Leiloes";
import NotFoundPage from "./pages/NotFoundPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/leiloes" element={<Layout><Leiloes /></Layout>} />
          <Route path="/lotes" element={<Layout><div>Gestão de Lotes (Em desenvolvimento)</div></Layout>} />
          <Route path="/arrematantes" element={<Layout><div>Gestão de Arrematantes (Em desenvolvimento)</div></Layout>} />
          <Route path="/faturas" element={<Layout><div>Gestão de Faturas (Em desenvolvimento)</div></Layout>} />
          <Route path="/inadimplencia" element={<Layout><div>Gestão de Inadimplência (Em desenvolvimento)</div></Layout>} />
          <Route path="/relatorios" element={<Layout><div>Relatórios (Em desenvolvimento)</div></Layout>} />
          <Route path="/configuracoes" element={<Layout><div>Configurações (Em desenvolvimento)</div></Layout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
