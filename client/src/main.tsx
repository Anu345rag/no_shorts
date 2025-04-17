import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { FilterContextProvider } from "./contexts/FilterContext";

createRoot(document.getElementById("root")!).render(
  <FilterContextProvider>
    <App />
  </FilterContextProvider>
);
