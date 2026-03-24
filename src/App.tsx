import { Route, Routes, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import ClientePage from "./pages/ClientePage";
import GarcomPage from "./pages/GarcomPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import MesaPage from "./pages/MesaPage";
import CaixaPage from "./pages/CaixaPage";
import GerentePage from "./pages/GerentePage";
import CozinhaPage from "./pages/CozinhaPage";
import AdminPage from "./pages/AdminPage";
import MasterPage from "./pages/MasterPage";
import PedidoPage from "./pages/PedidoPage";
import MotoboyPage from "./pages/MotoboyPage";
import TotemPage from "./pages/TotemPage";
import TvPage from "./pages/TvPage";
import NotFound from "./pages/NotFound";

const App = () => {
  const location = useLocation();

  return (
    <div key={location.pathname} className="route-fade-in">
      <Routes location={location}>
        <Route path="/" element={<Index />} />
        <Route path="/cliente" element={<ClientePage />} />
        <Route path="/garcom" element={<ProtectedRoute requiredSession="garcom"><GarcomPage /></ProtectedRoute>} />
        <Route path="/mesa/:id" element={<ProtectedRoute requiredSession="garcom"><MesaPage /></ProtectedRoute>} />
        <Route path="/caixa" element={<ProtectedRoute requiredSession="caixa"><CaixaPage accessMode="caixa" /></ProtectedRoute>} />
        <Route path="/delivery" element={<ProtectedRoute requiredSession="delivery"><CaixaPage accessMode="caixa" modoForced="somente_delivery" /></ProtectedRoute>} />
        <Route path="/gerente" element={<ProtectedRoute requiredSession="gerente"><GerentePage /></ProtectedRoute>} />
        <Route path="/cozinha" element={<CozinhaPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/master" element={<MasterPage />} />
        <Route path="/pedido" element={<PedidoPage />} />
        <Route path="/motoboy" element={<MotoboyPage />} />
        <Route path="/totem" element={<TotemPage />} />
        <Route path="/tv" element={<TvPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

export default App;
