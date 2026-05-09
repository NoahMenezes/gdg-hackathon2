"use client"

import * as React from "react"
import Link from 'next/link'
import { Shield, Activity, Share2, Menu } from "lucide-react"

export default function Navbar() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null;

  return (
    <nav className="px-6 md:px-12 lg:px-16 pt-6 w-full fixed top-0 z-50 pointer-events-none">
      <div className="liquid-glass rounded-xl px-6 py-3 flex items-center justify-between border border-white/5 bg-black/40 backdrop-blur-xl pointer-events-auto">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-emerald-500 flex items-center justify-center rounded-sm group-hover:rotate-45 transition-transform duration-500">
            <Shield className="w-5 h-5 text-black -rotate-45 group-hover:rotate-0 transition-transform duration-500" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase text-white font-orbitron">
            Field<span className="text-emerald-500">Theory</span>
          </span>
        </Link>

        {/* Center: HUD Links */}
        <div className="hidden md:flex items-center gap-10">
          {[
            { name: "Tactical Nexus", path: "/" },
            { name: "Live Tracking", path: "/live" },
            { name: "Topology Lab", path: "/dashboard" },
            { name: "Neural Forecast", path: "#" },
            { name: "System Core", path: "#" }
          ].map((link) => (
            <Link
              key={link.name}
              href={link.path}
              className="text-[10px] font-black uppercase tracking-[0.2em] transition-all text-white/50 hover:text-emerald-500 flex items-center gap-2"
            >
              <div className="w-1 h-1 bg-white/20 rounded-full" />
              {link.name}
            </Link>
          ))}
        </div>

        {/* Right: System Status */}
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 bg-white/5 border border-white/10 rounded-sm">
             <div className="flex flex-col items-end">
                <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">System Engine</span>
                <span className="text-[9px] font-bold text-emerald-500 uppercase font-mono">v4.2.0 Stable</span>
             </div>
             <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
          </div>
          <button className="p-2 text-white/50 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}

