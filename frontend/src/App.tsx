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
import NotFound from "@/pages/NotFound";

// SIH26127 — Vehicle Intelligence Core Modules
import VehicleIntelligence from "@/pages/VehicleIntelligence";
import LiveANPR from "@/pages/LiveANPR";
import VehicleSearch from "@/pages/VehicleSearch";
import CrossCameraAssociation from "@/pages/CrossCameraAssociation";
import Watchlists from "@/pages/Watchlists";
import TrafficAnalytics from "@/pages/TrafficAnalytics";
import AnomalyAlerts from "@/pages/AnomalyAlerts";
import ANPREvaluation from "@/pages/ANPREvaluation";

// Infrastructure & Forensics
import Sources from "@/pages/Sources";
import Evidence from "@/pages/Evidence";
import AuditLogs from "@/pages/AuditLogs";
import Settings from "@/pages/Settings";

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

                {/* Protected — wrapped in AppShell */}
                <Route element={<AppShell />}>
                  {/* SIH26127 — Vehicle Intelligence Mission Control */}
                  <Route path="/" element={<VehicleIntelligence />} />
                  <Route path="/vehicle-intelligence" element={<VehicleIntelligence />} />

                  {/* Phase 1: Live ANPR Stream */}
                  <Route path="/live-anpr" element={<LiveANPR />} />
                  <Route path="/vehicle-intelligence/live-anpr" element={<LiveANPR />} />

                  {/* Phase 4: Vehicle Search & Trajectory Reconstruction */}
                  <Route path="/search" element={<VehicleSearch />} />
                  <Route path="/vehicle-search" element={<VehicleSearch />} />
                  <Route path="/vehicle-intelligence/search" element={<VehicleSearch />} />

                  {/* Phase 3: Cross-Camera Association & Vehicle Re-ID */}
                  <Route path="/associations" element={<CrossCameraAssociation />} />
                  <Route path="/cross-camera" element={<CrossCameraAssociation />} />
                  <Route path="/vehicle-intelligence/associations" element={<CrossCameraAssociation />} />

                  {/* Phase 6: Watchlists & Hotlist Alerts */}
                  <Route path="/watchlists" element={<Watchlists />} />
                  <Route path="/vehicle-intelligence/watchlists" element={<Watchlists />} />

                  {/* Phase 5: Urban Traffic Flow & Bottleneck Analytics */}
                  <Route path="/traffic" element={<TrafficAnalytics />} />
                  <Route path="/traffic-analytics" element={<TrafficAnalytics />} />
                  <Route path="/vehicle-intelligence/traffic" element={<TrafficAnalytics />} />

                  {/* Phase 6: Route Anomaly & Plausibility Alerts */}
                  <Route path="/anomalies" element={<AnomalyAlerts />} />
                  <Route path="/anomaly-alerts" element={<AnomalyAlerts />} />
                  <Route path="/vehicle-intelligence/anomalies" element={<AnomalyAlerts />} />

                  {/* Phase 7: ANPR Pipeline Benchmarks & Model Evaluation */}
                  <Route path="/evaluation" element={<ANPREvaluation />} />
                  <Route path="/anpr-evaluation" element={<ANPREvaluation />} />
                  <Route path="/vehicle-intelligence/evaluation" element={<ANPREvaluation />} />

                  {/* Supporting Infrastructure & Forensics */}
                  <Route path="/cameras" element={<Sources />} />
                  <Route path="/sources" element={<Sources />} />
                  <Route path="/evidence" element={<Evidence />} />
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
