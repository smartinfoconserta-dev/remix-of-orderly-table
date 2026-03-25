import { Route, Routes, useLocation } from "react-router-dom";
import Index from "./pages/Index";

import GarcomPage from "./pages/GarcomPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminBackButton } from "./components/AdminBackButton";
import MesaPage from "./pages/MesaPage";
import CaixaPage from "./pages/CaixaPage";
import ClientePage from "./pages/ClientePage";
import GerentePage from "./pages/GerentePage";
import CozinhaPage from "./pages/CozinhaPage";
import AdminPage from "./pages/AdminPage";
import MasterPage from "./pages/MasterPage";

import MotoboyPage from "./pages/MotoboyPage";
import TotemPage from "./pages/TotemPage";
import TvPage from "./pages/TvPage";
import NotFound from "./pages/NotFound";

const App = () => {
  const location = useLocation();

  return (
    <div key={location.pathname} className="route-fade-in">
      <AdminBackButton />
      <Routes location={location}>
        <Route path="/" element={<Index />} />
        {/* Public routes removed — cardápio will use /:slug in the future */}

        {/* Level 1: Master */}
        <Route path="/master" element={<ProtectedRoute requiredLevel="master"><MasterPage /></ProtectedRoute>} />

        {/* Level 2: Admin */}
        <Route path="/admin" element={<ProtectedRoute requiredLevel="admin"><AdminPage /></ProtectedRoute>} />

        {/* Level 3: Operational */}
        <Route path="/garcom" element={<ProtectedRoute requiredLevel="operational" requiredModule="garcom"><GarcomPage /></ProtectedRoute>} />
        <Route path="/mesa/:id" element={<ProtectedRoute requiredLevel="operational" requiredModule="garcom"><MesaPage /></ProtectedRoute>} />
        <Route path="/caixa" element={<ProtectedRoute requiredLevel="operational" requiredModule="caixa"><CaixaPage accessMode="caixa" /></ProtectedRoute>} />
        <Route path="/delivery" element={<ProtectedRoute requiredLevel="operational" requiredModule="delivery"><CaixaPage accessMode="caixa" modoForced="somente_delivery" /></ProtectedRoute>} />
        <Route path="/gerente" element={<ProtectedRoute requiredLevel="operational" requiredModule="gerente"><GerentePage /></ProtectedRoute>} />
        <Route path="/cozinha" element={<ProtectedRoute requiredLevel="operational" requiredModule="cozinha"><CozinhaPage /></ProtectedRoute>} />
        <Route path="/motoboy" element={<ProtectedRoute requiredLevel="operational" requiredModule="motoboy"><MotoboyPage /></ProtectedRoute>} />
        <Route path="/totem" element={<ProtectedRoute requiredLevel="operational" requiredModule="totem"><TotemPage /></ProtectedRoute>} />
        <Route path="/tv" element={<ProtectedRoute requiredLevel="operational" requiredModule="tv_retirada"><TvPage /></ProtectedRoute>} />
        <Route path="/cliente" element={<ClientePage />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

export default App;
