import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Feed = lazy(() => import("./pages/Feed"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const LinkedIn = lazy(() => import("./pages/LinkedIn"));
const Research = lazy(() => import("./pages/Research"));
const RssPage = lazy(() => import("./pages/Rss"));
const Settings = lazy(() => import("./pages/Settings"));
const Content = lazy(() => import("./pages/Content"));
const ReviewPage = lazy(() => import("./pages/Review"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/content" element={<Content />} />
            <Route path="/linkedin" element={<LinkedIn />} />
            <Route path="/research" element={<Research />} />
            <Route path="/rss" element={<RssPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
