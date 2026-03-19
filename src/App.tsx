import { Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import ClientePage from "./pages/ClientePage";
import GarcomPage from "./pages/GarcomPage";
import MesaPage from "./pages/MesaPage";
import CaixaPage from "./pages/CaixaPage";
import CozinhaPage from "./pages/CozinhaPage";
import NotFound from "./pages/NotFound";

const App = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/cliente" element={<ClientePage />} />
    <Route path="/garcom" element={<GarcomPage />} />
    <Route path="/mesa/:id" element={<MesaPage />} />
    <Route path="/caixa" element={<CaixaPage accessMode="caixa" />} />
    <Route path="/gerente" element={<CaixaPage accessMode="gerente" />} />
    <Route path="/cozinha" element={<CozinhaPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;
