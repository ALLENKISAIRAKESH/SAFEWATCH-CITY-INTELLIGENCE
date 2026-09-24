import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import CameraFeed from './CameraFeed';
import AlertPanel from './AlertPanel';
import StatusMonitor from './StatusMonitor';
import ControlPanel from './ControlPanel';
import SourceSelector, { SourceType } from './SourceSelector';
import { Card } from '@/components/ui/card';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  location: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface SystemStatus {
  peopleCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  systemStatus: 'online' | 'offline' | 'maintenance';
  cameraStatus: 'active' | 'inactive';
  alertsCount: number;
}

const SafeWatchDashboard = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    peopleCount: 0,
    riskLevel: 'low',
    systemStatus: 'online',
    cameraStatus: 'active',
    alertsCount: 0,
  });
  const [isSimulationActive, setIsSimulationActive] = useState(true);
  const lastAlertRef = useRef<Record<string, number>>({});

  // Source selection state
  const [sourceType, setSourceType] = useState<SourceType>('webcam');
  const [sourceUrl, setSourceUrl] = useState<string | undefined>(undefined);
  const [uploadFile, setUploadFile] = useState<File | undefined>(undefined);

  // Create/revoke object URL for upload
  const uploadObjectUrl = useMemo(() => {
    if (!uploadFile) return undefined;
    return URL.createObjectURL(uploadFile);
  }, [uploadFile]);

  // Handle real-time detection updates from camera
  const handleDetectionUpdate = (
    peopleCount: number,
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    hasMovement: boolean
  ) => {
    setSystemStatus(prev => ({
      ...prev,
      peopleCount,
      riskLevel,
    }));

    // Generate alerts from actual detections, with a 10s debounce per rule.
    const now = Date.now();
    const emitAlert = (key: string, alert: Alert) => {
      if (now - (lastAlertRef.current[key] ?? 0) < 10000) return;
      lastAlertRef.current[key] = now;
      setAlerts(prev => [alert, ...prev].slice(0, 20));
    };

    if (riskLevel === 'critical' && peopleCount > 5) {
        const newAlert: Alert = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'critical',
          message: `Critical crowd density detected - ${peopleCount} people in frame`,
          location: 'Zone A - Camera Feed',
          timestamp: new Date(),
          acknowledged: false,
        };
        emitAlert('critical-crowd', newAlert);
      } else if (riskLevel === 'high' && peopleCount > 3) {
        const newAlert: Alert = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'warning',
          message: `High activity detected - ${peopleCount} people detected`,
          location: 'Zone A - Camera Feed',
          timestamp: new Date(),
          acknowledged: false,
        };
        emitAlert('high-activity', newAlert);
      } else if (hasMovement && peopleCount > 0) {
        if (peopleCount > 0) {
          const newAlert: Alert = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'info',
            message: `Movement detected - ${peopleCount} people active`,
            location: 'Zone A - Camera Feed',
            timestamp: new Date(),
            acknowledged: false,
          };
          emitAlert('movement', newAlert);
        }
      }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-alert-critical';
      case 'high': return 'text-alert-warning';
      case 'medium': return 'text-warning';
      case 'low': return 'text-status-safe';
      default: return 'text-surveillance';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 font-sans">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-surveillance/20 shadow-surveillance">
              <Shield className="w-6 h-6 text-surveillance" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">SafeWatch</h1>
              <p className="text-sm text-muted-foreground font-mono">
                AI-Powered Safety Management System
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  systemStatus.systemStatus === 'online'
                    ? 'bg-status-safe animate-status-glow'
                    : 'bg-alert-critical'
                }`}
              />
              <span className="text-sm font-mono text-muted-foreground">
                System {systemStatus.systemStatus.toUpperCase()}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground font-mono">
                {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Source selector */}
      <div className="mb-4">
        <SourceSelector
          current={sourceType}
          sourceUrl={sourceUrl}
          onChange={(type, urlOrFile) => {
            setSourceType(type);
            if (type === "upload" && urlOrFile instanceof File) {
              setUploadFile(urlOrFile);
              setSourceUrl(undefined);
            } else if ((type === "drone" || type === "mobile") && typeof urlOrFile === "string") {
              setSourceUrl(urlOrFile);
              setUploadFile(undefined);
            } else if (type === "webcam") {
              setSourceUrl(undefined);
              setUploadFile(undefined);
            }
          }}
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Camera Feed - Main Area */}
        <div className="lg:col-span-2">
          <CameraFeed
            sourceType={sourceType}
            sourceUrl={sourceType === "upload" ? uploadObjectUrl : sourceUrl}
            isActive={systemStatus.cameraStatus === 'active'}
            peopleCount={systemStatus.peopleCount}
            riskLevel={systemStatus.riskLevel}
            onDetectionUpdate={handleDetectionUpdate}
          />
        </div>

        {/* Status Monitor */}
        <div className="lg:col-span-1">
          <StatusMonitor
            systemStatus={systemStatus}
            alertsCount={alerts.filter(a => !a.acknowledged).length}
          />
        </div>

        {/* Alert Panel */}
        <div className="lg:col-span-1">
          <AlertPanel
            alerts={alerts}
            onAcknowledgeAlert={acknowledgeAlert}
          />
        </div>

        {/* Control Panel - Full Width */}
        <div className="lg:col-span-4">
          <ControlPanel
            isSimulationActive={isSimulationActive}
            onToggleSimulation={setIsSimulationActive}
            systemStatus={systemStatus}
          />
        </div>
      </div>

      {/* Risk Level Indicator */}
      <div className="fixed bottom-6 right-6">
        <Card className="p-4 shadow-panel border-border/50 bg-card/90 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <AlertTriangle className={`w-5 h-5 ${getRiskColor(systemStatus.riskLevel)}`} />
            <div>
              <div className="text-xs text-muted-foreground font-mono">RISK LEVEL</div>
              <div
                className={`text-sm font-bold uppercase ${getRiskColor(
                  systemStatus.riskLevel
                )}`}
              >
                {systemStatus.riskLevel}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SafeWatchDashboard;
