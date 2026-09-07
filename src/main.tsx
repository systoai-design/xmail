import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@designcodeio/threeui/style.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
