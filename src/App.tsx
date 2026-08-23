import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LiveDataProvider } from "@/contexts/LiveDataContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppShell from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import CommandCenter from "@/pages/CommandCenter";
import LiveMonitoring from "@/pages/LiveMonitoring";
import Incidents from "@/pages/Incidents";
import IncidentDetail from "@/pages/IncidentDetail";
import Sources from "@/pages/Sources";
import Zones from "@/pages/Zones";
import Rules from "@/pages/Rules";
import Evidence from "@/pages/Evidence";
import Analytics from "@/pages/Analytics";
import AIModels from "@/pages/AIModels";
import RocketRidePipelines from "@/pages/RocketRidePipelines";
import SuspectTracking from "@/pages/SuspectTracking";
import AuditLogs from "@/pages/AuditLogs";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LiveDataProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<Login />} />

                {/* Protected — all wrapped in AppShell (which redirects to /login if not authed) */}
                <Route element={<AppShell />}>
                  <Route path="/" element={<CommandCenter />} />
                  <Route path="/monitoring" element={<LiveMonitoring />} />
                  <Route path="/tracking" element={<SuspectTracking />} />
                  <Route path="/incidents" element={<Incidents />} />
                  <Route path="/incidents/:id" element={<IncidentDetail />} />
                  <Route path="/sources" element={<Sources />} />
                  <Route path="/zones" element={<Zones />} />
                  <Route path="/rules" element={<Rules />} />
                  <Route path="/evidence" element={<Evidence />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/rocketride" element={<RocketRidePipelines />} />
                  <Route path="/ai-models" element={<AIModels />} />
                  <Route path="/audit-logs" element={<AuditLogs />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </LiveDataProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);


export default App;

