"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { 
  Eye, Search, ShieldAlert, Globe, Server, Hash, 
  AlertTriangle, CheckCircle2, ShieldCheck, RefreshCw 
} from "lucide-react";
import { fetchApi } from "@/services/api";

interface IOCItem {
  ioc_value?: string;
  value?: string;
  ioc_type?: string;
  type?: string;
  threat_actor?: string;
  actor?: string;
  malware_family?: string;
  malware?: string;
  confidence_score?: number;
  confidence?: number;
  geo_origin?: string;
  country?: string;
  source?: string;
}

const FALLBACK_IOCS: IOCItem[] = [
  { value: "198.51.100.42", type: "IPv4", actor: "APT29 (Cozy Bear)", malware: "Cobalt Strike C2", confidence: 95, country: "RU" },
  { value: "203.0.113.15", type: "IPv4", actor: "VOLT TYPHOON", malware: "Web Shell Proxy", confidence: 90, country: "CN" },
  { value: "bad-domain-exfil.com", type: "Domain", actor: "Lazarus Group", malware: "DNS Tunneling", confidence: 88, country: "KP" },
  { value: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", type: "SHA256", actor: "LockBit 3.0", malware: "Ransomware Encryptor", confidence: 99, country: "Global" }
];

export default function ThreatIntelPage() {
  const [iocs, setIocs] = useState<IOCItem[]>(FALLBACK_IOCS);
  const [searchQuery, setSearchQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchApi<any[]>("/api/v1/threat-intel/iocs")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setIocs(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleLookup = async (queryVal?: string) => {
    const val = (queryVal || searchQuery).trim();
    if (!val) return;

    setSearching(true);
    try {
      const res = await fetchApi(`/api/v1/threat-intel/lookup/${encodeURIComponent(val)}`);
      if (res?.status === "MALICIOUS") {
        setLookupResult({
          status: "MALICIOUS",
          data: {
            value: val,
            actor: res.details?.actor || "Advanced Persistent Threat",
            malware: res.details?.malware || "Unknown Malware",
            type: res.details?.type || "Network Indicator",
            confidence: res.details?.confidence || 95
          }
        });
      } else {
        // Check local fallback
        const hit = iocs.find(i => (i.ioc_value || i.value)?.toLowerCase() === val.toLowerCase());
        if (hit) {
          setLookupResult({
            status: "MALICIOUS",
            data: {
              value: val,
              actor: hit.threat_actor || hit.actor,
              malware: hit.malware_family || hit.malware,
              type: hit.ioc_type || hit.type,
              confidence: hit.confidence_score || hit.confidence || 95
            }
          });
        } else {
          setLookupResult({ status: "CLEAN", query: val });
        }
      }
    } catch (e) {
      const hit = iocs.find(i => (i.ioc_value || i.value)?.toLowerCase() === val.toLowerCase());
      if (hit) {
        setLookupResult({
          status: "MALICIOUS",
          data: {
            value: val,
            actor: hit.threat_actor || hit.actor,
            malware: hit.malware_family || hit.malware,
            type: hit.ioc_type || hit.type,
            confidence: hit.confidence_score || hit.confidence || 95
          }
        });
      } else {
        setLookupResult({ status: "CLEAN", query: val });
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex">
      <Sidebar />
      <Header />

      <main className="flex-1 ml-64 pt-20 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyan-400" /> Threat Intelligence Repository
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Global Malicious IPs, Domains, Hashes & Adversary Attribution
          </p>
        </div>

        {/* Search IOC Form */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleLookup(); }} 
            className="flex gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search IP, Domain, File Hash (e.g. 198.51.100.42 or bad-domain-exfil.com)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button 
              type="submit" 
              disabled={searching}
              className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
            >
              {searching ? "Searching..." : "Lookup IOC"}
            </button>
          </form>

          {/* Quick Query Pills */}
          <div className="flex items-center gap-2 mt-3 text-xs font-mono text-slate-400">
            <span>Quick Lookups:</span>
            <button
              onClick={() => { setSearchQuery("198.51.100.42"); handleLookup("198.51.100.42"); }}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 text-[11px]"
            >
              198.51.100.42 (C2)
            </button>
            <button
              onClick={() => { setSearchQuery("bad-domain-exfil.com"); handleLookup("bad-domain-exfil.com"); }}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700 text-[11px]"
            >
              bad-domain-exfil.com
            </button>
            <button
              onClick={() => { setSearchQuery("8.8.8.8"); handleLookup("8.8.8.8"); }}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded border border-slate-700 text-[11px]"
            >
              8.8.8.8 (Clean)
            </button>
          </div>

          {/* Results Card */}
          {lookupResult && (
            <div className="mt-4 p-4 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono animate-in fade-in duration-200">
              {lookupResult.status === "MALICIOUS" ? (
                <div className="text-rose-300 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-rose-500/30">
                    <p className="font-bold flex items-center gap-2 text-sm text-rose-400">
                      <ShieldAlert className="w-4 h-4 text-rose-500" /> KNOWN MALICIOUS IOC MATCH FOUND
                    </p>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                      CONFIDENCE: {lookupResult.data.confidence}%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-slate-300">
                    <p>Adversary Actor: <strong className="text-white">{lookupResult.data.actor}</strong></p>
                    <p>Malware Family: <strong className="text-rose-400">{lookupResult.data.malware}</strong></p>
                    <p>Indicator Type: <strong className="text-cyan-300">{lookupResult.data.type}</strong></p>
                  </div>
                </div>
              ) : (
                <div className="text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>No known threat intelligence match found for indicator: <strong>{lookupResult.query}</strong> (Evaluated Clean)</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* IOC Table */}
        <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Active Threat Feed Indicators</h3>
            <span className="text-[10px] font-mono text-slate-400">
              Total Monitored Indicators: {iocs.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Indicator Value</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Threat Actor</th>
                  <th className="p-3.5">Malware Family</th>
                  <th className="p-3.5">Confidence</th>
                  <th className="p-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {iocs.map((ioc, i) => {
                  const val = ioc.ioc_value || ioc.value || "";
                  const type = ioc.ioc_type || ioc.type || "IP";
                  const actor = ioc.threat_actor || ioc.actor || "APT";
                  const malware = ioc.malware_family || ioc.malware || "Trojan";
                  const conf = ioc.confidence_score || ioc.confidence || 90;

                  return (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="p-3.5 font-bold text-rose-300 max-w-xs truncate">{val}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {type}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-white">{actor}</td>
                      <td className="p-3.5 text-amber-300">{malware}</td>
                      <td className="p-3.5 font-bold text-emerald-400">{conf}%</td>
                      <td className="p-3.5">
                        <button
                          onClick={() => { setSearchQuery(val); handleLookup(val); }}
                          className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px]"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
