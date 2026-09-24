import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import {
  MOCK_INCIDENTS, MOCK_AUDIT_LOGS, Incident, AuditLog,
  Severity, IncidentStatus
} from '@/data/mockData';
import { audioAnnouncer } from '@/utils/audioAnnouncer';

const BACKEND_URL = 'http://localhost:5000';

export interface LiveMetrics {
  peopleCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  activeSourcesCount: number;
  totalIncidentsCount: number;
  activeOperators: Array<{
    user: { id: string; name: string; role: string; avatar: string };
    lastSeen: string;
    action: string;
    source: string;
  }>;
}

export interface StreamDetectionItem {
  id: string;
  label: string;
  score: number;
  source: string;
  trackId: string;
  timestamp: string;
  operatorName?: string;
}

interface LiveDataContextType {
  incidents: Incident[];
  auditLogs: AuditLog[];
  liveMetrics: LiveMetrics;
  recentDetections: StreamDetectionItem[];
  uploadedVideoUrl: string | null;
  setUploadedVideoUrl: (url: string | null) => void;
  acknowledgeIncident: (id: string) => void;
  escalateIncident: (id: string) => void;
  resolveIncident: (id: string) => void;
  createManualIncident: (title: string, severity: Severity, source: string, description: string) => void;
  appendAudit: (action: string, resource: string) => void;
  seedMockData: () => void;
  resetToFactoryDefaults: () => void;
  emitClientDetection: (peopleCount: number, riskLevel: 'low' | 'medium' | 'high' | 'critical', sourceName: string) => void;
  isConnected: boolean;
}


const LiveDataContext = createContext<LiveDataContextType | null>(null);

const STORAGE_INCIDENTS_KEY = 'safewatch_live_incidents';
const STORAGE_LOGS_KEY = 'safewatch_live_audit_logs';

export const LiveDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize from storage or fallback to mock defaults
  const [incidents, setIncidents] = useState<Incident[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_INCIDENTS_KEY);
      return stored ? JSON.parse(stored) : MOCK_INCIDENTS;
    } catch {
      return MOCK_INCIDENTS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_LOGS_KEY);
      return stored ? JSON.parse(stored) : MOCK_AUDIT_LOGS;
    } catch {
      return MOCK_AUDIT_LOGS;
    }
  });

  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({
    peopleCount: 0,
    riskLevel: 'low',
    activeSourcesCount: 4,
    totalIncidentsCount: MOCK_INCIDENTS.length,
    activeOperators: [],
  });

  const [recentDetections, setRecentDetections] = useState<StreamDetectionItem[]>([
    { id: '1', label: 'PERSON', score: 0.94, source: 'Camera 01 — Main Entrance', trackId: '#104', timestamp: new Date().toISOString() },
    { id: '2', label: 'VEHICLE', score: 0.87, source: 'Camera 04 — Parking Area', trackId: '#V-12', timestamp: new Date(Date.now() - 15000).toISOString() },
  ]);

  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('safewatch_active_video_url') || null;
    } catch {
      return null;
    }
  });

  const handleSetUploadedVideoUrl = useCallback((url: string | null) => {
    setUploadedVideoUrl(url);
    try {
      if (url) localStorage.setItem('safewatch_active_video_url', url);
      else localStorage.removeItem('safewatch_active_video_url');
    } catch (_) {}
    broadcastRef.current?.postMessage({ type: 'VIDEO_URL_UPDATE', payload: url });
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_INCIDENTS_KEY, JSON.stringify(incidents));
    } catch (_) {}
  }, [incidents]);


  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(auditLogs));
    } catch (_) {}
  }, [auditLogs]);

  // Cross-Tab Broadcast Channel
  const broadcastRef = React.useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('safewatch_sync');
    broadcastRef.current = channel;

    channel.onmessage = (event) => {
      const { type, payload } = event.data || {};
      if (type === 'INCIDENTS_UPDATE') {
        setIncidents(payload);
      } else if (type === 'AUDIT_LOG_ADDED') {
        setAuditLogs((prev) => [payload, ...prev].slice(0, 100));
      } else if (type === 'METRICS_UPDATE') {
        setLiveMetrics((prev) => ({ ...prev, ...payload }));
      } else if (type === 'DETECTION_ADDED') {
        setRecentDetections((prev) => [payload, ...prev].slice(0, 25));
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  // Connect to Socket.IO Backend
  useEffect(() => {
    const s = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 3000,
    });
    setSocket(s);

    s.on('connect', () => {
      setIsConnected(true);
      console.log('[SafeWatch Socket] Connected to AI Backend');
      if (user) {
        s.emit('user_presence', { user, action: 'online', source: 'Web Dashboard' });
      }
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('incidents_list', (data: Incident[]) => {
      if (Array.isArray(data) && data.length > 0) {
        setIncidents(data);
      }
    });

    s.on('incident_created', (inc: Incident) => {
      setIncidents((prev) => [inc, ...prev.filter((i) => i.id !== inc.id)]);
      broadcastRef.current?.postMessage({ type: 'INCIDENTS_UPDATE', payload: [inc, ...incidents] });
      
      // Auto-trigger audio siren and vocal alert for critical / high threats
      if (inc.severity === 'critical' || inc.severity === 'high') {
        audioAnnouncer.speakVoiceAlert(`Warning: ${inc.severity.toUpperCase()} security alert in ${inc.location || inc.source}: ${inc.title}`, true);
      } else {
        audioAnnouncer.playAlertTone('warning');
      }
    });


    s.on('audit_log', (log: AuditLog) => {
      setAuditLogs((prev) => [log, ...prev].slice(0, 100));
      broadcastRef.current?.postMessage({ type: 'AUDIT_LOG_ADDED', payload: log });
    });

    s.on('metrics_update', (metrics: LiveMetrics) => {
      setLiveMetrics((prev) => ({ ...prev, ...metrics }));
      broadcastRef.current?.postMessage({ type: 'METRICS_UPDATE', payload: metrics });
    });

    s.on('operator_stream_detection', (det: any) => {
      const item: StreamDetectionItem = {
        id: Math.random().toString(36).slice(2),
        label: 'PERSON',
        score: 0.92,
        source: det.sourceName || 'Operator Camera',
        trackId: `#${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toISOString(),
        operatorName: det.operatorName,
      };
      setRecentDetections((prev) => [item, ...prev].slice(0, 25));
      broadcastRef.current?.postMessage({ type: 'DETECTION_ADDED', payload: item });
    });

    return () => {
      s.disconnect();
    };
  }, [user]);

  // Sync user presence on change
  useEffect(() => {
    if (user && socket && socket.connected) {
      socket.emit('user_presence', {
        user,
        action: 'active',
        source: window.location.pathname,
      });
    }
  }, [user, socket]);

  // Actions
  const appendAudit = useCallback((action: string, resource: string) => {
    const entry: AuditLog = {
      id: `log-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      actor: user?.name || 'Operator',
      action,
      resource,
      ip: '127.0.0.1',
      result: 'success',
    };
    setAuditLogs((prev) => [entry, ...prev].slice(0, 100));
    broadcastRef.current?.postMessage({ type: 'AUDIT_LOG_ADDED', payload: entry });
  }, [user]);

  const acknowledgeIncident = useCallback((id: string) => {
    const actorName = user?.name || 'Operator';
    setIncidents((prev) => {
      const updated = prev.map((inc) =>
        inc.id === id ? { ...inc, status: 'acknowledged' as IncidentStatus, assignedTo: actorName } : inc
      );
      broadcastRef.current?.postMessage({ type: 'INCIDENTS_UPDATE', payload: updated });
      return updated;
    });
    appendAudit('Acknowledged Incident', id);
    if (socket && socket.connected) {
      socket.emit('action_acknowledge_incident', { incidentId: id, actor: actorName });
    }
  }, [user, socket, appendAudit]);

  const escalateIncident = useCallback((id: string) => {
    const actorName = user?.name || 'Operator';
    setIncidents((prev) => {
      const updated = prev.map((inc) =>
        inc.id === id ? { ...inc, status: 'escalated' as IncidentStatus, assignedTo: actorName } : inc
      );
      broadcastRef.current?.postMessage({ type: 'INCIDENTS_UPDATE', payload: updated });
      return updated;
    });
    appendAudit('Escalated Incident', id);
  }, [user, appendAudit]);

  const resolveIncident = useCallback((id: string) => {
    const actorName = user?.name || 'Operator';
    setIncidents((prev) => {
      const updated = prev.map((inc) =>
        inc.id === id ? { ...inc, status: 'resolved' as IncidentStatus } : inc
      );
      broadcastRef.current?.postMessage({ type: 'INCIDENTS_UPDATE', payload: updated });
      return updated;
    });
    appendAudit('Resolved Incident', id);
    if (socket && socket.connected) {
      socket.emit('action_resolve_incident', { incidentId: id, actor: actorName });
    }
  }, [user, socket, appendAudit]);

  const createManualIncident = useCallback((title: string, severity: Severity, source: string, description: string) => {
    const newInc: Incident = {
      id: `INC-${Math.floor(1050 + Math.random() * 900)}`,
      title,
      severity,
      source,
      rule: 'Manual Report',
      detectedAt: new Date().toISOString(),
      status: 'open',
      assignedTo: null,
      trackId: `#${Math.floor(100 + Math.random() * 900)}`,
      duration: '5 sec',
      description,
      evidenceId: `EVD-${Math.floor(100 + Math.random() * 900)}`,
      zone: 'General Zone',
    };
    setIncidents((prev) => {
      const updated = [newInc, ...prev];
      broadcastRef.current?.postMessage({ type: 'INCIDENTS_UPDATE', payload: updated });
      return updated;
    });
    appendAudit(`Created Incident: ${title}`, newInc.id);

    // Audio alarm
    audioAnnouncer.speakVoiceAlert(`Alert dispatched: ${title} in ${source}`, true);
  }, [appendAudit]);

  const seedMockData = useCallback(() => {
    setIncidents(MOCK_INCIDENTS);
    setAuditLogs(MOCK_AUDIT_LOGS);
    try {
      localStorage.setItem(STORAGE_INCIDENTS_KEY, JSON.stringify(MOCK_INCIDENTS));
      localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(MOCK_AUDIT_LOGS));
    } catch (_) {}
    appendAudit('Seeded 50+ Mock Incidents & Audit Records', 'Database');
  }, [appendAudit]);

  const resetToFactoryDefaults = useCallback(() => {
    const cleanIncidents = MOCK_INCIDENTS.slice(0, 3);
    const cleanLogs = MOCK_AUDIT_LOGS.slice(0, 5);
    setIncidents(cleanIncidents);
    setAuditLogs(cleanLogs);
    setLiveMetrics({
      peopleCount: 0,
      riskLevel: 'low',
      activeSourcesCount: 4,
      totalIncidentsCount: cleanIncidents.length,
      activeOperators: [],
    });
    try {
      localStorage.setItem(STORAGE_INCIDENTS_KEY, JSON.stringify(cleanIncidents));
      localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(cleanLogs));
    } catch (_) {}
    appendAudit('Reset System to Factory Clean State', 'System Core');
  }, [appendAudit]);

  const emitClientDetection = useCallback((peopleCount: number, riskLevel: 'low' | 'medium' | 'high' | 'critical', sourceName: string) => {
    setLiveMetrics((prev) => {
      const updated = { ...prev, peopleCount, riskLevel };
      broadcastRef.current?.postMessage({ type: 'METRICS_UPDATE', payload: updated });
      return updated;
    });

    if (socket && socket.connected) {
      socket.emit('client_detection', {
        peopleCount,
        riskLevel,
        sourceName,
        operatorName: user?.name || 'Operator',
        timestamp: new Date().toISOString(),
      });
    }
  }, [socket, user]);

  return (
    <LiveDataContext.Provider
      value={{
        incidents,
        auditLogs,
        liveMetrics,
        recentDetections,
        uploadedVideoUrl,
        setUploadedVideoUrl: handleSetUploadedVideoUrl,
        acknowledgeIncident,
        escalateIncident,
        resolveIncident,
        createManualIncident,
        appendAudit,
        seedMockData,
        resetToFactoryDefaults,
        emitClientDetection,
        isConnected,
      }}
    >

      {children}
    </LiveDataContext.Provider>
  );
};

export const useLiveData = (): LiveDataContextType => {
  const ctx = useContext(LiveDataContext);
  if (!ctx) throw new Error('useLiveData must be used within LiveDataProvider');
  return ctx;
};
