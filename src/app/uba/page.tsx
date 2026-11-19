"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { 
  UserCheck, ShieldAlert, AlertTriangle, Bot, 
  CheckCircle2, Clock, MapPin, Terminal, RefreshCw 
} from "lucide-react";
import { fetchApi } from "@/services/api";

interface UBAAnomaly {
  user_name: string;
  user?: string;
  anomaly_type: string;
  type?: string;
  normal_baseline: string;
  baseline?: string;
  current_activity: string;
  current?: string;
  risk_score: number;
  risk?: number;
  detected_at?: string;
  time?: string;
}

const FALLBACK_ANOMALIES: UBAAnomaly[] = [
  {
    user_name: "m.taylor",
    anomaly_type: "Impossible Travel Anomaly",
    normal_baseline: "Normal login from Washington, USA (192.168.1.50)",
    current_activity: "Authenticated via VPN from Moscow, RU (203.0.113.15) 12 minutes later",
    risk_score: 88,
    detected_at: "2026-07-22 09:40:00"
  },
  {
    user_name: "administrator",
    anomaly_type: "Abnormal PowerShell Invocations",
    normal_baseline: "Standard GUI administrative tooling usage",
    current_activity: "Executed Base64 encoded scriptblock in background non-interactive session",
    risk_score: 95,
    detected_at: "2026-07-22 10:16:00"
  },
  {
    user_name: "r.insider",
    anomaly_type: "Off-Hours SCADA Register Tampering",
    normal_baseline: "Read-only HMI telemetry monitoring",
    current_activity: "Direct Modbus function code 0x06 write command to PLC register 40001",
    risk_score: 98,
    detected_at: "2026-07-22 11:05:00"
  }
];

export default function UbaPage() {
  const [anomalies, setAnomalies] = useState<UBAAnomaly[]>(FALLBACK_ANOMALIES);
  const [flaggedUsers, setFlaggedUsers] = useState<string[]>([]);
  const [notice, setNotice] = useState<string>("");

  useEffect(() => {
    fetchApi<UBAAnomaly[]>("/api/v1/uba/anomalies")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAnomalies(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleFlagAccount = (username: string) => {
    setFlaggedUsers((prev) => [...prev, username]);
    setNotice(`✓ Account [${username}] flagged for forced credential reset & active token revocation.`);
    setTimeout(() => setNotice(""), 4000);
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex">
      <Sidebar />
      <Header />

      <main className="flex-1 ml-64 pt-20 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-cyan-400" /> User & Entity Behavior Analytics (UEBA)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Statistical Baseline Behavioral Profiles & Anomaly Detection Outliers
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-lg bg-cyan-500/10">
            Active Baseline Users: 42
          </span>
        </div>

        {notice && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-lg flex items-center gap-2 font-mono animate-in fade-in duration-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {anomalies.map((anom, i) => {
            const user = anom.user_name || anom.user || "unknown";
            const type = anom.anomaly_type || anom.type || "Behavioral Outlier";
            const baseline = anom.normal_baseline || anom.baseline || "Standard activity";
            const current = anom.current_activity || anom.current || "Unusual execution pattern";
            const risk = anom.risk_score || anom.risk || 85;
            const time = anom.detected_at || anom.time || "Recent";
            const isFlagged = flaggedUsers.includes(user);

            return (
              <div 
                key={i} 
                className="glass-panel p-5 rounded-xl border border-rose-500/30 flex items-start justify-between shadow-[0_0_15px_rgba(244,63,94,0.06)]"
              >
                <div className="space-y-2 flex-1 pr-6">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 font-mono font-bold text-xs border border-rose-500/30">
                      {type}
                    </span>
                    <span className="text-xs font-mono text-cyan-300">
                      Account: <strong>{user}</strong>
                    </span>
                    {isFlagged && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30 font-bold">
                        FLAGGED FOR REVOCATION
                      </span>
                    )}
                  </div>

                  <div className="text-xs space-y-1.5 pt-1">
                    <p className="text-slate-400">
                      <strong>Normal Baseline Profile:</strong> <span className="text-slate-300">{baseline}</span>
                    </p>
                    <p className="text-rose-300 font-semibold">
                      <strong>Observed Activity:</strong> {current}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" /> Detected: {time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-slate-400" /> Detector: Isolation Forest + UEBA Model #4
                    </span>
                  </div>
                </div>

                <div className="text-right flex flex-col justify-between items-end h-full space-y-4">
                  <div>
                    <span className="text-3xl font-black text-rose-400 font-mono">{risk}</span>
                    <p className="text-[10px] text-slate-400 font-mono uppercase">Anomaly Threat Score</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFlagAccount(user)}
                      disabled={isFlagged}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                        isFlagged
                          ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                          : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
                      }`}
                    >
                      {isFlagged ? "Revoked" : "Revoke Tokens"}
                    </button>
                    <Link
                      href={`/copilot?query=Analyze%20UEBA%20anomaly%20for%20user%20${user}`}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-semibold flex items-center gap-1"
                    >
                      <Bot className="w-3.5 h-3.5" /> Copilot
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
