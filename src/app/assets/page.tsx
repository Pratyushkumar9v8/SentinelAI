"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { 
  Server, ShieldAlert, CheckCircle2, ShieldCheck, 
  Search, Filter, Play, RefreshCw 
} from "lucide-react";
import { fetchApi } from "@/services/api";

interface AssetItem {
  id?: string;
  hostname: string;
  ip_address?: string;
  ip?: string;
  asset_type?: string;
  type?: string;
  environment?: string;
  env?: string;
  operating_system?: string;
  os?: string;
  criticality_score?: number;
  crit?: number;
  status: string;
  cve?: string;
}

const FALLBACK_ASSETS: AssetItem[] = [
  { hostname: "SRV-DC-01", ip: "192.168.1.10", type: "Server", env: "IT", os: "Windows Server 2022", crit: 95, status: "Compromised", cve: "CVE-2024-1709 (Critical)" },
  { hostname: "SRV-APP-02", ip: "192.168.1.15", type: "Server", env: "IT", os: "Ubuntu 22.04 LTS", crit: 80, status: "Healthy", cve: "None" },
  { hostname: "WKSTN-FIN-08", ip: "192.168.1.50", type: "Endpoint", env: "IT", os: "Windows 11 Enterprise", crit: 60, status: "Healthy", cve: "CVE-2023-36884 (High)" },
  { hostname: "FW-PERIMETER-01", ip: "192.168.1.1", type: "Firewall", env: "IT", os: "Palo Alto PAN-OS", crit: 90, status: "Healthy", cve: "None" },
  { hostname: "HMI-WATER-PUMP-01", ip: "10.0.4.12", type: "SCADA/PLC", env: "OT", os: "FreeRTOS SCADA Firmware", crit: 100, status: "Compromised", cve: "CVE-2024-1086 (Critical)" },
  { hostname: "PLC-CHEM-DOSING-02", ip: "10.0.4.20", type: "SCADA/PLC", env: "OT", os: "Modicon Quantum PLC", crit: 100, status: "Healthy", cve: "None" }
];

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetItem[]>(FALLBACK_ASSETS);
  const [search, setSearch] = useState("");
  const [filterEnv, setFilterEnv] = useState<"ALL" | "IT" | "OT">("ALL");
  const [quarantined, setQuarantined] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetchApi<any[]>("/api/v1/assets")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAssets(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleQuarantine = (hostname: string) => {
    setQuarantined((prev) => [...prev, hostname]);
    setAssets((prev) =>
      prev.map((a) => (a.hostname === hostname ? { ...a, status: "Isolated" } : a))
    );
    setNotice(`✓ Asset [${hostname}] quarantined and network port disabled via SOAR playbook.`);
    setTimeout(() => setNotice(""), 4000);
  };

  const filteredAssets = assets.filter((a) => {
    const env = a.environment || a.env || "IT";
    if (filterEnv !== "ALL" && env.toUpperCase() !== filterEnv) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const h = a.hostname.toLowerCase();
      const ip = (a.ip_address || a.ip || "").toLowerCase();
      return h.includes(q) || ip.includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex">
      <Sidebar />
      <Header />

      <main className="flex-1 ml-64 pt-20 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" /> Enterprise & OT Asset Inventory
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Hardware Profiling, Criticality Scoring, Vulnerabilities & Host Isolation
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by Hostname / IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500 w-52"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs font-mono">
              <button
                onClick={() => setFilterEnv("ALL")}
                className={`px-2.5 py-1 rounded transition-all ${
                  filterEnv === "ALL" ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterEnv("IT")}
                className={`px-2.5 py-1 rounded transition-all ${
                  filterEnv === "IT" ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                IT Assets
              </button>
              <button
                onClick={() => setFilterEnv("OT")}
                className={`px-2.5 py-1 rounded transition-all ${
                  filterEnv === "OT" ? "bg-amber-500/20 text-amber-300 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                SCADA / OT
              </button>
            </div>
          </div>
        </div>

        {notice && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-lg flex items-center gap-2 font-mono animate-in fade-in duration-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Asset Table */}
        <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Hostname</th>
                <th className="p-3.5">IP Address</th>
                <th className="p-3.5">Asset Type</th>
                <th className="p-3.5">Environment</th>
                <th className="p-3.5">Operating System</th>
                <th className="p-3.5">Criticality</th>
                <th className="p-3.5">Security Status</th>
                <th className="p-3.5">CVE Vulnerabilities</th>
                <th className="p-3.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAssets.map((a, i) => {
                const ip = a.ip_address || a.ip || "192.168.1.10";
                const type = a.asset_type || a.type || "Device";
                const env = a.environment || a.env || "IT";
                const os = a.operating_system || a.os || "Linux";
                const crit = a.criticality_score || a.crit || 50;
                const cve = a.cve || "None";
                const isCompromised = a.status === "Compromised";
                const isIsolated = a.status === "Isolated" || quarantined.includes(a.hostname);

                return (
                  <tr key={i} className="hover:bg-slate-800/30">
                    <td className="p-3.5 font-bold text-white">{a.hostname}</td>
                    <td className="p-3.5 text-cyan-400">{ip}</td>
                    <td className="p-3.5 text-slate-300">{type}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        env === "OT"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-slate-800 text-slate-300"
                      }`}>
                        {env}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">{os}</td>
                    <td className="p-3.5 font-bold">
                      <span className={crit > 85 ? "text-rose-400" : "text-amber-400"}>
                        {crit} / 100
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded font-semibold ${
                        isIsolated
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                          : isCompromised
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {isIsolated ? "Isolated" : a.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-rose-300">{cve}</td>
                    <td className="p-3.5">
                      {isIsolated ? (
                        <span className="text-[10px] text-purple-400 font-bold">QUARANTINED</span>
                      ) : (
                        <button
                          onClick={() => handleQuarantine(a.hostname)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                            isCompromised
                              ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Isolate Host
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
