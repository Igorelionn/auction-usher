import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import Dashboard from "./pages/Dashboard";
import Leiloes from "./pages/Leiloes";
import Arrematantes from "./pages/Arrematantes";
import Lotes from "./pages/Lotes";
import Faturas from "./pages/Faturas";
import Relatorios from "./pages/Relatorios";
import Inadimplencia from "./pages/Inadimplencia";
import Configuracoes from "./pages/Configuracoes";
import NotFoundPage from "./pages/NotFoundPage";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "@/hooks/use-auth";
import { MigrationManager } from "@/components/MigrationManager";
import { MigrationNotification } from "@/components/MigrationNotification";
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
    },
  },
});

// Componente wrapper para sincronização em tempo real
function AppWithRealtime({ children }: { children: React.ReactNode }) {
  useRealtimeSync();
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SpeedInsights />
      <Analytics />
      <AuthProvider>
              <AppWithRealtime>
                <MigrationNotification />
                <BrowserRouter future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true
                }}>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout><Dashboard /></Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leiloes"
                element={
                  <ProtectedRoute>
                    <Layout><Leiloes /></Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lotes"
                element={
                  <ProtectedRoute>
                    <Layout><Lotes /></Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/arrematantes"
                element={
                  <ProtectedRoute>
                    <Layout><Arrematantes /></Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faturas"
                element={
                  <ProtectedRoute>
                    <Layout><Faturas /></Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inadimplencia"
                element={
                  <ProtectedRoute>
                    <Layout><Inadimplencia /></Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/relatorios"
                element={
                  <ProtectedRoute>
                    <Layout><Relatorios /></Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configuracoes"
                element={
                  <ProtectedRoute>
                    <Layout><Configuracoes /></Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/migracao"
                element={
                  <ProtectedRoute>
                    <Layout><MigrationManager /></Layout>
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AppWithRealtime>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
