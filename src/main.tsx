import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@designcodeio/threeui/style.css";
import "./index.css";

/**
 * A startup failure must never render nothing.
 *
 * An error thrown while modules load happens before React exists, so no error
 * boundary can catch it -- the page just stays empty. That is exactly how a
 * deploy with unset environment variables presents: a white screen, no console
 * anyone thinks to open, and no clue which variable is missing.
 */
const root = document.getElementById("root")!;

try {
  createRoot(root).render(<App />);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("xmail failed to start:", error);
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
                background:#08080A;color:#F2F0EB;
                font:14px/1.6 ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif">
      <div style="max-width:560px">
        <h1 style="font-size:20px;font-weight:400;margin:0 0 12px">xmail could not start</h1>
        <p style="margin:0 0 16px;color:#9A968E">This is a configuration problem, not a network one.</p>
        <pre style="margin:0;padding:16px;border:1px solid rgba(255,255,255,.12);border-radius:12px;
                    background:rgba(255,255,255,.03);white-space:pre-wrap;word-break:break-word;
                    font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">${
                      message.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)
                    }</pre>
      </div>
    </div>`;
}
