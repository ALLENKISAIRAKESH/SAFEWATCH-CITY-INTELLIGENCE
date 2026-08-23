import React, { useEffect } from 'react';
import { AlertTriangle, Clock, MapPin, Check, Bell } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  location: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface AlertPanelProps {
  alerts: Alert[];
  onAcknowledgeAlert: (alertId: string) => void;
}

const AlertPanel: React.FC<AlertPanelProps> = ({ alerts, onAcknowledgeAlert }) => {
  // Play alert sounds for critical alerts
  useEffect(() => {
    const criticalAlerts = alerts.filter(alert => 
      alert.type === 'critical' && !alert.acknowledged
    );
    
    if (criticalAlerts.length > 0) {
      // Create audio context for alert sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playAlertTone = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      };
      
      playAlertTone();
    }
  }, [alerts]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-alert-critical animate-pulse" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-alert-warning" />;
      default:
        return <Bell className="w-4 h-4 text-surveillance" />;
    }
  };

  const getAlertBorderColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'border-l-alert-critical';
      case 'warning':
        return 'border-l-alert-warning';
      default:
        return 'border-l-surveillance';
    }
  };

  const getAlertBgColor = (type: string, acknowledged: boolean) => {
    if (acknowledged) return 'bg-muted/50';
    
    switch (type) {
      case 'critical':
        return 'bg-alert-critical/10 animate-alert-pulse';
      case 'warning':
        return 'bg-alert-warning/10';
      default:
        return 'bg-surveillance/10';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <Card className="h-full shadow-panel">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-alert-critical/20">
              <AlertTriangle className="w-4 h-4 text-alert-critical" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Alert Management</h3>
              <p className="text-xs text-muted-foreground font-mono">
                {unacknowledgedCount} unacknowledged
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {unacknowledgedCount > 0 && (
              <div className="w-6 h-6 bg-alert-critical rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">{unacknowledgedCount}</span>
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="h-96">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <Check className="w-12 h-12 text-status-safe mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No active alerts</p>
              <p className="text-xs text-muted-foreground font-mono">System monitoring</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border-l-4 p-3 rounded-r-lg transition-smooth ${getAlertBorderColor(alert.type)} ${getAlertBgColor(alert.type, alert.acknowledged)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                            alert.type === 'critical' ? 'bg-alert-critical text-white' :
                            alert.type === 'warning' ? 'bg-alert-warning text-white' :
                            'bg-surveillance text-white'
                          }`}>
                            {alert.type}
                          </span>
                          {alert.acknowledged && (
                            <span className="text-xs bg-status-safe text-white px-2 py-1 rounded">
                              ACKNOWLEDGED
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-foreground font-medium mb-2">
                          {alert.message}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground font-mono">
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{alert.location}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(alert.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAcknowledgeAlert(alert.id)}
                        className="ml-2 text-xs h-7"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        ACK
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </Card>
  );
};

export default AlertPanel;