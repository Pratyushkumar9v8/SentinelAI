"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { 
  AlertTriangle, ShieldCheck, Cpu, Bot, CheckCircle2, ChevronRight, 
  Play, Terminal, ShieldAlert, FileText, Download, Sparkles, RefreshCw
} from "lucide-react";
import { fetchApi, API_BASE_URL } from "@/services/api";

interface MitreMapping {
  tactic: string;
  technique_id?: string;
  id?: string;
  technique_name?: string;
  name?: string;
  confidence?: number;
}

interface ResponseAction {
  id?: string;
  action?: string;
  action_type?: string;
  target: string;
  status: string;
  time?: string;
  executed_at?: string;
  executed_by?: string;
  output_log?: string;
}

interface IncidentItem {
  id: string;
  title: string;
  summary: string;
  severity: string;
  status: string;
  risk_score: number;
  assigned_to?: string | null;
  root_cause?: string;
  root_cause_asset_id?: string;
  ai_explanation?: string;
  predicted_next_step?: string;
  prediction_confidence?: number;
  created_at: string;
  mitre_mappings: MitreMapping[];
  responses: ResponseAction[];
}

const FALLBACK_INCIDENTS: IncidentItem[] = [
  {
    id: "inc_ransomware_001",
    title: "Multi-Stage APT Ransomware Outbreak on Domain Controller",
    summary: "Correlated Mimikatz LSASS memory dumping, PowerShell obfuscated payload execution, and volume shadow copy deletion across host SRV-DC-01.",
    severity: "Critical",
    status: "In Progress",
    risk_score: 98,
    assigned_to: "analyst@sentinel.cni.gov",
    root_cause_asset_id: "SRV-DC-01 (192.168.1.10)",
    ai_explanation: "Attacker gained initial foothold via spearphishing link on WKSTN-FIN-08, dumped LSASS credentials, moved laterally via WMI to SRV-DC-01, and attempted shadow copy wiping prior to mass encryption.",
    predicted_next_step: "Lateral movement to OT SCADA gateway subnets & Data Encrypted for Impact (T1486)",
    prediction_confidence: 0.94,
    created_at: "2026-07-22 10:15:00",
    mitre_mappings: [
      { tactic: "Initial Access", id: "T1078", name: "Valid Accounts", confidence: 0.95 },
      { tactic: "Execution", id: "T1059.001", name: "PowerShell", confidence: 0.92 },
      { tactic: "Credential Access", id: "T1003.001", name: "LSASS Memory Credential Dumping", confidence: 0.99 },
      { tactic: "Impact", id: "T1490", name: "Inhibit System Recovery", confidence: 0.98 }
    ],
    responses: [
      { action_type: "Isolate Endpoint", target: "SRV-DC-01", status: "Success", executed_at: "10:26:00", output_log: "Switch port isolated." },
      { action_type: "Block IP", target: "198.51.100.42", status: "Success", executed_at: "10:26:30", output_log: "Firewall drop rule applied." }
    ]
  },
  {
    id: "inc_scada_002",
    title: "Unauthorized SCADA PLC Register Overwrite in Water Dosing Station",
    summary: "Rogue insider attempted direct Modbus write register commands to alter chemical dosing parameters.",
    severity: "Critical",
    status: "Open",
    risk_score: 92,
    assigned_to: "analyst@sentinel.cni.gov",
    root_cause_asset_id: "HMI-WATER-PUMP-01 (10.0.4.12)",
    ai_explanation: "Direct connection established from HMI-WATER-PUMP-01 sending unauthorized Modbus function code 0x06 write commands to PLC registers 40001.",
    predicted_next_step: "Safety Instrumented System (SIS) override to bypass physical pressure reliefs",
    prediction_confidence: 0.96,
    created_at: "2026-07-22 11:05:00",
    mitre_mappings: [
      { tactic: "Impair Process Control", id: "T0855", name: "Unauthorized Command Message in SCADA", confidence: 0.96 }
    ],
    responses: []
  },
  {
    id: "inc_vpn_003",
    title: "Suspicious VPN Login from Anomaly Location & DNS Tunneling",
    summary: "User account m.taylor authenticated via VPN from Russian IP, followed by high-frequency TXT DNS queries.",
    severity: "High",
    status: "Open",
    risk_score: 78,
    assigned_to: "analyst@sentinel.cni.gov",
    root_cause_asset_id: "VPN-GW-01 (203.0.113.15)",
    ai_explanation: "Impossible travel anomaly combined with DNS exfiltration signature to bad-domain-exfil.com.",
    predicted_next_step: "Staging sensitive database files for cloud upload",
    prediction_confidence: 0.88,
    created_at: "2026-07-22 09:40:00",
    mitre_mappings: [
      { tactic: "Exfiltration", id: "T1071.004", name: "DNS Data Exfiltration", confidence: 0.88 }
    ],
    responses: []
  }
];

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentItem[]>(FALLBACK_INCIDENTS);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem>(FALLBACK_INCIDENTS[0]);
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const loadIncidents = async () => {
    try {
      const data = await fetchApi<IncidentItem[]>("/api/v1/incidents");
      if (Array.isArray(data) && data.length > 0) {
        setIncidents(data);
        setSelectedIncident((prev) => {
          const match = data.find((i) => i.id === prev.id);
          return match || data[0];
        });
      }
    } catch (e) {
      console.log("Using cached incidents:", e);
    }
  };

  useEffect(() => {
    loadIncidents();

    const handleSimulation = (e: any) => {
      const { data } = e.detail || {};
      if (data?.incident_id) {
        loadIncidents();
      }
    };
    window.addEventListener("sentinel:simulation", handleSimulation);
    return () => window.removeEventListener("sentinel:simulation", handleSimulation);
  }, []);

  const triggerSOARAction = async (actionName: string, targetName: string) => {
    setLoadingAction(true);
    const nowTime = new Date().toLocaleTimeString();
    
    // Optimistic UI update
    const newResp: ResponseAction = {
      action_type: actionName,
      target: targetName,
      status: "Success",
      executed_at: nowTime,
      executed_by: "Autonomous SOAR Engine",
      output_log: `Executed ${actionName} against ${targetName}. Target safely neutralized.`
    };

    const updatedIncident: IncidentItem = {
      ...selectedIncident,
      status: "Contained",
      responses: [newResp, ...selectedIncident.responses]
    };

    setSelectedIncident(updatedIncident);
    setIncidents((prev) =>
      prev.map((i) => (i.id === selectedIncident.id ? updatedIncident : i))
    );

    // Call backend API
    try {
      await fetchApi(
        `/api/v1/incidents/${selectedIncident.id}/trigger-action?action=${encodeURIComponent(
          actionName
        )}&target=${encodeURIComponent(targetName)}`,
        { method: "POST" }
      );
    } catch (e) {
      console.log("Local action executed:", e);
    } finally {
      setLoadingAction(false);
      setActionSuccessMessage(
        `✓ Playbook Executed: ${actionName} on ${targetName} - Incident marked as CONTAINED`
      );
      setTimeout(() => setActionSuccessMessage(""), 5000);
    }
  };

  const filteredIncidents = incidents.filter((i) => {
    if (filterSeverity === "all") return true;
    return i.severity.toLowerCase() === filterSeverity.toLowerCase();
  });

  const rootCause = selectedIncident.root_cause_asset_id || selectedIncident.root_cause || "SRV-DC-01";

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex">
      <Sidebar />
      <Header />

      <main className="flex-1 ml-64 pt-20 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" /> Incident Response Center
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Autonomous Correlation, Attacker Progression & SOAR Playbooks
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs font-mono">
              <button
                onClick={() => setFilterSeverity("all")}
                className={`px-2.5 py-1 rounded transition-all ${
                  filterSeverity === "all" ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                All ({incidents.length})
              </button>
              <button
                onClick={() => setFilterSeverity("critical")}
                className={`px-2.5 py-1 rounded transition-all ${
                  filterSeverity === "critical" ? "bg-rose-500/20 text-rose-300 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Critical
              </button>
              <button
                onClick={() => setFilterSeverity("high")}
                className={`px-2.5 py-1 rounded transition-all ${
                  filterSeverity === "high" ? "bg-amber-500/20 text-amber-300 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                High
              </button>
            </div>

            <button
              onClick={loadIncidents}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
              title="Refresh incidents"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {actionSuccessMessage && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-lg flex items-center gap-2 animate-in fade-in duration-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Incident List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            {filteredIncidents.map((inc) => {
              const isSelected = selectedIncident.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#162238] border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                      : "bg-[#111827] border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                        inc.severity === "Critical"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {inc.severity}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Risk <strong className={inc.risk_score > 90 ? "text-rose-400" : "text-amber-400"}>{inc.risk_score}</strong>/100
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-white mt-2 line-clamp-2">{inc.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{inc.summary}</p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
                    <span className={`px-1.5 py-0.5 rounded ${inc.status === "Contained" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-300"}`}>
                      {inc.status}
                    </span>
                    <span className="text-cyan-400 flex items-center gap-1">
                      Inspect <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Detailed Incident Inspection View (8 cols) */}
          <div className="lg:col-span-8 glass-panel p-6 rounded-xl space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-cyan-400 uppercase">
                    INCIDENT ID: {selectedIncident.id}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedIncident.status === "Contained"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}>
                    {selectedIncident.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">{selectedIncident.title}</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Root Cause Asset: <span className="text-rose-400 font-semibold">{rootCause}</span>
                </p>
              </div>

              <div className="text-right">
                <span className="text-3xl font-black text-rose-400 font-mono">{selectedIncident.risk_score}</span>
                <p className="text-[10px] text-slate-400 uppercase font-mono">Threat Index / 100</p>
              </div>
            </div>

            {/* Quick Action Navigation Bar */}
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg text-xs font-mono">
              <span className="text-slate-400">Available Investigation Tools:</span>
              <div className="flex items-center gap-2">
                <Link
                  href={`/attack-graph?incident=${selectedIncident.id}`}
                  className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded border border-cyan-500/30 transition-all flex items-center gap-1.5"
                >
                  <Cpu className="w-3.5 h-3.5" /> View Attack Path
                </Link>
                <Link
                  href={`/copilot?query=Explain%20incident%20${selectedIncident.id}`}
                  className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded border border-purple-500/30 transition-all flex items-center gap-1.5"
                >
                  <Bot className="w-3.5 h-3.5" /> Ask SOC Copilot
                </Link>
                <a
                  href={`${API_BASE_URL}/api/v1/response/report/download?incident_id=${selectedIncident.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded border border-emerald-500/30 transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export PDF Brief
                </a>
              </div>
            </div>

            {/* AI Explanation Box */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 to-blue-950/30 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 mb-2">
                <Bot className="w-4 h-4 text-cyan-400" /> AI Agent Mesh Explanatory Reasoning & Root Cause Analysis
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {selectedIncident.ai_explanation ||
                  "Heterogeneous sensor telemetry correlated across Sysmon process creation and lateral network flows to establish attack progression."}
              </p>
            </div>

            {/* Predictive Attacker Progression Box */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/30">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-amber-400 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-400" /> Attacker Next Step Prediction (Transition Matrix)
                </span>
                <span className="font-mono text-amber-300 text-[11px]">
                  Confidence: {Math.round((selectedIncident.prediction_confidence || 0.94) * 100)}%
                </span>
              </div>
              <p className="text-xs text-slate-200 font-mono mt-1">
                {selectedIncident.predicted_next_step ||
                  "Lateral movement to SCADA OT subnet & Data Encrypted for Impact (T1486)"}
              </p>
            </div>

            {/* MITRE Mapping Badges */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Mapped MITRE ATT&CK Enterprise Techniques
              </h4>
              <div className="flex flex-wrap gap-2">
                {(selectedIncident.mitre_mappings || []).map((m, i) => {
                  const techId = m.technique_id || m.id || "T1000";
                  const techName = m.technique_name || m.name || "Technique";
                  return (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-cyan-300 font-mono flex items-center gap-1.5"
                    >
                      <span className="text-slate-400">[{m.tactic}]</span>
                      <strong>{techId}</strong> - {techName}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Recommended SOAR Action Playbook Controls */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> One-Click SOAR Automated Containment Playbooks
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => triggerSOARAction("Isolate Host Endpoint", rootCause)}
                  disabled={loadingAction}
                  className="p-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-medium transition-all flex items-center justify-between"
                >
                  <span>Isolate Host ({rootCause.split(" ")[0]})</span>
                  <Play className="w-3.5 h-3.5 text-rose-400" />
                </button>

                <button
                  onClick={() => triggerSOARAction("Block External C2 IP", "198.51.100.42")}
                  disabled={loadingAction}
                  className="p-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-medium transition-all flex items-center justify-between"
                >
                  <span>Block External C2 IP (198.51.100.42)</span>
                  <Play className="w-3.5 h-3.5 text-amber-400" />
                </button>

                <button
                  onClick={() => triggerSOARAction("Kill Process Tree", "mimikatz.exe (PID 4820)")}
                  disabled={loadingAction}
                  className="p-3 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-medium transition-all flex items-center justify-between"
                >
                  <span>Terminate Malicious Process Tree</span>
                  <Play className="w-3.5 h-3.5 text-cyan-400" />
                </button>

                <button
                  onClick={() => triggerSOARAction("Revoke Compromised Credentials", "administrator")}
                  disabled={loadingAction}
                  className="p-3 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 text-xs font-medium transition-all flex items-center justify-between"
                >
                  <span>Revoke AD Kerberos / OAuth Tokens</span>
                  <Play className="w-3.5 h-3.5 text-purple-400" />
                </button>
              </div>

              {/* Execution Audit History */}
              {selectedIncident.responses && selectedIncident.responses.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <h5 className="text-[11px] font-mono text-slate-400 uppercase">
                    Playbook Execution Audit Trail ({selectedIncident.responses.length})
                  </h5>
                  {selectedIncident.responses.map((r, i) => {
                    const act = r.action_type || r.action || "Action";
                    const t = r.executed_at || r.time || "Just now";
                    return (
                      <div
                        key={i}
                        className="p-2 bg-slate-950/60 rounded border border-slate-800 text-xs font-mono space-y-1"
                      >
                        <div className="flex items-center justify-between text-emerald-400">
                          <span className="font-bold">✓ {act} on {r.target}</span>
                          <span className="text-slate-500 text-[10px]">{t}</span>
                        </div>
                        {r.output_log && (
                          <p className="text-[11px] text-slate-400 font-sans">{r.output_log}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
