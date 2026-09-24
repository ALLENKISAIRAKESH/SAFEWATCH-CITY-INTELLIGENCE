import React from 'react';
import { Play, Square, Settings, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

interface SystemStatus {
  peopleCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  systemStatus: 'online' | 'offline' | 'maintenance';
  cameraStatus: 'active' | 'inactive';
  alertsCount: number;
}

interface ControlPanelProps {
  isSimulationActive: boolean;
  onToggleSimulation: (active: boolean) => void;
  systemStatus: SystemStatus;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  isSimulationActive, 
  onToggleSimulation, 
  systemStatus 
}) => {
  const handleExportData = () => {
    // Simulate data export
    const data = {
      timestamp: new Date().toISOString(),
      systemStatus,
      exportType: 'incident_report'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `safewatch_report_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const zones = [
    { id: 'zone-a', name: 'Main Entrance', status: 'active', risk: 'medium' },
    { id: 'zone-b', name: 'Emergency Exit', status: 'active', risk: 'low' },
    { id: 'zone-c', name: 'Central Area', status: 'active', risk: systemStatus.riskLevel },
    { id: 'zone-d', name: 'Parking Area', status: 'inactive', risk: 'low' },
  ];

  const getZoneStatusColor = (status: string) => {
    return status === 'active' ? 'bg-status-safe' : 'bg-muted-foreground';
  };

  const getZoneRiskVariant = (risk: string) => {
    switch (risk) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'default';
      default: return 'outline';
    }
  };

  return (
    <Card className="shadow-panel">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-surveillance/20">
              <Settings className="w-4 h-4 text-surveillance" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Control Panel</h3>
              <p className="text-xs text-muted-foreground font-mono">System management & monitoring</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="font-mono">
              v2.1.0
            </Badge>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${systemStatus.systemStatus === 'online' ? 'bg-status-safe animate-pulse' : 'bg-alert-critical'}`} />
              <span className="text-xs font-mono text-muted-foreground">
                {systemStatus.systemStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Real-Time AI Operations Control */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Real-Time AI Engine</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                <div>
                  <div className="text-sm font-medium">Real-Time YOLO & AI Inference</div>
                  <div className="text-xs text-muted-foreground">Live object detection & crowd analytics</div>
                </div>
                <Switch 
                  checked={isSimulationActive} 
                  onCheckedChange={onToggleSimulation}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant={isSimulationActive ? "default" : "secondary"}
                  onClick={() => onToggleSimulation(!isSimulationActive)}
                  className="flex-1"
                >
                  {isSimulationActive ? (
                    <>
                      <Square className="w-3 h-3 mr-2" />
                      Pause Live Stream
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 mr-2" />
                      Resume Live Stream
                    </>
                  )}
                </Button>
                
                <Button size="sm" variant="outline">
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Zone Management */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Zone Status</h4>
            
            <div className="space-y-2">
              {zones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between p-2 rounded border border-border">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${getZoneStatusColor(zone.status)}`} />
                    <div>
                      <div className="text-xs font-medium">{zone.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{zone.id}</div>
                    </div>
                  </div>
                  <Badge variant={getZoneRiskVariant(zone.risk)} className="text-xs">
                    {zone.risk}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Controls */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Emergency & Reports</h4>
            
            <div className="space-y-2">
              <Button
                variant="destructive"
                size="sm"
                className="w-full justify-start"
                disabled={!isSimulationActive}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Emergency Alert
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleExportData}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Settings className="w-4 h-4 mr-2" />
                System Settings
              </Button>
            </div>
            
            {/* Quick Stats */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="text-xs text-muted-foreground mb-2">Quick Stats</div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <div className="text-surveillance font-bold">{systemStatus.peopleCount}</div>
                  <div className="text-muted-foreground">People</div>
                </div>
                <div>
                  <div className="text-alert-critical font-bold">{systemStatus.alertsCount}</div>
                  <div className="text-muted-foreground">Alerts</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Information Bar */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <div className="flex items-center space-x-4">
              <span>SafeWatch AI v2.1.0</span>
              <span>•</span>
              <span>Last update: {new Date().toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>CPU: 45%</span>
              <span>•</span>
              <span>Memory: 2.1GB</span>
              <span>•</span>
              <span>Uptime: 24h 15m</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ControlPanel;