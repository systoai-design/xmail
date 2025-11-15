import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletContextProvider } from "./contexts/WalletContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { KeyRegistrar } from "./components/KeyRegistrar";
import { CustomCursor } from "@/components/CustomCursor";
import Landing from "./pages/Landing";
import Inbox from "./pages/Inbox";
import Compose from "./pages/Compose";
import EmailView from "./pages/EmailView";
import Scheduled from "./pages/Scheduled";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <WalletContextProvider>
        <TooltipProvider>
          <CustomCursor />
          <Toaster />
          <Sonner />
          <KeyRegistrar />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/compose" element={<Compose />} />
            <Route path="/email/:id" element={<EmailView />} />
            <Route path="/scheduled" element={<Scheduled />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </WalletContextProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
