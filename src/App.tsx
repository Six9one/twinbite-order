import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Contexts
import { LanguageProvider } from "@/context/LanguageContext";
import { LoyaltyProvider } from "@/context/LoyaltyContext";

// PWA Components
import { PWAInstallPrompt, OfflineIndicator } from "@/components/PWAComponents";
import { UpdateChecker } from "@/components/UpdateChecker";

// Pages
import Index from "./pages/Index";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import TVDashboard from "./pages/TVDashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import TicketPortal from "./pages/TicketPortal";
import CrewDashboard from "./pages/CrewDashboard";
import KitchenDashboard from "./pages/KitchenDashboard";
import NotFound from "./pages/NotFound";
import MentionsLegales from "./pages/MentionsLegales";
import Confidentialite from "./pages/Confidentialite";
import CGV from "./pages/CGV";

// Components
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <LoyaltyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <OfflineIndicator />
            <UpdateChecker />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/admin" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/tv" element={<TVDashboard />} />
                <Route path="/crew" element={<CrewDashboard />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-cancel" element={<PaymentCancel />} />
                <Route path="/tickets" element={<TicketPortal />} />
                <Route path="/ticket" element={<TicketPortal />} />
                <Route path="/kitchen" element={<KitchenDashboard />} />
                {/* Legal pages */}
                <Route path="/mentions-legales" element={<MentionsLegales />} />
                <Route path="/confidentialite" element={<Confidentialite />} />
                <Route path="/cgv" element={<CGV />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <PWAInstallPrompt />
            </BrowserRouter>
          </TooltipProvider>
        </LoyaltyProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;