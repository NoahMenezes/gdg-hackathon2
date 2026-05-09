"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Shield,
  Zap,
  Server,
  Maximize2,
  MousePointer2,
  Settings,
  AlertTriangle,
  Cpu,
  Database,
  Network,
  Share2,
  Radar
} from "lucide-react";
import { useTelemetry } from "@/components/TelemetryProvider";

// --- Types ---
interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  role: string;
  isIsolated?: boolean;
  community?: number;
  centrality?: number;
}

interface Edge {
  source: string;
  target: string;
  weight: number;
}

interface GraphState {
  nodes: Node[];
  edges: Edge[];
  description: string;
}

// --- Constants ---
const PITCH_WIDTH = 1050;
const PITCH_HEIGHT = 680;

const COLORS = {
  emerald: "#10b981",
  blue: "#52525b", // Changed to dark tactical zinc
  rose: "#f43f5e",
  amber: "#f59e0b",
  obsidian: "#0b0f1a",
};

// --- Mock Data ---
const STATES: Record<string, GraphState> = {
  A: {
    description: "Control (Small World Network)",
    nodes: [
      { id: "GK", label: "GK", x: 50, y: 340, role: "Goalie" },
      { id: "LCB", label: "LCB", x: 200, y: 200, role: "Defense" },
      { id: "RCB", label: "RCB", x: 200, y: 480, role: "Defense" },
      { id: "LB", label: "LB", x: 250, y: 100, role: "Defense" },
      { id: "RB", label: "RB", x: 250, y: 580, role: "Defense" },
      { id: "CDM", label: "CDM", x: 400, y: 340, role: "Midfield" },
      { id: "LCM", label: "LCM", x: 550, y: 200, role: "Midfield" },
      { id: "RCM", label: "RCM", x: 550, y: 480, role: "Midfield" },
      { id: "LW", label: "LW", x: 800, y: 150, role: "Attack" },
      { id: "RW", label: "RW", x: 800, y: 530, role: "Attack" },
      { id: "ST", label: "ST", x: 900, y: 340, role: "Attack" },
    ],
    edges: [
      { source: "GK", target: "LCB", weight: 0.9 },
      { source: "GK", target: "RCB", weight: 0.9 },
      { source: "LCB", target: "LB", weight: 0.85 },
      { source: "RCB", target: "RB", weight: 0.85 },
      { source: "LCB", target: "CDM", weight: 0.95 },
      { source: "RCB", target: "CDM", weight: 0.95 },
      { source: "CDM", target: "LCM", weight: 0.9 },
      { source: "CDM", target: "RCM", weight: 0.9 },
      { source: "LCM", target: "LW", weight: 0.85 },
      { source: "RCM", target: "RW", weight: 0.85 },
      { source: "LCM", target: "ST", weight: 0.8 },
      { source: "RCM", target: "ST", weight: 0.8 },
      { source: "LW", target: "ST", weight: 0.85 },
      { source: "RW", target: "ST", weight: 0.85 },
    ]
  },
  B: {
    description: "Pressure (Graph Stretching)",
    nodes: [
      { id: "GK", label: "GK", x: 30, y: 340, role: "Goalie", centrality: 0.95 },
      { id: "LCB", label: "LCB", x: 120, y: 240, role: "Defense" },
      { id: "RCB", label: "RCB", x: 120, y: 440, role: "Defense" },
      { id: "LB", label: "LB", x: 150, y: 80, role: "Defense" },
      { id: "RB", label: "RB", x: 150, y: 600, role: "Defense" },
      { id: "CDM", label: "CDM", x: 220, y: 340, role: "Midfield" },
      { id: "LCM", label: "LCM", x: 280, y: 200, role: "Midfield" },
      { id: "RCM", label: "RCM", x: 280, y: 480, role: "Midfield" },
      { id: "LW", label: "LW", x: 350, y: 150, role: "Attack" },
      { id: "RW", label: "RW", x: 350, y: 530, role: "Attack" },
      { id: "ST", label: "ST", x: 400, y: 340, role: "Attack" },
    ],
    edges: [
      { source: "GK", target: "LCB", weight: 0.95 },
      { source: "GK", target: "RCB", weight: 0.95 },
      { source: "GK", target: "CDM", weight: 0.8 },
      { source: "LCB", target: "CDM", weight: 0.7 },
      { source: "RCB", target: "CDM", weight: 0.7 },
      { source: "LB", target: "LCB", weight: 0.6 },
      { source: "RB", target: "RCB", weight: 0.6 },
      { source: "LW", target: "LCM", weight: 0.3 },
      { source: "RW", target: "RCM", weight: 0.3 },
    ]
  },
  C: {
    description: "Collapse (Community Fracture)",
    nodes: [
      { id: "GK", label: "GK", x: 50, y: 340, role: "Goalie", community: 0 },
      { id: "LCB", label: "LCB", x: 180, y: 220, role: "Defense", community: 0 },
      { id: "RCB", label: "RCB", x: 180, y: 460, role: "Defense", community: 0 },
      { id: "LB", label: "LB", x: 220, y: 100, role: "Defense", community: 0 },
      { id: "RB", label: "RB", x: 220, y: 580, role: "Defense", community: 0 },
      { id: "CDM", label: "CDM", x: 350, y: 340, role: "Midfield", community: 0 },
      // The fracture
      { id: "LCM", label: "LCM", x: 650, y: 180, role: "Midfield", community: 1, isIsolated: true },
      { id: "RCM", label: "RCM", x: 650, y: 500, role: "Midfield", community: 1 },
      { id: "LW", label: "LW", x: 850, y: 120, role: "Attack", community: 1 },
      { id: "RW", label: "RW", x: 850, y: 560, role: "Attack", community: 1 },
      { id: "ST", label: "ST", x: 950, y: 340, role: "Attack", community: 1 },
    ],
    edges: [
      // Cluster 0
      { source: "GK", target: "LCB", weight: 0.9 },
      { source: "GK", target: "RCB", weight: 0.9 },
      { source: "LCB", target: "CDM", weight: 0.8 },
      { source: "RCB", target: "CDM", weight: 0.8 },
      { source: "LB", target: "LCB", weight: 0.7 },
      { source: "RB", target: "RCB", weight: 0.7 },
      // Cluster 1
      { source: "LW", target: "ST", weight: 0.85 },
      { source: "RW", target: "ST", weight: 0.85 },
      { source: "LCM", target: "RCM", weight: 0.4 },
      // Weak bridge
      { source: "CDM", target: "RCM", weight: 0.15 },
    ]
  }
};

// --- Components ---

const TypewriterAlert = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let currentLength = 0;
    const interval = setInterval(() => {
      currentLength++;
      setDisplayedText(text.substring(0, currentLength));
      if (currentLength >= text.length) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 20);
    return () => clearInterval(interval);
  }, [text, onComplete]);

  return (
    <div className="font-mono text-xs leading-relaxed">
      <span className="text-emerald-500 mr-2">[SYSTEM_LOG]:</span>
      {displayedText}
      <motion.span
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
        className="inline-block w-2 h-4 bg-emerald-500 ml-1 align-middle"
      />
    </div>
  );
};

const FieldTheoryHUD = () => {
  const { isProcessing, stats, playerRegistry } = useTelemetry();
  const [currentState, setCurrentState] = useState<string>("A");
  const [activeTab, setActiveTab] = useState(0);
  const [synergyBias, setSynergyBias] = useState(0.5);
  const [alerts, setAlerts] = useState<string[]>(["System initialized. Monitoring team topology..."]);

  // --- Live Graph Computation ---
  const liveGraph = useMemo(() => {
    if (!isProcessing || !stats?.detections) return null;

    // Convert detections to Nodes, ensuring unique IDs
    const uniqueNodesMap = new Map<string, Node>();

    stats.detections.forEach((d) => {
      // stats.detections are 0-1920, 0-1080. Map to PITCH_WIDTH, PITCH_HEIGHT
      const nx = d.bbox[0] / 1920;
      const ny = d.bbox[1] / 1080;

      const nodeId = `P${d.id}`;
      // Use the first occurrence of each ID to prevent duplicate keys
      if (!uniqueNodesMap.has(nodeId)) {
        uniqueNodesMap.set(nodeId, {
          id: nodeId,
          label: `${d.id}`,
          x: nx * PITCH_WIDTH,
          y: ny * PITCH_HEIGHT,
          role: d.team === "green" ? "Team A" : "Team B",
          community: d.team === "green" ? 0 : 1
        });
      }
    });

    const nodes: Node[] = Array.from(uniqueNodesMap.values());

    // Create Edges (Simple proximity-based networking for each team)
    const edges: Edge[] = [];
    const teamA = nodes.filter(n => n.community === 0);
    const teamB = nodes.filter(n => n.community === 1);

    const connectTeam = (teamNodes: Node[]) => {
      for (let i = 0; i < teamNodes.length; i++) {
        for (let j = i + 1; j < teamNodes.length; j++) {
          const dist = Math.sqrt(
            Math.pow(teamNodes[i].x - teamNodes[j].x, 2) +
            Math.pow(teamNodes[i].y - teamNodes[j].y, 2)
          );
          // Only connect if within tactical range (e.g., 25% of pitch)
          if (dist < PITCH_WIDTH * 0.25) {
            edges.push({
              source: teamNodes[i].id,
              target: teamNodes[j].id,
              weight: 1 - (dist / (PITCH_WIDTH * 0.25))
            });
          }
        }
      }
    };

    connectTeam(teamA);
    connectTeam(teamB);

    return {
      nodes,
      edges,
      description: "LIVE TOPOLOGICAL INFERENCE"
    };
  }, [isProcessing, stats]);

  const graph = liveGraph || STATES[currentState];

  // --- Dynamic Metrics ---
  const dynamicMetrics = useMemo(() => {
    const numNodes = graph.nodes.length;
    const numEdges = graph.edges.length;

    const maxEdges = (numNodes * (numNodes - 1)) / 2;
    const density = maxEdges > 0 ? numEdges / maxEdges : 0;

    // Heuristics for the display based on live node activity
    const fiedler = isProcessing ? (density * 1.2 + (stats?.players_detected ? stats.players_detected * 0.01 : 0)).toFixed(3) : "0.842";
    const mstLen = isProcessing ? (numEdges * 65 + (Math.random() * 120)).toFixed(0) : "1,240";
    const diameter = isProcessing ? ((numNodes > 5 ? 4 : 2) + Math.random() * 0.8).toFixed(1) : "4.2";

    return {
      density: density.toFixed(2),
      fiedler,
      mstLen: isProcessing ? `${Number(mstLen).toLocaleString()}m` : mstLen + "m",
      diameter
    };
  }, [graph, isProcessing, stats]);

  // System Logs & Insights
  const lastAlertRef = useRef<string>("");

  useEffect(() => {
    if (!isProcessing) {
      if (lastAlertRef.current !== "STOPPED") {
        setAlerts(prev => ["System paused. Displaying static analysis model...", ...prev].slice(0, 5));
        lastAlertRef.current = "STOPPED";
      }
      return;
    }

    // Live Insights Logic
    const frameId = stats?.frame_id || 0;

    // Only generate a new alert every 30 frames (~1 sec) to prevent spam
    if (frameId % 30 === 0 && frameId > 0) {
      let newAlert = "";
      const fValue = parseFloat(dynamicMetrics.fiedler);
      const density = parseFloat(dynamicMetrics.density);

      if (fValue < 0.2) {
        newAlert = "CRITICAL: Severe team fragmentation. Fiedler value critically low. Formation entropy rising.";
      } else if (fValue > 0.6 && density > 0.3) {
        newAlert = `Structural health optimal. High connectivity (λ2 = ${fValue}).`;
      } else if (stats?.team1_count && stats?.team2_count && Math.abs(stats.team1_count - stats.team2_count) > 2) {
        newAlert = "WARNING: Numerical imbalance detected in primary cluster. Formation stretching.";
      } else {
        newAlert = `Processing spatial vectors... Nodes active: ${stats?.players_detected || 0}, Density: ${density}`;
      }

      if (newAlert && newAlert !== lastAlertRef.current) {
        setAlerts(prev => [newAlert, ...prev].slice(0, 5));
        lastAlertRef.current = newAlert;
      }
    } else if (lastAlertRef.current === "STOPPED" || lastAlertRef.current === "") {
      const initMsg = "LIVE: Neural Ingestion Active. Tracking topology...";
      setAlerts(prev => [initMsg, ...prev].slice(0, 5));
      lastAlertRef.current = initMsg;
    }
  }, [isProcessing, stats, dynamicMetrics]);

  // Derived MST (simple heuristic for demo)
  const mstEdges = useMemo(() => {
    // For demo, just pick a subset of edges
    return graph.edges.filter((_, i) => i % 2 === 0);
  }, [graph]);

  return (
    <div className="flex h-screen bg-[#0b0f1a] text-white font-sans overflow-hidden">
      {/* --- Left Sidebar: Demo Engine --- */}
      <div className="w-80 border-r border-white/5 bg-white/[0.02] backdrop-blur-xl p-6 flex flex-col gap-8">
        <div className="space-y-2">
          <h2 className="text-[10px] font-black tracking-[0.3em] uppercase text-emerald-500">Momentum Shift</h2>
          <h1 className="text-xl font-orbitron font-bold">Demo Engine</h1>
        </div>

        <div className="flex flex-col gap-4">
          {Object.keys(STATES).map((key) => (
            <button
              key={key}
              onClick={() => setCurrentState(key)}
              className={`group relative p-4 text-left transition-all duration-300 border ${currentState === key
                ? "bg-emerald-500/10 border-emerald-500/50"
                : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-black font-orbitron ${currentState === key ? "text-emerald-500" : "text-white/50"}`}>
                  STATE {key}
                </span>
                {currentState === key && (
                  <motion.div
                    layoutId="active-indicator"
                    className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"
                  />
                )}
              </div>
              <div className="text-sm font-bold mb-1">{STATES[key].description}</div>
              <div className="text-[10px] text-white/40 leading-tight">
                {key === "A" && "Optimal network topology with balanced node degree distribution."}
                {key === "B" && "Anomalous centrality shift towards defensive anchor nodes."}
                {key === "C" && "Topological collapse via Louvain community partitioning."}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-auto space-y-4">
          <div className="p-4 bg-black/40 border border-white/5 rounded-sm">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-black tracking-widest uppercase text-white/50">Engine Health</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: ["80%", "85%", "82%"] }}
                className="h-full bg-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- Center: Main Canvas --- */}
      <div className="flex-1 relative flex flex-col">
        {/* Top Header HUD */}
        <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-start pointer-events-none z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 animate-pulse" />
              <div className="text-[10px] font-black tracking-[0.4em] uppercase text-white/40">Field Intelligence :: Live</div>
            </div>
            <h2 className="text-3xl font-orbitron font-black tracking-tighter">TACTICAL GRAPH <span className="text-emerald-500">HUD</span></h2>
          </div>

          <div className="flex gap-4">
            <div className="liquid-glass px-4 py-2 flex flex-col items-end">
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Network Entropy</span>
              <span className="text-xl font-orbitron font-bold text-zinc-500">
                {currentState === "A" ? "0.12" : currentState === "B" ? "0.45" : "0.89"}
              </span>
            </div>
            <div className="liquid-glass px-4 py-2 flex flex-col items-end">
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Connectivity</span>
              <span className={`text-xl font-orbitron font-bold ${currentState === "C" ? "text-rose-500" : "text-emerald-500"}`}>
                {currentState === "A" ? "0.98" : currentState === "B" ? "0.76" : "0.34"}
              </span>
            </div>
          </div>
        </div>

        {/* Pitch Canvas */}
        <div className="flex-1 bg-black overflow-hidden relative flex items-center justify-center p-12">
          {/* Scanline Effect */}
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            <motion.div
              animate={{ y: [-1000, 1000] }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="w-full h-[200px] bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent"
            />
          </div>

          <div className="relative aspect-[105/68] w-full max-w-5xl border border-white/10 bg-[#0b0f1a]">
            {/* Pitch Markings */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute inset-0 border border-white/40 m-2" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-white/40" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-white/40 rounded-full" />
              <div className="absolute inset-y-[20%] left-2 w-[15%] border border-white/40" />
              <div className="absolute inset-y-[20%] right-2 w-[15%] border border-white/40" />
            </div>

            <svg
              viewBox={`0 0 ${PITCH_WIDTH} ${PITCH_HEIGHT}`}
              className="absolute inset-0 w-full h-full"
            >
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="emerald-glow">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feFlood floodColor="#10b981" floodOpacity="0.5" result="flood" />
                  <feComposite in="flood" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Triadic Closures Overlay for Tab 3 */}
              {activeTab === 2 && (
                <g opacity="0.4">
                  <path
                    d="M 550 200 L 800 150 L 900 340 Z"
                    fill={COLORS.emerald}
                    fillOpacity="0.1"
                    stroke={COLORS.emerald}
                    strokeWidth="1"
                    strokeDasharray="4,2"
                  />
                  <path
                    d="M 550 480 L 800 530 L 900 340 Z"
                    fill={COLORS.emerald}
                    fillOpacity="0.1"
                    stroke={COLORS.emerald}
                    strokeWidth="1"
                    strokeDasharray="4,2"
                  />
                </g>
              )}

              {/* Edges */}
              {graph.edges.map((edge, i) => {
                const source = graph.nodes.find(n => n.id === edge.source);
                const target = graph.nodes.find(n => n.id === edge.target);
                if (!source || !target) return null;

                const isHighChemistry = edge.weight > 0.8;
                const isMST = activeTab === 0 && mstEdges.some(e => e.source === edge.source && e.target === edge.target);
                const isWeak = edge.weight < 0.3;

                // Incorporate synergy bias for Tab 3
                let strokeWidth = isHighChemistry ? 3 : 1;
                if (activeTab === 2) {
                  strokeWidth = (edge.weight + synergyBias) * 2;
                }

                return (
                  <motion.line
                    key={`${edge.source}-${edge.target}`}
                    initial={false}
                    animate={{
                      x1: source.x, y1: source.y,
                      x2: target.x, y2: target.y,
                      strokeOpacity: isWeak ? 0.2 : 0.5,
                      strokeWidth: strokeWidth
                    }}
                    stroke={isHighChemistry ? COLORS.emerald : isMST ? COLORS.blue : isWeak ? COLORS.rose : COLORS.blue}
                    strokeDasharray={isMST ? "5,5" : "none"}
                    className={isHighChemistry ? "animate-pulse-emerald" : isWeak ? "animate-flicker" : ""}
                    style={{ filter: isHighChemistry ? "url(#emerald-glow)" : "none" }}
                  />
                );
              })}

              {/* Nodes */}
              {graph.nodes.map((node) => {
                const isIsolated = node.isIsolated;
                const isArticulation = activeTab === 1 && node.id === "CDM";
                const size = activeTab === 1 ? (node.centrality ? 20 + node.centrality * 20 : 15) : 12;

                let color = COLORS.blue;
                if (isIsolated) color = COLORS.rose;
                else if (currentState === "C") {
                  color = node.community === 0 ? COLORS.emerald : "#a78bfa";
                }

                return (
                  <motion.g
                    key={node.id}
                    initial={false}
                    animate={{ x: node.x, y: node.y }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  >
                    {isArticulation && (
                      <motion.circle
                        r={size + 10}
                        fill="transparent"
                        stroke={COLORS.rose}
                        strokeWidth="1"
                        strokeDasharray="4,4"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      />
                    )}

                    <motion.circle
                      r={size}
                      fill={COLORS.obsidian}
                      stroke={color}
                      strokeWidth="2"
                      style={{ filter: isIsolated ? "drop-shadow(0 0 10px #f43f5e)" : "none" }}
                      className={isIsolated ? "animate-flicker" : ""}
                    />

                    <text
                      dy=".3em"
                      textAnchor="middle"
                      fill="white"
                      className="text-[10px] font-black font-orbitron pointer-events-none"
                    >
                      {node.label}
                    </text>

                    {isArticulation && (
                      <g transform={`translate(0, -${size + 15})`}>
                        <rect x="-60" y="-10" width="120" height="20" fill={COLORS.rose} />
                        <text
                          textAnchor="middle"
                          fill="white"
                          className="text-[8px] font-black uppercase tracking-widest"
                          dy=".3em"
                        >
                          CRITICAL ARTICULATION POINT
                        </text>
                      </g>
                    )}
                  </motion.g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* --- Bottom: Tab System --- */}
        <div className="h-64 border-t border-white/5 bg-white/[0.01] backdrop-blur-2xl flex flex-col">
          <div className="flex border-b border-white/5">
            {[
              "Structural Health",
              "Lynchpin Detection",
              "Target States",
              "Pipeline Telemetry"
            ].map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === i
                  ? "border-emerald-500 text-emerald-500 bg-emerald-500/5"
                  : "border-transparent text-white/30 hover:text-white/60"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 p-6 grid grid-cols-4 gap-8">
            {activeTab === 0 && (
              <>
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Topology Metrics</div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-orbitron font-bold">{dynamicMetrics.fiedler}</span>
                    <span className="text-xs text-emerald-500 font-bold mb-1">λ2 (Fiedler Value)</span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Algebraic connectivity represents the second smallest eigenvalue of the Laplacian matrix. Higher values indicate a more robust team structure.
                  </p>
                </div>
                <div className="col-span-3 grid grid-cols-3 gap-4">
                  <div className="liquid-glass p-4 space-y-2">
                    <div className="text-[8px] font-black text-white/30 uppercase">MST Length</div>
                    <div className="text-xl font-orbitron font-bold">{dynamicMetrics.mstLen}</div>
                  </div>
                  <div className="liquid-glass p-4 space-y-2">
                    <div className="text-[8px] font-black text-white/30 uppercase">Node Density</div>
                    <div className="text-xl font-orbitron font-bold">{dynamicMetrics.density}</div>
                  </div>
                  <div className="liquid-glass p-4 space-y-2">
                    <div className="text-[8px] font-black text-white/30 uppercase">Graph Diameter</div>
                    <div className="text-xl font-orbitron font-bold">{dynamicMetrics.diameter}</div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 1 && (
              <>
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Bottleneck Analysis</div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-orbitron font-bold text-rose-500">CDM</span>
                    <span className="text-xs text-white/50 font-bold mb-1">Key Articulation</span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Removing this node results in graph partitioning. Betweenness centrality peaks at this junction, indicating high tactical reliance.
                  </p>
                </div>
                <div className="col-span-3 flex items-center justify-center border border-white/5 bg-black/20 rounded-lg">
                  <div className="flex gap-12">
                    <div className="text-center">
                      <div className="text-[8px] font-black text-white/30 uppercase mb-2">Centrality Heatmap</div>
                      <div className="flex gap-1">
                        {[0.2, 0.4, 0.8, 0.4, 0.2].map((v, i) => (
                          <div key={i} className="w-4 bg-emerald-500" style={{ height: v * 40 }} />
                        ))}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[8px] font-black text-white/30 uppercase mb-2">Load Variance</div>
                      <div className="text-2xl font-orbitron font-bold text-zinc-500">±14%</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 2 && (
              <>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Synergy Bias</label>
                      <span className="text-[10px] font-mono text-emerald-500">{Math.round(synergyBias * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0" max="1" step="0.01"
                      value={synergyBias}
                      onChange={(e) => setSynergyBias(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Adjust heuristic weights to prioritize human tactical intuition over raw Euclidean distance in graph edge generation.
                  </p>
                </div>
                <div className="col-span-3 grid grid-cols-2 gap-4">
                  <div className="liquid-glass p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[8px] font-black text-white/30 uppercase">Triadic Closures</div>
                      <div className="text-xl font-orbitron font-bold">14 Active</div>
                    </div>
                    <Share2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="liquid-glass p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[8px] font-black text-white/30 uppercase">Target Connectivity</div>
                      <div className="text-xl font-orbitron font-bold">92%</div>
                    </div>
                    <Settings className="w-6 h-6 text-zinc-500" />
                  </div>
                </div>
              </>
            )}

            {activeTab === 3 && (
              <>
                <div className="col-span-4 grid grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-black text-white/30 uppercase">Ingestion</span>
                    </div>
                    <div className="text-xs font-mono text-white/70">YOLOv8 / OpenCV / RTSP</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-zinc-500" />
                      <span className="text-[10px] font-black text-white/30 uppercase">Processing</span>
                    </div>
                    <div className="text-xs font-mono text-white/70">Apache Flink & Kafka</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-black text-white/30 uppercase">Graph Engine</span>
                    </div>
                    <div className="text-xs font-mono text-white/70">Memgraph / NetworkX</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-zinc-500" />
                      <span className="text-[10px] font-black text-white/30 uppercase">Format</span>
                    </div>
                    <div className="text-xs font-mono text-white/70">StatsBomb/Opta JSON</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* --- Right Sidebar: AI Tactical Feed --- */}
      <div className="w-96 border-l border-white/5 bg-white/[0.02] backdrop-blur-xl p-6 flex flex-col gap-6">
        <div className="space-y-2">
          <h2 className="text-[10px] font-black tracking-[0.3em] uppercase text-zinc-500">Tactical Feed</h2>
          <h1 className="text-xl font-orbitron font-bold">AI Analysis</h1>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {alerts.map((alert, i) => (
                <motion.div
                  key={alert + i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4 bg-black/40 border-l-2 border-emerald-500/50"
                >
                  <TypewriterAlert text={alert} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="p-4 liquid-glass space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black text-white/30 uppercase">Formation Health</div>
            <span className="text-emerald-500 text-xs font-bold">EXCELLENT</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-white/5 rounded-sm text-center">
              <div className="text-[8px] text-white/30 uppercase mb-1">Density</div>
              <div className="text-sm font-orbitron">0.82</div>
            </div>
            <div className="p-2 bg-white/5 rounded-sm text-center">
              <div className="text-[8px] text-white/30 uppercase mb-1">Spread</div>
              <div className="text-sm font-orbitron">14.2</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
};

export default FieldTheoryHUD;
