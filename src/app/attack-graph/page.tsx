"use client";

import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { 
  GitMerge, ShieldAlert, Cpu, Server, Terminal, AlertTriangle, 
  CheckCircle2, ArrowRight, Bot, ShieldCheck, RefreshCw 
} from "lucide-react";
import { ReactFlow, Background, Controls, Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { fetchApi } from "@/services/api";

const PRESET_SCENARIOS = {
  ransomware: {
    title: "APT Ransomware Lateral Movement & Encryption",
    nodes: [
      { id: '1', position: { x: 40, y: 150 }, data: { label: 'User: j.smith (Phished)', type: 'User', ip: '192.168.1.50', risk: 'High', desc: 'Opened Spearphishing Word Macro document' }, style: { background: '#1E293B', color: '#38BDF8', border: '1px solid #38BDF8', borderRadius: '10px', padding: '12px', width: 200 } },
      { id: '2', position: { x: 290, y: 150 }, data: { label: 'WKSTN-FIN-08 (192.168.1.50)', type: 'Endpoint', ip: '192.168.1.50', risk: 'High', desc: 'Initial compromise workstation' }, style: { background: '#4C0519', color: '#FDA4AF', border: '1px solid #F43F5E', borderRadius: '10px', padding: '12px', width: 220 } },
      { id: '3', position: { x: 570, y: 70 }, data: { label: 'Process: mimikatz.exe (LSASS)', type: 'Process', technique: 'T1003.001', risk: 'Critical', desc: 'Dumped Domain Admin NTLM credentials' }, style: { background: '#881337', color: '#FDA4AF', border: '1px solid #F43F5E', borderRadius: '10px', padding: '12px', width: 220 } },
      { id: '4', position: { x: 570, y: 230 }, data: { label: 'Process: powershell.exe -enc...', type: 'Process', technique: 'T1059.001', risk: 'Critical', desc: 'Base64 encoded payload executed in memory' }, style: { background: '#881337', color: '#FDA4AF', border: '1px solid #F43F5E', borderRadius: '10px', padding: '12px', width: 220 } },
      { id: '5', position: { x: 860, y: 150 }, data: { label: 'SRV-DC-01 (192.168.1.10) [COMPROMISED]', type: 'Domain Controller', ip: '192.168.1.10', risk: 'Critical', desc: 'Primary Domain Controller compromised via WMI' }, style: { background: '#7F1D1D', color: '#FCA5A5', border: '2px solid #EF4444', borderRadius: '10px', padding: '14px', width: 240, fontWeight: 'bold' } },
      { id: '6', position: { x: 1170, y: 150 }, data: { label: 'PLC-WATER-PUMP-01 (10.0.4.20) [TARGETED]', type: 'SCADA PLC', ip: '10.0.4.20', risk: 'Warning', desc: 'Predicted next lateral target in OT Subnet' }, style: { background: '#451A03', color: '#FDE68A', border: '2px dashed #F59E0B', borderRadius: '10px', padding: '12px', width: 230 } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: 'AUTHENTICATED_TO', animated: true, style: { stroke: '#38BDF8', strokeWidth: 2 } },
      { id: 'e2-3', source: '2', target: '3', label: 'SPAWNED_PROCESS', animated: true, style: { stroke: '#F43F5E', strokeWidth: 2 } },
      { id: 'e2-4', source: '2', target: '4', label: 'SPAWNED_PROCESS', animated: true, style: { stroke: '#F43F5E', strokeWidth: 2 } },
      { id: 'e3-5', source: '3', target: '5', label: 'WMI LATERAL MOVEMENT', animated: true, style: { stroke: '#EF4444', strokeWidth: 3 } },
      { id: 'e5-6', source: '5', target: '6', label: 'PREDICTED STEP (Modbus)', animated: true, style: { stroke: '#F59E0B', strokeDasharray: '6,6', strokeWidth: 2 } }
    ]
  },
  scada: {
    title: "Insider Threat: Water Treatment SCADA PLC Tampering",
    nodes: [
      { id: '1', position: { x: 40, y: 150 }, data: { label: 'User: r.insider (Water Eng)', type: 'Insider', ip: '10.0.4.5', risk: 'High', desc: 'Off-hours unauthorized operator session' }, style: { background: '#1E293B', color: '#38BDF8', border: '1px solid #38BDF8', borderRadius: '10px', padding: '12px', width: 200 } },
      { id: '2', position: { x: 300, y: 150 }, data: { label: 'HMI-WATER-PUMP-01 (10.0.4.12)', type: 'HMI Console', ip: '10.0.4.12', risk: 'Critical', desc: 'Human-Machine Interface workstation in dosing hall' }, style: { background: '#4C0519', color: '#FDA4AF', border: '1px solid #F43F5E', borderRadius: '10px', padding: '12px', width: 230 } },
      { id: '3', position: { x: 620, y: 150 }, data: { label: 'Modbus Protocol Func 0x06', type: 'OT Protocol', technique: 'T0855', risk: 'Critical', desc: 'Direct write single register (40001) override command' }, style: { background: '#7F1D1D', color: '#FCA5A5', border: '2px solid #EF4444', borderRadius: '10px', padding: '12px', width: 230 } },
      { id: '4', position: { x: 930, y: 150 }, data: { label: 'PLC-CHEM-DOSING-02 (10.0.4.20)', type: 'SCADA PLC', ip: '10.0.4.20', risk: 'Critical', desc: 'Chemical dosing controller target' }, style: { background: '#881337', color: '#FDA4AF', border: '2px solid #EF4444', borderRadius: '10px', padding: '14px', width: 240, fontWeight: 'bold' } },
      { id: '5', position: { x: 1240, y: 150 }, data: { label: 'Safety System SIS-01 [BYPASS ATTEMPT]', type: 'Safety System', risk: 'Warning', desc: 'Predicted safety instrumented override' }, style: { background: '#451A03', color: '#FDE68A', border: '2px dashed #F59E0B', borderRadius: '10px', padding: '12px', width: 230 } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: 'LOCAL_OPERATOR_LOGIN', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
      { id: 'e2-3', source: '2', target: '3', label: 'FORGED_MODBUS_CMD', animated: true, style: { stroke: '#EF4444', strokeWidth: 3 } },
      { id: 'e3-4', source: '3', target: '4', label: 'REGISTER_OVERRIDE_40001', animated: true, style: { stroke: '#EF4444', strokeWidth: 3 } },
      { id: 'e4-5', source: '4', target: '5', label: 'PREDICTED SIS BYPASS', animated: true, style: { stroke: '#F59E0B', strokeDasharray: '6,6', strokeWidth: 2 } }
    ]
  },
  exfiltration: {
    title: "Impossible Travel VPN Login & DNS TXT Tunneling Exfiltration",
    nodes: [
      { id: '1', position: { x: 40, y: 150 }, data: { label: 'Anomalous Geo-IP: 203.0.113.15 (RU)', type: 'External IP', ip: '203.0.113.15', risk: 'Critical', desc: 'Origin Moscow, Russian Federation' }, style: { background: '#7F1D1D', color: '#FCA5A5', border: '2px solid #EF4444', borderRadius: '10px', padding: '12px', width: 220 } },
      { id: '2', position: { x: 320, y: 150 }, data: { label: 'VPN-GW-01 [Impossible Travel]', type: 'Gateway', ip: '192.168.1.1', risk: 'High', desc: 'Authenticated 12m after Washington login' }, style: { background: '#4C0519', color: '#FDA4AF', border: '1px solid #F43F5E', borderRadius: '10px', padding: '12px', width: 220 } },
      { id: '3', position: { x: 620, y: 150 }, data: { label: 'Account: m.taylor (Compromised)', type: 'User Account', technique: 'T1078', risk: 'High', desc: 'Compromised Active Directory credentials' }, style: { background: '#1E293B', color: '#38BDF8', border: '1px solid #38BDF8', borderRadius: '10px', padding: '12px', width: 220 } },
      { id: '4', position: { x: 920, y: 150 }, data: { label: 'DNS Tunneling Script (TXT Bursts)', type: 'Network Process', technique: 'T1071.004', risk: 'Critical', desc: 'Encoded database exfiltration via DNS queries' }, style: { background: '#881337', color: '#FDA4AF', border: '1px solid #F43F5E', borderRadius: '10px', padding: '12px', width: 230 } },
      { id: '5', position: { x: 1230, y: 150 }, data: { label: 'bad-domain-exfil.com [C2 DESTINATION]', type: 'C2 Domain', risk: 'Critical', desc: 'Known Lazarus Group adversary infrastructure' }, style: { background: '#7F1D1D', color: '#FCA5A5', border: '2px solid #EF4444', borderRadius: '10px', padding: '14px', width: 240, fontWeight: 'bold' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: 'VPN_TUNNEL_ESTABLISHED', animated: true, style: { stroke: '#EF4444', strokeWidth: 3 } },
      { id: 'e2-3', source: '2', target: '3', label: 'HIJACKED_SESSION', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
      { id: 'e3-4', source: '3', target: '4', label: 'SPAWNED_TUNNELING_CLIENT', animated: true, style: { stroke: '#38BDF8', strokeWidth: 2 } },
      { id: 'e4-5', source: '4', target: '5', label: 'COVERT_DATA_EXFILTRATION', animated: true, style: { stroke: '#EF4444', strokeWidth: 3 } }
    ]
  }
};

export default function AttackGraphPage() {
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<"ransomware" | "scada" | "exfiltration">("ransomware");
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);
  const [nodes, setNodes] = useState<Node[]>(PRESET_SCENARIOS.ransomware.nodes as Node[]);
  const [edges, setEdges] = useState<Edge[]>(PRESET_SCENARIOS.ransomware.edges as Edge[]);
  const [isolatedEntities, setIsolatedEntities] = useState<string[]>([]);
  const [actionSuccess, setActionSuccess] = useState<string>("");

  useEffect(() => {
    // Check if query param or simulation event requested a specific scenario
    const params = new URLSearchParams(window.location.search);
    const incParam = params.get("incident");
    if (incParam) {
      if (incParam.includes("scada") || incParam.includes("ot")) {
        setSelectedScenarioKey("scada");
      } else if (incParam.includes("vpn") || incParam.includes("exfil")) {
        setSelectedScenarioKey("exfiltration");
      }
    }

    const handleSimulation = (e: any) => {
      const { scenario } = e.detail || {};
      if (scenario === "insider_ot") {
        setSelectedScenarioKey("scada");
      } else if (scenario === "exfiltration") {
        setSelectedScenarioKey("exfiltration");
      } else if (scenario === "ransomware") {
        setSelectedScenarioKey("ransomware");
      }
    };

    window.addEventListener("sentinel:simulation", handleSimulation);
    return () => window.removeEventListener("sentinel:simulation", handleSimulation);
  }, []);

  useEffect(() => {
    const sc = PRESET_SCENARIOS[selectedScenarioKey];
    setNodes(sc.nodes as Node[]);
    setEdges(sc.edges as Edge[]);
    setSelectedNodeData(sc.nodes[0].data);
  }, [selectedScenarioKey]);

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNodeData(node.data);
  };

  const handleIsolateEntity = (label: string) => {
    setIsolatedEntities((prev) => [...prev, label]);
    setActionSuccess(`✓ Network isolation rule pushed for entity: ${label}`);
    setTimeout(() => setActionSuccess(""), 4000);
  };

  const currentScenario = PRESET_SCENARIOS[selectedScenarioKey];

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex">
      <Sidebar />
      <Header />

      <main className="flex-1 ml-64 pt-20 p-6 space-y-4 flex flex-col h-screen">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-cyan-400" /> Interactive Attack Path Topology Graph
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Multi-Hop Entity Linkage, Lateral Movement & Attacker Progression Visualizer
            </p>
          </div>

          {/* Scenario Switcher Tabs */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-xs font-mono">
            <span className="text-[10px] text-slate-400 uppercase px-2">Topology Scenario:</span>
            <button
              onClick={() => setSelectedScenarioKey("ransomware")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                selectedScenarioKey === "ransomware"
                  ? "bg-rose-500/25 text-rose-300 font-bold border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.15)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              1. Ransomware Lateral
            </button>
            <button
              onClick={() => setSelectedScenarioKey("scada")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                selectedScenarioKey === "scada"
                  ? "bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              2. SCADA OT Sabotage
            </button>
            <button
              onClick={() => setSelectedScenarioKey("exfiltration")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                selectedScenarioKey === "exfiltration"
                  ? "bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              3. VPN DNS Exfiltration
            </button>
          </div>
        </div>

        {actionSuccess && (
          <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-lg flex items-center gap-2 animate-in fade-in duration-300 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Graph Canvas & Inspection Panel Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
          {/* React Flow Topology Canvas (9 cols) */}
          <div className="lg:col-span-9 glass-panel rounded-xl overflow-hidden relative flex flex-col border border-slate-800">
            {/* Overlay Title */}
            <div className="absolute top-3 left-4 z-10 bg-slate-950/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-mono text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>ACTIVE TOPOLOGY: <strong>{currentScenario.title}</strong></span>
            </div>

            <div className="flex-1 w-full h-full">
              <ReactFlow 
                nodes={nodes} 
                edges={edges} 
                onNodeClick={onNodeClick}
                fitView
              >
                <Background color="#1E293B" gap={18} size={1} />
                <Controls />
              </ReactFlow>
            </div>

            {/* Canvas Legend Footer */}
            <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[11px] font-mono text-slate-400 px-4">
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-sky-400" /> User Auth
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Lateral Movement / Injection
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-400" /> Predicted Next Step
                </span>
              </div>
              <span className="text-slate-500">Tip: Click any node to inspect telemetry & trigger SOAR quarantine</span>
            </div>
          </div>

          {/* Right Node Inspection Drawer (3 cols) */}
          <div className="lg:col-span-3 glass-panel p-4 rounded-xl flex flex-col justify-between border border-slate-800 overflow-y-auto">
            {selectedNodeData ? (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-800">
                  <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider">
                    ENTITY TELEMETRY INSPECTOR
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1">{selectedNodeData.label}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      selectedNodeData.risk === "Critical"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}>
                      {selectedNodeData.risk || "High"} Risk
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Type: {selectedNodeData.type}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  {selectedNodeData.ip && (
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">NETWORK ADDRESS:</span>
                      <span className="text-cyan-300 font-bold">{selectedNodeData.ip}</span>
                    </div>
                  )}

                  {selectedNodeData.technique && (
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">MITRE TECHNIQUE:</span>
                      <span className="text-rose-300 font-bold">{selectedNodeData.technique}</span>
                    </div>
                  )}

                  <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] mb-1">OBSERVED BEHAVIOR:</span>
                    <p className="text-slate-300 font-sans leading-relaxed text-[11px]">
                      {selectedNodeData.desc || "Telemetry correlated through AI Agent Mesh."}
                    </p>
                  </div>
                </div>

                {/* SOAR Action */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <button
                    onClick={() => handleIsolateEntity(selectedNodeData.label)}
                    disabled={isolatedEntities.includes(selectedNodeData.label)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-2 transition-all ${
                      isolatedEntities.includes(selectedNodeData.label)
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>
                      {isolatedEntities.includes(selectedNodeData.label)
                        ? "Entity Quarantined"
                        : "Quarantine / Isolate Entity"}
                    </span>
                  </button>

                  <a
                    href={`/copilot?query=Analyze%20entity%20${encodeURIComponent(selectedNodeData.label)}`}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold font-mono flex items-center justify-center gap-2 transition-all"
                  >
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Investigate in Copilot</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs font-mono">
                Click any node in the graph to view entity forensics & playbooks.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
