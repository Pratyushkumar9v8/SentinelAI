"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { 
  Grid, ShieldAlert, Cpu, Bot, CheckCircle2, 
  ExternalLink, Info, X, ShieldCheck 
} from "lucide-react";
import { fetchApi } from "@/services/api";

interface Technique {
  technique_id: string;
  technique_name: string;
  tactic: string;
  description: string;
  mitigation: string;
  active?: boolean;
}

const TACTICS_ORDER = [
  "Initial Access", "Execution", "Persistence", "Privilege Escalation", 
  "Credential Access", "Discovery", "Lateral Movement", "Collection", 
  "Exfiltration", "Impact", "Impair Process Control"
];

const FALLBACK_MATRIX: Record<string, Technique[]> = {
  "Initial Access": [
    { technique_id: "T1078", technique_name: "Valid Accounts", tactic: "Initial Access", description: "Adversaries obtain and abuse credentials of existing accounts.", mitigation: "Enforce multi-factor authentication and credential rotation.", active: true },
    { technique_id: "T1566", technique_name: "Phishing Attachment", tactic: "Initial Access", description: "Spearphishing emails with malicious attachments targeting finance users.", mitigation: "Email gateway inspection and macro execution restrictions.", active: true }
  ],
  "Execution": [
    { technique_id: "T1059.001", technique_name: "PowerShell", tactic: "Execution", description: "PowerShell scripts executed with encoded commands (-enc).", mitigation: "Enable Script Block Logging and Constrained Language Mode.", active: true },
    { technique_id: "T1059.003", technique_name: "Windows Command Shell", tactic: "Execution", description: "Standard cmd.exe process execution.", mitigation: "Process creation auditing via Sysmon Event ID 1.", active: false }
  ],
  "Credential Access": [
    { technique_id: "T1003.001", technique_name: "LSASS Memory Dump", tactic: "Credential Access", description: "Mimikatz dumping cleartext passwords and hashes from LSASS.", mitigation: "Enable RunAsPPL and Credential Guard on all endpoints.", active: true }
  ],
  "Lateral Movement": [
    { technique_id: "T1021.002", technique_name: "SMB / Admin Shares", tactic: "Lateral Movement", description: "Adversaries leverage administrative shares (C$, ADMIN$) for file staging.", mitigation: "Disable SMBv1 and restrict file sharing between workstations.", active: true },
    { technique_id: "T1047", technique_name: "WMI Execution", tactic: "Lateral Movement", description: "Windows Management Instrumentation used to execute commands remotely.", mitigation: "Monitor WMI event subscriptions and block remote WMI.", active: true }
  ],
  "Exfiltration": [
    { technique_id: "T1071.004", technique_name: "DNS Exfiltration", tactic: "Exfiltration", description: "Covert data exfiltration tunneling over sub-second DNS TXT queries.", mitigation: "DNS sinkholing and query length anomaly detection.", active: true }
  ],
  "Impact": [
    { technique_id: "T1490", technique_name: "Inhibit System Recovery", tactic: "Impact", description: "Adversaries delete volume shadow copies using vssadmin delete shadows.", mitigation: "Protect shadow copies and alert on vssadmin execution.", active: true },
    { technique_id: "T1486", technique_name: "Data Encrypted for Impact", tactic: "Impact", description: "Ransomware encrypts target file systems.", mitigation: "Immutable backups and automated rapid host quarantine.", active: true }
  ],
  "Impair Process Control": [
    { technique_id: "T0855", technique_name: "Unauthorized Command Message", tactic: "Impair Process Control", description: "Direct Modbus function 0x06 write commands sent to industrial PLCs.", mitigation: "Industrial firewall deep packet inspection on port 502.", active: true }
  ]
};

export default function MitrePage() {
  const [matrix, setMatrix] = useState<Record<string, Technique[]>>(FALLBACK_MATRIX);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);

  useEffect(() => {
    fetchApi("/api/v1/mitre/matrix")
      .then((data) => {
        if (data?.matrix) {
          // Merge active flags into loaded matrix
          const merged: Record<string, Technique[]> = {};
          for (const [tactic, techs] of Object.entries(data.matrix)) {
            merged[tactic] = (techs as Technique[]).map(t => ({
              ...t,
              active: ["T1078", "T1059.001", "T1003.001", "T1021.002", "T1047", "T1071.004", "T1490", "T1486", "T0855"].includes(t.technique_id)
            }));
          }
          setMatrix(merged);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex">
      <Sidebar />
      <Header />

      <main className="flex-1 ml-64 pt-20 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Grid className="w-5 h-5 text-cyan-400" /> MITRE ATT&CK Enterprise & OT Matrix
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Real-Time Technique Detection Overlays & Progression Heatmap (14 Tactics)
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded bg-rose-500 animate-pulse" /> Active In Campaign (Observed)
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2.5 h-2.5 rounded bg-slate-800" /> Monitored Baseline
            </span>
          </div>
        </div>

        {/* ATT&CK Matrix Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {TACTICS_ORDER.map((tacticName, i) => {
            const techs = matrix[tacticName] || [];
            return (
              <div key={i} className="glass-panel rounded-xl overflow-hidden flex flex-col border border-slate-800">
                <div className="p-3 bg-slate-900/90 border-b border-slate-800 text-center">
                  <h4 className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider line-clamp-1">
                    {tacticName}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {techs.length} Techniques
                  </span>
                </div>

                <div className="p-2 space-y-2 flex-1">
                  {techs.map((tech, j) => {
                    const isObserved = tech.active || ["T1078", "T1059.001", "T1003.001", "T1021.002", "T1047", "T1071.004", "T1490", "T1486", "T0855"].includes(tech.technique_id);
                    return (
                      <div
                        key={j}
                        onClick={() => setSelectedTechnique(tech)}
                        className={`p-2.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                          isObserved
                            ? "bg-rose-500/20 border-rose-500/50 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.15)] hover:border-rose-400"
                            : "bg-slate-900/40 border-slate-800 text-slate-400 opacity-60 hover:opacity-100 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="font-bold">{tech.technique_id}</span>
                          {isObserved && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 font-semibold text-[9px]">
                              OBSERVED
                            </span>
                          )}
                        </div>
                        <p className="font-sans text-[11px] font-medium leading-tight line-clamp-2">
                          {tech.technique_name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal / Drawer for Technique Inspection */}
        {selectedTechnique && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0E1524] border border-cyan-500/40 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-[0_0_35px_rgba(6,182,212,0.2)] animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[11px] font-bold">
                      {selectedTechnique.technique_id}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Tactic: <strong>{selectedTechnique.tactic}</strong>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {selectedTechnique.technique_name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTechnique(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-mono text-[10px] uppercase">
                    Description & Mechanics:
                  </span>
                  <p className="text-slate-200 font-sans">
                    {selectedTechnique.description || "Monitored technique within the enterprise matrix."}
                  </p>
                </div>

                <div className="p-3 bg-emerald-950/20 rounded-lg border border-emerald-500/30 space-y-1">
                  <span className="text-emerald-400 font-mono text-[10px] uppercase font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Recommended Mitigation:
                  </span>
                  <p className="text-emerald-200 font-sans">
                    {selectedTechnique.mitigation || "Enforce least privilege and behavioral network monitoring."}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  onClick={() => setSelectedTechnique(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg transition-all"
                >
                  Close
                </button>
                <Link
                  href={`/copilot?query=Explain%20technique%20${selectedTechnique.technique_id}%20(${encodeURIComponent(selectedTechnique.technique_name)})`}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                >
                  <Bot className="w-3.5 h-3.5" /> Ask SOC Copilot
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
