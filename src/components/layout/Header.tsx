"use client";

import { useState, useEffect } from "react";
import { Play, Activity, Bell, Radio, Sparkles, CheckCircle2, ShieldAlert } from "lucide-react";
import { fetchApi } from "@/services/api";

export function Header() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [threatScore, setThreatScore] = useState<number>(87);
  const [streamActive, setStreamActive] = useState<boolean>(true);
  const [bannerNotice, setBannerNotice] = useState<string>("");

  useEffect(() => {
    // Initial fetch of metrics
    fetchApi("/api/v1/dashboard/metrics")
      .then((data) => {
        if (data?.threat_score) {
          setThreatScore(data.threat_score);
        }
      })
      .catch(() => {
        // Fallback default
      });

    // Listen for simulation events across windows/components
    const handleSimulationEvent = (e: any) => {
      if (e.detail?.threatScore) {
        setThreatScore(e.detail.threatScore);
      }
    };
    window.addEventListener("sentinel:simulation", handleSimulationEvent);
    return () => window.removeEventListener("sentinel:simulation", handleSimulationEvent);
  }, []);

  const triggerSimulation = async (scenario: string) => {
    setIsSimulating(true);
    setActiveScenario(scenario);
    setBannerNotice(`⚡ Multi-Agent Mesh triggered for [${scenario.toUpperCase()}]: Analyzing 1,000 telemetry events...`);

    try {
      const data = await fetchApi(`/api/v1/simulator/run-scenario?scenario=${scenario}&count=1000`, { 
        method: "POST" 
      });

      if (data?.composite_risk_score) {
        setThreatScore(data.composite_risk_score);
      }

      setBannerNotice(`✓ Agent Mesh Analysis Complete: Correlated ${data?.anomalous_events_detected || 4} anomalies into unified campaign (Risk: ${data?.composite_risk_score || 95}/100).`);
      
      // Dispatch event to inform all views (Dashboard, Incidents, Attack Graph)
      window.dispatchEvent(new CustomEvent("sentinel:simulation", {
        detail: {
          scenario,
          threatScore: data?.composite_risk_score || 95,
          data
        }
      }));
    } catch (e) {
      console.error("Simulation error:", e);
      setBannerNotice(`Simulation offline fallback active for [${scenario}].`);
      window.dispatchEvent(new CustomEvent("sentinel:simulation", {
        detail: {
          scenario,
          threatScore: 92
        }
      }));
    } finally {
      setIsSimulating(false);
      setTimeout(() => setBannerNotice(""), 6000);
    }
  };

  return (
    <>
      <header className="h-16 bg-[#0B0F19]/90 backdrop-blur-md border-b border-[#1E293B] fixed top-0 left-64 right-0 z-30 flex items-center justify-between px-6">
        {/* Live Threat Indicator */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-[#111827] border border-rose-500/30 px-3.5 py-1.5 rounded-lg shadow-[0_0_15px_rgba(244,63,94,0.1)]">
            <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-400 font-medium">THREAT INDEX</span>
              <span className="text-sm font-bold text-rose-400 font-mono">{threatScore} / 100</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-ping" />
            <span className="font-mono">
              STREAM: <span className="text-emerald-400 font-semibold">{streamActive ? "LIVE (2.4m MTTD)" : "PAUSED"}</span>
            </span>
          </div>
        </div>

        {/* Simulator Action Triggers & Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#141C2E] p-1 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 px-2 font-mono uppercase">Simulate APT:</span>
            <button
              onClick={() => triggerSimulation("ransomware")}
              disabled={isSimulating}
              className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-all flex items-center gap-1 ${
                activeScenario === "ransomware" && isSimulating
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40"
              }`}
              title="Trigger Spearphishing + Mimikatz + Volume Shadow Deletion"
            >
              <Play className="w-3 h-3" /> Ransomware
            </button>
            <button
              onClick={() => triggerSimulation("exfiltration")}
              disabled={isSimulating}
              className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-all flex items-center gap-1 ${
                activeScenario === "exfiltration" && isSimulating
                  ? "bg-amber-500 text-slate-950 animate-pulse"
                  : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40"
              }`}
              title="Trigger Impossible Travel VPN + DNS TXT Tunneling Exfiltration"
            >
              <Play className="w-3 h-3" /> VPN Tunnel
            </button>
            <button
              onClick={() => triggerSimulation("insider_ot")}
              disabled={isSimulating}
              className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-all flex items-center gap-1 ${
                activeScenario === "insider_ot" && isSimulating
                  ? "bg-cyan-500 text-slate-950 animate-pulse"
                  : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40"
              }`}
              title="Trigger Rogue Insider Modbus Write Command to Water PLC"
            >
              <Sparkles className="w-3 h-3" /> SCADA OT
            </button>
          </div>

          {/* User Badge */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <button className="relative p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/50">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-xs">
                SA
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-xs font-semibold text-slate-200">Senior SOC Lead</p>
                <p className="text-[10px] text-slate-400 font-mono">SOC Analyst Role</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Floating Simulation Feedback Toast */}
      {bannerNotice && (
        <div className="fixed top-20 right-8 z-50 bg-[#0E1726] border border-cyan-500/50 text-cyan-200 px-4 py-2.5 rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.25)] flex items-center gap-2.5 text-xs font-mono animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{bannerNotice}</span>
        </div>
      )}
    </>
  );
}
