import { Route, Routes, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import ClientePage from "./pages/ClientePage";
import GarcomPage from "./pages/GarcomPage";
import MesaPage from "./pages/MesaPage";
import CaixaPage from "./pages/CaixaPage";
import GerentePage from "./pages/GerentePage";
import CozinhaPage from "./pages/CozinhaPage";
import AdminPage from "./pages/AdminPage";
import MasterPage from "./pages/MasterPage";
import NotFound from "./pages/NotFound";

const App = () => {
  const location = useLocation();

  return (
    <div key={location.pathname} className="route-fade-in">
      <Routes location={location}>
        <Route path="/" element={<Index />} />
        <Route path="/cliente" element={<ClientePage />} />
        <Route path="/garcom" element={<GarcomPage />} />
        <Route path="/mesa/:id" element={<MesaPage />} />
        <Route path="/caixa" element={<CaixaPage accessMode="caixa" />} />
        <Route path="/gerente" element={<GerentePage />} />
        <Route path="/cozinha" element={<CozinhaPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

export default App;
