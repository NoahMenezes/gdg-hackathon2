"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

// Types
export type TimelineFrame = {
  frame: number;
  t1: number;
  t2: number;
  metabolic_power: number;
};

export type Summary = {
  team1_total: number;
  team2_total: number;
  possession_team1: number;
  possession_team2: number;
};

export interface PlayerPerformance {
  id: number;
  team: string;
  distance: number;
  topSpeed: number;
  intensity: number;
  fatigueIndex: number;
  tacticalScore: number;
  cognitiveLoad: number;
  lastPos: [number, number] | null;
}

export interface FrameStats {
  players_detected: number;
  goalkeepers: number;
  referees: number;
  ball_detected: boolean;
  total_tracked: number;
  frame_id: number;
  team1_count?: number;
  team2_count?: number;
  possession?: {
    t1: number;
    t2: number;
  };
  detections: { id: number; bbox: number[]; team: string }[];
}

interface TelemetryContextType {
  liveTimeline: TimelineFrame[];
  liveSummary: Summary | null;
  playerRegistry: Record<number, PlayerPerformance>;
  isProcessing: boolean;
  connected: boolean;
  latestFrame: string | null;
  stats: FrameStats | null;
  status: string | null;
  isDataCaptured: boolean;
  startSession: () => Promise<void>;
  stopSession: () => void;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [liveTimeline, setLiveTimeline] = useState<TimelineFrame[]>([]);
  const [liveSummary, setLiveSummary] = useState<Summary | null>(null);
  const [playerRegistry, setPlayerRegistry] = useState<Record<number, PlayerPerformance>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [latestFrame, setLatestFrame] = useState<string | null>(null);
  const [stats, setStats] = useState<FrameStats | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isDataCaptured, setIsDataCaptured] = useState(false);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const lastFrameId = useRef<number>(-1);

  const connect = useCallback(function connectSocket() {
    if (ws.current?.readyState === WebSocket.OPEN) return;
    
    const socket = new WebSocket("ws://localhost:8000/ws");
    ws.current = socket;

    socket.onopen = () => {
      setConnected(true);
      console.log("Telemetry Engine Connected");
    };

    socket.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      
      if (msg.type === "frame") {
        setIsProcessing(true);
        const frameStats: FrameStats = msg.stats;
        setLatestFrame(msg.frame);
        setStats(frameStats);

        if (frameStats.frame_id < lastFrameId.current && lastFrameId.current !== -1) {
          setIsDataCaptured(true);
        }
        lastFrameId.current = frameStats.frame_id;

        setIsDataCaptured((alreadyCaptured) => {
          if (!alreadyCaptured) {
            // Update Timeline
            const newPoint: TimelineFrame = {
              frame: frameStats.frame_id,
              t1: frameStats.team1_count || 0,
              t2: frameStats.team2_count || 0,
              metabolic_power: (frameStats.players_detected || 0) * (Math.random() * 5 + 5),
            };
            setLiveTimeline((prev) => [...prev.slice(-400), newPoint]);
            
            // Update Summary
            setLiveSummary((prev) => ({
              team1_total: (prev?.team1_total || 0) + (frameStats.team1_count || 0),
              team2_total: (prev?.team2_total || 0) + (frameStats.team2_count || 0),
              possession_team1: frameStats.possession?.t1 || 50,
              possession_team2: frameStats.possession?.t2 || 50,
            }));

            // Update Player Registry
            setPlayerRegistry((prev) => {
              const next = { ...prev };
              frameStats.detections.forEach((d) => {
                const center: [number, number] = [(d.bbox[0] + d.bbox[2]) / 2, (d.bbox[1] + d.bbox[3]) / 2];
                const existing = next[d.id];
                
                if (!existing) {
                  next[d.id] = {
                    id: d.id,
                    team: d.team,
                    distance: 0,
                    topSpeed: 0,
                    intensity: 0,
                    fatigueIndex: 0,
                    tacticalScore: 70 + Math.random() * 20,
                    cognitiveLoad: 40 + Math.random() * 30,
                    lastPos: center
                  };
                } else {
                  // Calculate movement
                  const dx = center[0] - (existing.lastPos?.[0] || center[0]);
                  const dy = center[1] - (existing.lastPos?.[1] || center[1]);
                  const dist = Math.sqrt(dx * dx + dy * dy) * 0.05; // Scaling factor
                  
                  next[d.id] = {
                    ...existing,
                    distance: existing.distance + dist,
                    topSpeed: Math.max(existing.topSpeed, dist * 10),
                    intensity: existing.intensity + (dist * 1.5),
                    fatigueIndex: Math.min(100, (existing.intensity / 500) * 100),
                    lastPos: center
                  };
                }
              });
              return next;
            });
          }
          return alreadyCaptured;
        });
      }

      if (msg.type === "status") {
        setStatus(msg.message);
        if (msg.message.includes("finished")) {
          setIsDataCaptured(true);
        }
      }
    };

    socket.onclose = () => {
      setConnected(false);
      setIsProcessing(false);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(() => {
        connectSocket();
      }, 2000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) ws.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  const startSession = async () => {
    try {
      await fetch("http://localhost:8000/start", { method: "POST" });
      setLiveTimeline([]);
      setLiveSummary(null);
      setPlayerRegistry({});
      setIsProcessing(true);
      setIsDataCaptured(false);
      lastFrameId.current = -1;
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  };

  const stopSession = useCallback(async () => {
    setIsProcessing(false);
    setLatestFrame(null);
    setIsDataCaptured(false);
    try {
      await fetch("http://localhost:8000/stop", { method: "POST" });
    } catch (err) {
      console.error("Failed to stop backend session:", err);
    }
  }, []);

  return (
    <TelemetryContext.Provider value={{
      liveTimeline,
      liveSummary,
      playerRegistry,
      isProcessing,
      connected,
      latestFrame,
      stats,
      status,
      isDataCaptured,
      startSession,
      stopSession
    }}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (context === undefined) {
    throw new Error("useTelemetry must be used within a TelemetryProvider");
  }
  return context;
}
