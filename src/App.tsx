import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import Index from "./pages/Index";
import ClientePage from "./pages/ClientePage";
import GarcomPage from "./pages/GarcomPage";
import MesaPage from "./pages/MesaPage";
import CaixaPage from "./pages/CaixaPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RestaurantProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/cliente" element={<ClientePage />} />
            <Route path="/garcom" element={<GarcomPage />} />
            <Route path="/mesa/:id" element={<MesaPage />} />
            <Route path="/caixa" element={<CaixaPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </RestaurantProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
