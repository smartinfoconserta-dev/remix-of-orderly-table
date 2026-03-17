import { createRoot } from "react-dom/client";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <RestaurantProvider>
    <App />
  </RestaurantProvider>
);
