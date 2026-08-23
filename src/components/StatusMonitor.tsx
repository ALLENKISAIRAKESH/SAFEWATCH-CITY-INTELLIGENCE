import React from 'react';
import { Activity, Users, Shield, AlertTriangle, Camera, Server } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface SystemStatus {
  peopleCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  systemStatus: 'online' | 'offline' | 'maintenance';
  cameraStatus: 'active' | 'inactive';
  alertsCount: number;
}

interface StatusMonitorProps {
  systemStatus: SystemStatus;
  alertsCount: number;
}

const StatusMonitor: React.FC<StatusMonitorProps> = ({ systemStatus, alertsCount }) => {
  const getRiskPercentage = () => {
    switch (systemStatus.riskLevel) {
      case 'critical': return 90;
      case 'high': return 70;
      case 'medium': return 45;
      case 'low': return 20;
      default: return 0;
    }
  };

  const getRiskColor = () => {
    switch (systemStatus.riskLevel) {
      case 'critical': return 'text-alert-critical';
      case 'high': return 'text-alert-warning';
      case 'medium': return 'text-warning';
      case 'low': return 'text-status-safe';
      default: return 'text-surveillance';
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-status-safe animate-pulse" />
            <span className="text-status-safe font-bold">ONLINE</span>
          </div>
        );
      case 'offline':
      case 'inactive':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-alert-critical" />
            <span className="text-alert-critical font-bold">OFFLINE</span>
          </div>
        );
      case 'maintenance':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-alert-warning animate-pulse" />
            <span className="text-alert-warning font-bold">MAINTENANCE</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getCrowdDensityColor = () => {
    if (systemStatus.peopleCount > 40) return 'bg-alert-critical';
    if (systemStatus.peopleCount > 30) return 'bg-alert-warning';
    if (systemStatus.peopleCount > 20) return 'bg-warning';
    return 'bg-status-safe';
  };

  return (
    <Card className="h-full shadow-panel">
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-activity/20">
            <Activity className="w-4 h-4 text-surveillance" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">System Status</h3>
            <p className="text-xs text-muted-foreground font-mono">Real-time monitoring</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* System Health */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Server className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">System</span>
              </div>
              {getStatusIndicator(systemStatus.systemStatus)}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Camera Feed</span>
              </div>
              {getStatusIndicator(systemStatus.cameraStatus)}
            </div>
          </div>

          {/* Crowd Monitoring */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-surveillance" />
                <span className="text-sm font-medium">People Count</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-mono text-surveillance">
                  {systemStatus.peopleCount}
                </div>
                <div className="text-xs text-muted-foreground">detected</div>
              </div>
            </div>

            {/* Crowd Density Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Crowd Density</span>
                <span>{systemStatus.peopleCount}/50</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${getCrowdDensityColor()}`}
                  style={{ width: `${Math.min((systemStatus.peopleCount / 50) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Risk Level</span>
              </div>
              <div className={`text-sm font-bold uppercase ${getRiskColor()}`}>
                {systemStatus.riskLevel}
              </div>
            </div>

            <Progress 
              value={getRiskPercentage()} 
              className="h-3"
            />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Low</span>
              <span>Critical</span>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Active Alerts</span>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold font-mono ${alertsCount > 0 ? 'text-alert-critical' : 'text-status-safe'}`}>
                  {alertsCount}
                </div>
                <div className="text-xs text-muted-foreground">pending</div>
              </div>
            </div>
          </div>

          {/* AI Analysis Status */}
          <div className="p-3 rounded-lg bg-surveillance/10 border border-surveillance/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-surveillance">AI Analysis</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-surveillance animate-pulse" />
                <span className="text-xs font-mono text-surveillance">ACTIVE</span>
              </div>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground font-mono">
              <div>• Crowd detection: ✓</div>
              <div>• Motion analysis: ✓</div>
              <div>• Anomaly detection: ✓</div>
              <div>• Pose estimation: ✓</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StatusMonitor;