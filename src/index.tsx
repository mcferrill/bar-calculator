import { createRoot } from "react-dom/client";
import Calculator from "./Calculator";

const container = document.getElementById("root");
if (!container) throw new Error("Root container not found");

const root = createRoot(container);
root.render(<Calculator />);
