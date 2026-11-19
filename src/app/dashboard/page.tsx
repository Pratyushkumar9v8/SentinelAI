"use client";

import { useEffect, useState, useRef } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { 
  ShieldAlert, AlertCircle, Server, Users, Activity, Clock, Flame, 
  ArrowUpRight, Radio, RefreshCw, CheckCircle2, ShieldCheck, Zap
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { fetchApi, getWsUrl } from "@/services/api";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    threat_score: 87,
    live_attacks_count: 3,
    open_incidents_count: 5,
    critical_assets_count: 7,
    active_users_count: 42,
    compromised_hosts_count: 2,
    mttd_minutes: 2.4,
    mttr_minutes: 8.5
  });

  const [timeline, setTimeline] = useState([
    { time: "08:00", anomalies: 12, critical: 0 },
    { time: "10:00", anomalies: 18, critical: 1 },
    { time: "12:00", anomalies: 45, critical: 2 },
    { time: "14:00", anomalies: 89, critical: 5 },
    { time: "16:00", anomalies: 62, critical: 3 },
    { time: "18:00", anomalies: 24, critical: 1 }
  ]);

  const [liveLogs, setLiveLogs] = useState([
    { time: "12:45:02", host: "SRV-DC-01", type: "Sysmon", score: 0.98, is_anomaly: true, desc: "Process injection into lsass.exe via NtWriteVirtualMemory (T1003.001)" },
    { time: "12:44:18", host: "HMI-WATER-01", type: "OT_Modbus", score: 0.96, is_anomaly: true, desc: "Modbus Function 0x06 Write Register override on chemical pump (T0855)" },
    { time: "12:43:55", host: "WKSTN-FIN-08", type: "PowerShell", score: 0.92, is_anomaly: true, desc: "Base64 Encoded DownloadString Command executed in hidden session" },
    { time: "12:42:10", host: "FW-PERIM-01", type: "Firewall", score: 0.21, is_anomaly: false, desc: "Standard HTTPS TLS 1.3 egress stream to Microsoft CDN" },
    { time: "12:40:05", host: "SRV-APP-02", type: "LinuxAudit", score: 0.08, is_anomaly: false, desc: "Routine cron execution logrotate.service" }
  ]);

  const [heatmap, setHeatmap] = useState([
    { zone: "IT Domain Controllers", risk: 95, status: "Critical", sector: "IT Core" },
    { zone: "OT Water Treatment PLCs", risk: 90, status: "Critical", sector: "SCADA Subnet" },
    { zone: "Corporate Finance Endpoints", risk: 65, status: "Medium", sector: "Workstations" },
    { zone: "DMZ Perimeter Firewalls", risk: 40, status: "Low", sector: "Network Edge" },
    { zone: "Cloud Infrastructure Subnets", risk: 30, status: "Low", sector: "Cloud VPC" }
  ]);

  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 1. Fetch initial live metrics & timeline
    fetchApi("/api/v1/dashboard/metrics")
      .then((data) => {
        if (data) setMetrics((prev) => ({ ...prev, ...data }));
      })
      .catch((err) => console.log("Using cached metrics:", err.message));

    fetchApi("/api/v1/dashboard/timeline")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setTimeline(data);
      })
      .catch((err) => console.log("Using cached timeline:", err.message));

    fetchApi("/api/v1/dashboard/heatmap")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setHeatmap(data);
      })
      .catch(() => {});

    // 2. Connect to real-time WebSockets
    try {
      const wsUrl = getWsUrl("/ws/live-stream");
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "LIVE_TELEMETRY") {
            setLiveLogs((prev) => [
              {
                time: data.time || data.timestamp || new Date().toLocaleTimeString(),
                host: data.host || data.hostname || "UNKNOWN",
                type: data.type_name || data.source_type || "Event",
                score: data.score !== undefined ? data.score : data.anomaly_score,
                is_anomaly: data.is_anomaly,
                desc: data.desc || "Telemetry event ingested"
              },
              ...prev.slice(0, 19)
            ]);
          } else if (data.type === "SIMULATION_TRIGGERED") {
            setMetrics((prev) => ({
              ...prev,
              threat_score: data.threat_score || 95,
              live_attacks_count: prev.live_attacks_count + 1,
              open_incidents_count: prev.open_incidents_count + 1,
              compromised_hosts_count: Math.min(prev.critical_assets_count, prev.compromised_hosts_count + 1)
            }));
          }
        } catch (e) {
          console.error("WS Parse error", e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    } catch (e) {
      console.warn("WebSocket fallback:", e);
    }

    // 3. Listen for Header simulation button triggers
    const handleSimulation = (e: any) => {
      const { scenario, threatScore } = e.detail || {};
      const score = threatScore || 96;
      setMetrics((prev) => ({
        ...prev,
        threat_score: score,
        live_attacks_count: prev.live_attacks_count + 1,
        compromised_hosts_count: Math.min(prev.critical_assets_count, prev.compromised_hosts_count + 1)
      }));

      // Add a highlighted anomaly event to the ticker
      const nowStr = new Date().toLocaleTimeString();
      const simEvent = {
        time: nowStr,
        host: scenario === "insider_ot" ? "HMI-WATER-PUMP-01" : scenario === "exfiltration" ? "VPN-GW-01" : "SRV-DC-01",
        type: scenario === "insider_ot" ? "OT_Modbus" : scenario === "exfiltration" ? "DNS_Tunnel" : "Sysmon",
        score: 0.99,
        is_anomaly: true,
        desc: `[SIMULATED APT] Multi-Agent Mesh correlated campaign: ${scenario.toUpperCase()} (Threat Score ${score}/100)`
      };
      setLiveLogs((prev) => [simEvent, ...prev.slice(0, 19)]);

      // Append spike to timeline
      setTimeline((prev) => [
        ...prev,
        { time: nowStr.slice(0, 5), anomalies: 110, critical: 8 }
      ]);
    };

    window.addEventListener("sentinel:simulation", handleSimulation);

    // Fallback simulation timer if WS is disconnected
    const fallbackTimer = setInterval(() => {
      if (!wsConnected) {
        const fallbacks = [
          { host: "SRV-DC-01", type: "Sysmon", score: 0.89, is_anomaly: true, desc: "Process injection into lsass.exe (T1003.001)" },
          { host: "FW-PERIMETER-01", type: "Firewall", score: 0.15, is_anomaly: false, desc: "Allowed TCP outbound to trusted NTP time server" },
          { host: "HMI-WATER-01", type: "OT_Modbus", score: 0.94, is_anomaly: true, desc: "Anomalous function code 0x06 write to chemical dosing PLC" },
          { host: "WKSTN-FIN-08", type: "Sysmon", score: 0.22, is_anomaly: false, desc: "User j.smith authenticated successfully" }
        ];
        const randomItem = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        const now = new Date().toLocaleTimeString();
        setLiveLogs((prev) => [
          { time: now, ...randomItem },
          ...prev.slice(0, 19)
        ]);
      }
    }, 4000);

    return () => {
      window.removeEventListener("sentinel:simulation", handleSimulation);
      clearInterval(fallbackTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [wsConnected]);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex">
      <Sidebar />
      <Header />

      <main className="flex-1 ml-64 pt-20 p-6 space-y-6">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              CNI Cyber Resilience Command Center
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Real-time Autonomous Threat Monitoring & Unsupervised ML Anomaly Detection
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-lg shadow-sm">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-400 animate-ping" : "bg-emerald-500"}`} />
              <span>{wsConnected ? "LIVE WEBSOCKET" : "STREAM SIMULATOR"}</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>MTTD: <strong className="text-emerald-400">{metrics.mttd_minutes}m</strong></span>
              <span className="text-slate-600">|</span>
              <span>MTTR: <strong className="text-cyan-400">{metrics.mttr_minutes}m</strong></span>
            </div>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Threat Index */}
          <div className="glass-panel-glow-rose p-4 rounded-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs text-rose-300 font-mono uppercase tracking-wider">System Threat Score</span>
              <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-3xl font-black text-rose-400 font-mono">{metrics.threat_score}</span>
              <span className="text-xs text-rose-300 font-semibold px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30">
                CRITICAL THREAT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Correlated Multi-stage Ransomware Active</p>
          </div>

          {/* Live Attacks */}
          <div className="glass-panel p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono uppercase">Live Active Attacks</span>
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-400 font-mono">{metrics.live_attacks_count}</span>
              <span className="text-xs text-amber-300 font-mono">APT Campaigns</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">{metrics.open_incidents_count} Open SOC Incidents Require Action</p>
          </div>

          {/* Critical Assets Risk */}
          <div className="glass-panel p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono uppercase">Critical Assets Risk</span>
              <Server className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-cyan-400 font-mono">
                {metrics.compromised_hosts_count} / {metrics.critical_assets_count}
              </span>
              <span className="text-xs text-rose-400 font-semibold">Compromised</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">SRV-DC-01 & HMI-WATER-01 Isolated</p>
          </div>

          {/* Monitored Users */}
          <div className="glass-panel p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono uppercase">Monitored Users</span>
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400 font-mono">{metrics.active_users_count}</span>
              <span className="text-xs text-emerald-400">Normal Baseline</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">1 Impossible Travel Anomaly flagged</p>
          </div>
        </div>

        {/* Detection Timeline Chart & Live Log Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart (2 cols) */}
          <div className="lg:col-span-2 glass-panel p-5 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" /> 24-Hour Detection Anomaly Timeline
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Aggregated Machine Learning Behavioral Outliers (Isolation Forest + Autoencoder)
                </p>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono border border-cyan-500/30 px-2 py-0.5 rounded bg-cyan-500/10">
                Peak: 89 Evt/hr
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="colorAnom" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCrit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0F172A", borderColor: "#1E293B", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Area type="monotone" dataKey="anomalies" stroke="#06B6D4" fillOpacity={1} fill="url(#colorAnom)" name="Anomalies" />
                  <Area type="monotone" dataKey="critical" stroke="#EF4444" fillOpacity={1} fill="url(#colorCrit)" name="Critical Threats" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Legend */}
            <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Statistical Baseline Outliers
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Critical Zero-Day Threats
              </span>
            </div>
          </div>

          {/* Live Telemetry Ticker (1 col) */}
          <div className="glass-panel p-5 rounded-xl flex flex-col h-[380px]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Real-Time Telemetry Stream
              </h3>
              <span className="text-[10px] text-cyan-400 font-mono uppercase">
                {wsConnected ? "WebSocket Connected" : "Local Engine"}
              </span>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
              {liveLogs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={`p-2.5 rounded-lg border text-xs font-mono transition-all ${
                    log.is_anomaly 
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.1)]" 
                      : "bg-slate-900/50 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-cyan-300">{log.time} • {log.host}</span>
                    <span className={`px-1.5 py-0.2 rounded font-bold ${log.is_anomaly ? "bg-rose-500/30 text-rose-300 border border-rose-500/40" : "bg-slate-800 text-slate-400"}`}>
                      Score {log.score}
                    </span>
                  </div>
                  <p className="font-sans text-xs font-medium line-clamp-2 leading-relaxed">{log.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Infrastructure Risk Heatmap Table */}
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> Critical National Infrastructure (CNI) Zone Risk Heatmap
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">Aggregated IT & OT Risk Exposure by Network Segment</p>
            </div>
            <span className="text-[10px] font-mono text-slate-400 uppercase">5 Zones Monitored</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Zone / Segment</th>
                  <th className="p-3.5">Sector</th>
                  <th className="p-3.5">Calculated Threat Index</th>
                  <th className="p-3.5">Risk Status</th>
                  <th className="p-3.5">Active Safeguards</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {heatmap.map((zone, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="p-3.5 font-bold text-white">{zone.zone}</td>
                    <td className="p-3.5 text-slate-400">{zone.sector || "IT/OT Subnet"}</td>
                    <td className="p-3.5 font-bold">
                      <div className="flex items-center gap-2">
                        <span className={zone.risk > 80 ? "text-rose-400" : zone.risk > 50 ? "text-amber-400" : "text-emerald-400"}>
                          {zone.risk} / 100
                        </span>
                        <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${zone.risk > 80 ? "bg-rose-500" : zone.risk > 50 ? "bg-amber-400" : "bg-emerald-400"}`} 
                            style={{ width: `${zone.risk}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        zone.status === "Critical" 
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" 
                          : zone.status === "Medium"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      }`}>
                        {zone.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300">
                      {zone.risk > 80 ? "Endpoint Isolation + Deep Packet Inspection" : zone.risk > 50 ? "Continuous Behavioral Telemetry" : "Standard Policy Enforcement"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
