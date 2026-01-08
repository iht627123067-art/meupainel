import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import Alerts from "./pages/Alerts";
import Pipeline from "./pages/Pipeline";
import LinkedIn from "./pages/LinkedIn";
import Research from "./pages/Research";
import RssPage from "./pages/Rss";
import Settings from "./pages/Settings";
import Content from "./pages/Content";
import ReviewPage from "./pages/Review";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
