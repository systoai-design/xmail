import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Remotion's player renders through its own React context. If anything
    // resolves a second React instance, every hook inside <Player> throws
    // "Cannot read properties of null (reading 'useContext')". Pinning both to
    // one copy makes that class of failure unrepresentable.
    dedupe: ["react", "react-dom"],
  },
  build: {
    // The landing page previously shipped as one ~1.9 MB chunk, so a visitor
    // downloaded and parsed the entire wallet stack before the hero could paint.
    // Splitting by vendor lets the browser cache the stable parts across deploys
    // and lets the router lazy-load what a given route actually needs.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/three/") || id.includes("@react-three")) return "three";
          // Was @solana. The wallet stack is wagmi + connectors now, and it is
          // still worth its own chunk: a visitor reading the landing page has
          // no reason to parse it before they click Connect.
          if (
            id.includes("/wagmi/") ||
            id.includes("@wagmi/") ||
            id.includes("@walletconnect") ||
            id.includes("@coinbase") ||
            id.includes("@metamask") ||
            id.includes("@reown")
          ) {
            return "wallet";
          }
          if (id.includes("/viem/") || id.includes("/ox/") || id.includes("@noble") || id.includes("@scure")) {
            return "chain";
          }
          if (id.includes("@radix-ui")) return "ui";
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "react";
          }
          if (id.includes("react-quill") || id.includes("/quill")) return "editor";
          if (id.includes("/recharts/") || id.includes("/d3-")) return "charts";
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
}));
