import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";

import GarcomPage from "./pages/GarcomPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminBackButton } from "./components/AdminBackButton";
import MesaPage from "./pages/MesaPage";
import CaixaPage from "./pages/CaixaPage";
import TabletPage from "./pages/TabletPage";
import { Navigate } from "react-router-dom";
import GerentePage from "./pages/GerentePage";
import CozinhaPage from "./pages/CozinhaPage";
import AdminPage from "./pages/AdminPage";
import MasterPage from "./pages/MasterPage";

import MotoboyPage from "./pages/MotoboyPage";
import TotemPage from "./pages/TotemPage";
import TvPage from "./pages/TvPage";
import NotFound from "./pages/NotFound";
import SeedPage from "./pages/SeedPage";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Login — Orderly Table",
  "/master": "Master — Orderly Table",
  "/admin": "Admin — Orderly Table",
  "/garcom": "Garçom — Orderly Table",
  "/caixa": "Caixa — Orderly Table",
  "/delivery": "Delivery — Orderly Table",
  "/gerente": "Gerente — Orderly Table",
  "/cozinha": "Cozinha — Orderly Table",
  "/motoboy": "Motoboy — Orderly Table",
  "/totem": "Totem — Orderly Table",
  "/tv": "TV — Orderly Table",
  "/tablet": "Cardápio — Orderly Table",
};

const App = () => {
  const location = useLocation();

  useEffect(() => {
    const base = "/" + location.pathname.split("/")[1];
    document.title = ROUTE_TITLES[base] || "Orderly Table";
  }, [location.pathname]);

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
        <Route path="/totem" element={<TotemPage />} />
        <Route path="/tv" element={<TvPage />} />
        <Route path="/tablet" element={<TabletPage />} />
        <Route path="/cliente" element={<Navigate to="/tablet" replace />} />

        <Route path="/seed" element={<SeedPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

export default App;
