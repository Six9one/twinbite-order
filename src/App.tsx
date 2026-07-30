import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { runAutoReleve } from "@/lib/kitchenAutoReleve";

import { LanguageProvider } from "@/context/LanguageContext";
import { OrderProvider } from "@/context/OrderContext";
import { TenantProvider } from "@/context/TenantContext";
import { VirtualKeyboardProvider } from "@/context/VirtualKeyboardContext";
import { VirtualKeyboard } from "@/components/VirtualKeyboard";

// PWA Components
import { PWAInstallPrompt, OfflineIndicator } from "@/components/PWAComponents";
import { UpdateChecker } from "@/components/UpdateChecker";

// Main Landing Page (loaded directly for instant FCP)
import Index from "./pages/Index";

// Lazy Loaded Pages (Code Splitting for PageSpeed optimization)
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const TVDashboard = lazy(() => import("./pages/TVDashboard"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel"));
const TicketPortal = lazy(() => import("./pages/TicketPortal"));
const CrewDashboard = lazy(() => import("./pages/CrewDashboard"));
const KitchenDashboard = lazy(() => import("./pages/KitchenDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales"));
const Confidentialite = lazy(() => import("./pages/Confidentialite"));
const CGV = lazy(() => import("./pages/CGV"));
const SpinWheel = lazy(() => import("./pages/SpinWheel"));
const SpinPage = lazy(() => import("./pages/SpinPage"));
const KioskPage = lazy(() => import("./pages/KioskPage"));
const POSPage = lazy(() => import("./pages/POSPage"));
const PromoWeekend = lazy(() => import("./pages/PromoWeekend"));
const RegisterRestaurant = lazy(() => import("./pages/RegisterRestaurant"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));

// Components
import ErrorBoundary from "./components/ErrorBoundary";
import { UmamiTracker } from "./components/UmamiTracker";
import TestSandboxModal from "./components/TestSandboxModal";

const PageLoader = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-medium text-gray-500 animate-pulse">Chargement...</span>
    </div>
);

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,   // 5 min default — no refetch for 5 min
            gcTime:    1000 * 60 * 60,   // keep in memory 1 h
            refetchOnWindowFocus: false, // don't re-fetch when clicking back to window
            refetchOnReconnect: false,   // don't re-fetch on network reconnect
            retry: 1,                    // only retry once on error
        },
    },
});

const App = () => {
    useEffect(() => {
        runAutoReleve().catch(err => console.error("Error in auto-releve:", err));
    }, []);

    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <TenantProvider>
                    <LanguageProvider>
                        <TooltipProvider>
                            <VirtualKeyboardProvider>
                                <UmamiTracker />
                                <Toaster />
                                <Sonner />
                                <OfflineIndicator />
                                <UpdateChecker />
                                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                                    <Suspense fallback={<PageLoader />}>
                                        <Routes>
                                            <Route path="/" element={<Index />} />
                                            <Route path="/admin" element={<AdminLogin />} />
                                            <Route path="/admin/dashboard" element={<AdminDashboard />} />
                                            <Route path="/tv" element={<TVDashboard />} />
                                            <Route path="/crew" element={<CrewDashboard />} />
                                            <Route path="/payment-success" element={<PaymentSuccess />} />
                                            <Route path="/payment/success" element={<PaymentSuccess />} />
                                            <Route path="/payment-cancel" element={<PaymentCancel />} />
                                            <Route path="/payment/cancel" element={<PaymentCancel />} />
                                            <Route path="/tickets" element={<TicketPortal />} />
                                            <Route path="/ticket" element={<TicketPortal />} />
                                            <Route path="/kitchen" element={<KitchenDashboard />} />
                                            {/* Legal pages */}
                                            <Route path="/mentions-legales" element={<MentionsLegales />} />
                                            <Route path="/confidentialite" element={<Confidentialite />} />
                                            <Route path="/cgv" element={<CGV />} />
                                            <Route path="/avis" element={<SpinWheel />} />
                                            <Route path="/spin" element={<SpinPage />} />
                                            <Route path="/kiosk" element={<KioskPage />} />
                                            <Route path="/pos" element={<POSPage />} />
                                            <Route path="/register-restaurant" element={<RegisterRestaurant />} />
                                            <Route path="/superadmin" element={<SuperAdminDashboard />} />
                                            <Route path="/promo-weekend" element={<OrderProvider><PromoWeekend /></OrderProvider>} />
                                            <Route path="/promo" element={<OrderProvider><PromoWeekend /></OrderProvider>} />
                                            <Route path="/offre" element={<OrderProvider><PromoWeekend /></OrderProvider>} />
                                            <Route path="/offre-du-soir" element={<OrderProvider><PromoWeekend /></OrderProvider>} />
                                            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                                            <Route path="*" element={<NotFound />} />
                                        </Routes>
                                    </Suspense>
                                    <PWAInstallPrompt />
                                    <VirtualKeyboard />
                                    <TestSandboxModal />
                                </BrowserRouter>
                            </VirtualKeyboardProvider>
                        </TooltipProvider>
                    </LanguageProvider>
                </TenantProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
};

export default App;
