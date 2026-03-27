import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/lib/context";
import { RoleProvider, useRole } from "@/lib/roles";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import QuoteBuilder from "./pages/QuoteBuilder";
import QuotesList from "./pages/QuotesList";
import SettingsPage from "./pages/SettingsPage";
import ClientsPage from "./pages/ClientsPage";
import SuppliersPage from "./pages/SuppliersPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { role } = useRole();

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:id" element={<ProjectDetailPage />} />
      {role !== 'field' && (
        <>
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/quotes" element={<QuotesList />} />
          <Route path="/quotes/new" element={<QuoteBuilder />} />
        </>
      )}
      {role === 'admin' && (
        <Route path="/settings" element={<SettingsPage />} />
      )}
      {/* Redirect restricted routes */}
      {role === 'field' && (
        <>
          <Route path="/clients" element={<Navigate to="/" replace />} />
          <Route path="/suppliers" element={<Navigate to="/" replace />} />
          <Route path="/quotes" element={<Navigate to="/" replace />} />
          <Route path="/quotes/new" element={<Navigate to="/" replace />} />
          <Route path="/settings" element={<Navigate to="/" replace />} />
        </>
      )}
      {role === 'manager' && (
        <Route path="/settings" element={<Navigate to="/" replace />} />
      )}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <RoleProvider>
        <AppProvider>
          <BrowserRouter>
            <AppLayout>
              <AppRoutes />
            </AppLayout>
          </BrowserRouter>
        </AppProvider>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
