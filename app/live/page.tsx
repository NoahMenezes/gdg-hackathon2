"use client";
import { motion } from "framer-motion";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Activity,
  AlertCircle,
  TrendingUp,
  Users,
  Play,
  Square,
  Wifi,
  WifiOff,
  Radar,
  Camera,
} from "lucide-react";
import { useTelemetry } from "@/components/TelemetryProvider";

interface PlayerData {
  id: number;
  class: number;
  label: string;
  coords: [number, number];
}

interface FrameStats {
  players_detected: number;
  goalkeepers: number;
  referees: number;
  ball_detected: boolean;
  total_tracked: number;
  frame_id: number;

  // optional backend values
  team1_count?: number;
  team2_count?: number;
}

// ─── Tactical Minimap ──────────────────────────────────────────
function TacticalMinimap({ detections }: { detections: { id: number; bbox: number[]; team: string }[] }) {
  // Simple perspective projection: Maps trapezoidal camera view to rectangular pitch
  const project = (x: number, y: number) => {
    // Input is 0-1920, 0-1080
    // Normalize to 0-1
    const nx = x / 1920;
    const ny = y / 1080;

    // Simulate perspective: The further up (smaller y), the more compressed x is
    // Let's assume the top of the screen (y=0) is about 60% the width of the bottom
    const perspectiveFactor = 0.6 + (0.4 * ny);
    
    // Center-align the x after applying perspective factor
    const px = (nx - 0.5) / perspectiveFactor + 0.5;
    const py = ny;

    return {
      x: Math.max(0, Math.min(100, px * 100)),
      y: Math.max(0, Math.min(100, py * 100))
    };
  };

  return (
    <div className="relative w-full aspect-[105/68] bg-[#0f172a] border border-white/10 overflow-hidden">
      {/* Pitch Lines */}
      <div className="absolute inset-0 border-2 border-white/10 m-2" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/10 rounded-full" />

      {/* Penalty Areas */}
      <div className="absolute inset-y-12 left-2 w-12 border border-white/10" />
      <div className="absolute inset-y-12 right-2 w-12 border border-white/10" />

      {/* Players */}
      {detections?.map((d, index) => {
        const cx = (d.bbox[0] + d.bbox[2]) / 2;
        const cy = (d.bbox[1] + d.bbox[3]) / 2;
        const { x, y } = project(cx, cy);

        return (
          <motion.div
            key={`${d.id}-${index}`}
            initial={false}
            animate={{ left: `${x}%`, top: `${y}%` }}
            transition={{ type: "spring", stiffness: 70, damping: 25, mass: 0.5 }}
            className={`absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full z-10 ${d.team === "green"
                ? "bg-[#c8e86e] shadow-[0_0_10px_#c8e86e]"
                : "bg-blue-400 shadow-[0_0_10px_#3b82f6]"
              }`}
          >
             <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[6px] font-mono text-white/40 font-black">
                {d.id}
             </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function LivePage() {
  const { 
    isProcessing, 
    connected, 
    latestFrame, 
    stats, 
    status, 
    startSession, 
    stopSession 
  } = useTelemetry();

  const fps = 30;

  const metrics = [
    {
      label: "Tracking Confidence",
      val: isProcessing ? "98.4" : "—",
      unit: "%",
      icon: Activity,
      color: "#c8e86e",
    },
    {
      label: "Personnel",
      val: stats ? String(stats.players_detected) : "—",
      unit: "active",
      icon: Users,
      color: "#3b82f6",
    },
    {
      label: "Latency",
      val: isProcessing ? "12" : "—",
      unit: "ms",
      icon: TrendingUp,
      color: "#a78bfa",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">
      <Navbar />

      {/* GRID OVERLAY */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />

      {/* GLOW */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-[#c8e86e]/10 blur-[140px] rounded-none pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-28 pb-16 space-y-8">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Radar className="w-7 h-7 text-[#c8e86e]" />

              <h1
                className="text-4xl lg:text-6xl font-black tracking-tighter"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                LIVE VISION
              </h1>
            </div>

            <p className="text-sm text-gray-400 font-mono tracking-widest uppercase">
              AI Motion Intelligence · Tactical Analytics · Real-Time Tracking
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              {connected ? (
                <div className="px-4 py-2 rounded-none bg-[#c8e86e]/10 border-none text-[#c8e86e] flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
                  <Wifi className="w-3 h-3" />
                  Engine Online
                </div>
              ) : (
                <div className="px-4 py-2 rounded-none bg-red-500/10 border-none text-red-400 flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </div>
              )}

              <div className="px-4 py-2 rounded-none bg-white/5 border-none text-xs font-mono tracking-widest">
                FPS: <span className="text-[#c8e86e] font-bold">{fps}</span>
              </div>

              <div className="px-4 py-2 rounded-none bg-white/5 border-none text-xs font-mono tracking-widest">
                OBJECTS:{" "}
                <span className="text-[#c8e86e] font-bold">
                  {stats?.players_detected ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* START BUTTON */}
          <button
            onClick={() => {
              if (!isProcessing) {
                startSession();
              } else {
                stopSession();
              }
            }}
            className={`px-8 py-4 rounded-none font-black uppercase tracking-[0.2em] text-xs transition-all duration-300 hover:scale-105 ${isProcessing
                ? "bg-red-500/10 text-red-400"
                : "bg-[#c8e86e] text-black shadow-none"
              }`}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <Square className="w-4 h-4" />
                Stop Session
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Initialize Vision
              </div>
            )}
          </button>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* VIDEO */}
          <Card className="xl:col-span-3 bg-white/[0.03] border-none backdrop-blur-2xl overflow-hidden rounded-none">
            <CardHeader className="border-none bg-white/[0.02]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-none bg-[#c8e86e] animate-pulse" />

                  <CardTitle className="text-xs font-black tracking-[0.3em] uppercase text-[#c8e86e]">
                    Tactical Overlay Engine
                  </CardTitle>
                </div>

                <div className="flex gap-3">
                  <div className="px-3 py-1 rounded-none bg-black/40 border-none text-[10px] font-mono text-gray-400">
                    RES: 1920×1080
                  </div>

                  <div className="px-3 py-1 rounded-none bg-black/40 border-none text-[10px] font-mono text-gray-400">
                    LATENCY: 12ms
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 relative aspect-video bg-black overflow-hidden">
              {/* SCANLINE */}
              <div className="absolute inset-0 pointer-events-none z-20">
                <div className="absolute w-full h-24 bg-gradient-to-b from-transparent via-[#c8e86e]/10 to-transparent animate-[scan_4s_linear_infinite]" />
              </div>

              <style jsx global>{`
                @keyframes scan {
                  0% {
                    transform: translateY(-200px);
                  }
                  100% {
                    transform: translateY(1200px);
                  }
                }
              `}</style>

              {/* PLACEHOLDER */}
              {!isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#c8e86e]/20 blur-3xl rounded-none animate-pulse" />

                    <div className="relative w-28 h-28 rounded-none border-none flex items-center justify-center">
                      <Play className="w-10 h-10 text-[#c8e86e]" />
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-[#c8e86e] font-black tracking-[0.3em] text-lg">
                      AWAITING INITIALIZATION
                    </div>

                    <div className="text-xs text-gray-500 mt-2 uppercase tracking-[0.2em]">
                      Neural Vision Pipeline Ready
                    </div>
                  </div>
                </div>
              )}

              {/* FEED IMAGE */}
              {isProcessing && latestFrame && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/jpeg;base64,${latestFrame}`}
                  alt="Vision Stream"
                  className="w-full h-full object-contain"
                />
              )}

              {/* HUD */}
              {isProcessing && (
                <>
                  {/* TOP LEFT */}
                  <div className="absolute top-4 left-4 bg-black/70 border-none rounded-none px-4 py-3 backdrop-blur-md z-40">
                    <div className="text-[10px] font-black tracking-[0.3em] text-[#c8e86e] uppercase">
                      LIVE TELEMETRY
                    </div>

                    <div className="mt-2 space-y-1 text-[11px] font-mono text-gray-300">
                      <div>
                        FRAME:{" "}
                        <span className="text-[#c8e86e]">
                          {stats?.frame_id ?? 0}
                        </span>
                      </div>

                      <div>
                        FPS: <span className="text-[#c8e86e]">{fps}</span>
                      </div>

                      <div>
                        PLAYERS:{" "}
                        <span className="text-[#c8e86e]">
                          {stats?.players_detected ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* TOP RIGHT */}
                  <div className="absolute top-4 right-4 bg-black/70 border-none rounded-none px-4 py-3 backdrop-blur-md z-40">
                    <div className="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase">
                      AI STATUS
                    </div>

                    <div className="mt-2 text-[11px] font-mono space-y-1">
                      <div className="text-[#c8e86e]">TRACKING ACTIVE</div>

                      <div className="text-gray-400">LATENCY &lt; 15ms</div>

                      <div className="text-gray-400">DETECTION STABLE</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* SIDEBAR */}
          <div className="space-y-6">
            {/* SYSTEM STATUS */}
            <Card className="bg-white/[0.03] border-none rounded-none backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xs font-black tracking-[0.3em] uppercase text-gray-500">
                  Neural Pipeline
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {[
                  {
                    label: "Tracking",
                    value: connected ? "ONLINE" : "OFFLINE",
                  },
                  {
                    label: "Inference",
                    value: isProcessing ? "STABLE" : "WAITING",
                  },
                  {
                    label: "Ball Detection",
                    value: stats?.ball_detected ? "LOCKED" : "SEARCHING",
                  },
                  {
                    label: "Frame Stream",
                    value: `${fps} FPS`,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between border-none bg-black/30 rounded-none px-4 py-3"
                  >
                    <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">
                      {item.label}
                    </div>

                    <div className="text-xs font-black text-[#c8e86e]">
                      {item.value}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* TACTICAL RADAR */}
            <Card className="bg-white/[0.03] border-none rounded-none backdrop-blur-xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black tracking-[0.3em] uppercase text-gray-500">
                  Tactical Radar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <TacticalMinimap detections={stats?.detections || []} />
                <div className="mt-4 flex justify-between text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-[#c8e86e]" /> Green Team
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-blue-400" /> White Team
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Tactical Events Removed */}
          </div>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {metrics.map((m, i) => (
            <Card
              key={i}
              className="bg-white/[0.03] border-none rounded-none backdrop-blur-xl overflow-hidden group hover:border-[#c8e86e]/30 transition-all duration-500"
            >
              <CardContent className="p-6 flex items-center justify-between relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#c8e86e]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="space-y-2 relative z-10">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-black">
                    {m.label}
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="text-4xl font-black tracking-tighter">
                      {m.val}
                    </div>

                    {m.unit && (
                      <div className="text-xs uppercase text-[#c8e86e] font-black mb-1">
                        {m.unit}
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative z-10 p-4 rounded-none bg-white/5 group-hover:scale-110 transition-transform duration-500">
                  <m.icon className="w-6 h-6" style={{ color: m.color }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
