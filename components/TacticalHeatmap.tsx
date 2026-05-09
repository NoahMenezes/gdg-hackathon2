"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Radar } from "lucide-react";

interface Detection {
  id: number;
  bbox: number[];
  team: string;
}

interface TimelineFrame {
  detections: Detection[];
}

export default function TacticalHeatmap({ timeline }: { timeline: TimelineFrame[] }) {
  const points = useMemo(() => {
    const allPoints: { x: number; y: number; team: string }[] = [];
    
    // Sampling timeline to avoid performance issues if timeline is huge
    const step = Math.max(1, Math.floor(timeline.length / 500));
    
    for (let i = 0; i < timeline.length; i += step) {
      const frame = timeline[i];
      if (!frame.detections) continue;
      
      frame.detections.forEach((d) => {
        const cx = (d.bbox[0] + d.bbox[2]) / 2;
        const cy = (d.bbox[1] + d.bbox[3]) / 2;
        
        // Simple projection (normalize 1920x1080 to 100x100)
        // Adjust for perspective if needed, but for heatmap a flat projection is often better
        const nx = (cx / 1920) * 100;
        const ny = (cy / 1080) * 100;
        
        allPoints.push({ x: nx, y: ny, team: d.team });
      });
    }
    return allPoints;
  }, [timeline]);

  return (
    <Card className="border-white/5 bg-white/[0.02] overflow-hidden h-full">
      <CardHeader className="border-b border-white/5">
        <div className="flex items-center gap-2">
          <Radar className="w-4 h-4 text-[#c8e86e]" />
          <div>
            <CardTitle className="text-xs uppercase tracking-[0.3em] font-black text-white">Spatial Intelligence Heatmap</CardTitle>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Aggregated Personnel Density Signature</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative w-full aspect-[105/68] bg-[#0f172a]/50 border border-white/10 rounded-sm overflow-hidden">
          {/* Pitch Markings */}
          <div className="absolute inset-0 border-2 border-white/5 m-2" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/5 rounded-full" />
          <div className="absolute inset-y-12 left-2 w-12 border border-white/5" />
          <div className="absolute inset-y-12 right-2 w-12 border border-white/5" />
          
          {/* Heatmap Points */}
          <div className="absolute inset-0">
            {points.map((p, i) => (
              <div
                key={i}
                className={`absolute w-1.5 h-1.5 rounded-full blur-[4px] opacity-20 ${
                  p.team === "green" ? "bg-[#c8e86e]" : "bg-blue-400"
                }`}
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: "translate(-50%, -50%)"
                }}
              />
            ))}
          </div>

          {/* Legend Overlay */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-black/40 backdrop-blur-md p-3 border border-white/5 rounded-sm">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#c8e86e] shadow-[0_0_8px_#c8e86e]" />
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Team A (Offensive Load)</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#3b82f6]" />
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Team B (Defensive Load)</span>
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
