from fastapi import APIRouter
from app.ml.graph_analyzer import graph_analyzer
from app.services.simulator_engine import simulator_engine

router = APIRouter()

SCENARIO_GRAPHS = {
    "ransomware": {
        "nodes": [
            {"id": "1", "position": {"x": 50, "y": 150}, "data": {"label": "User: j.smith (Phished)", "type": "User", "risk": "High", "ip": "192.168.1.50"}},
            {"id": "2", "position": {"x": 320, "y": 150}, "data": {"label": "WKSTN-FIN-08 (192.168.1.50)", "type": "Endpoint", "risk": "High", "ip": "192.168.1.50"}},
            {"id": "3", "position": {"x": 620, "y": 80}, "data": {"label": "Process: mimikatz.exe (LSASS)", "type": "Process", "risk": "Critical", "technique": "T1003.001"}},
            {"id": "4", "position": {"x": 620, "y": 230}, "data": {"label": "Process: powershell.exe -enc...", "type": "Process", "risk": "Critical", "technique": "T1059.001"}},
            {"id": "5", "position": {"x": 940, "y": 150}, "data": {"label": "SRV-DC-01 (192.168.1.10) [COMPROMISED]", "type": "Server", "risk": "Critical", "status": "Compromised"}},
            {"id": "6", "position": {"x": 1260, "y": 150}, "data": {"label": "PLC-WATER-PUMP-01 (10.0.4.20) [TARGETED]", "type": "OT/SCADA", "risk": "Warning", "status": "At Risk"}}
        ],
        "edges": [
            {"id": "e1-2", "source": "1", "target": "2", "label": "AUTHENTICATED_TO", "animated": True, "style": {"stroke": "#38BDF8"}},
            {"id": "e2-3", "source": "2", "target": "3", "label": "SPAWNED_PROCESS", "animated": True, "style": {"stroke": "#F43F5E"}},
            {"id": "e2-4", "source": "2", "target": "4", "label": "SPAWNED_PROCESS", "animated": True, "style": {"stroke": "#F43F5E"}},
            {"id": "e3-5", "source": "3", "target": "5", "label": "WMI LATERAL MOVEMENT", "animated": True, "style": {"stroke": "#EF4444", "strokeWidth": 2}},
            {"id": "e5-6", "source": "5", "target": "6", "label": "PREDICTED NEXT STEP (Modbus)", "animated": True, "style": {"stroke": "#F59E0B", "strokeDasharray": "5,5"}}
        ]
    },
    "scada": {
        "nodes": [
            {"id": "1", "position": {"x": 50, "y": 150}, "data": {"label": "User: r.insider (Engineering)", "type": "User", "risk": "High", "ip": "10.0.4.5"}},
            {"id": "2", "position": {"x": 350, "y": 150}, "data": {"label": "HMI-WATER-PUMP-01 (10.0.4.12)", "type": "HMI Console", "risk": "Critical", "ip": "10.0.4.12"}},
            {"id": "3", "position": {"x": 700, "y": 150}, "data": {"label": "Modbus Function 0x06 Write Register", "type": "SCADA Protocol", "risk": "Critical", "technique": "T0855"}},
            {"id": "4", "position": {"x": 1050, "y": 150}, "data": {"label": "PLC-CHEM-DOSING-02 (10.0.4.20)", "type": "OT/SCADA", "risk": "Critical", "status": "Overridden"}},
            {"id": "5", "position": {"x": 1400, "y": 150}, "data": {"label": "Safety Valve SIS-01 [PREDICTED OVERRIDE]", "type": "Safety System", "risk": "Warning", "status": "At Risk"}}
        ],
        "edges": [
            {"id": "e1-2", "source": "1", "target": "2", "label": "ROGUE_LOCAL_LOGIN", "animated": True, "style": {"stroke": "#F59E0B"}},
            {"id": "e2-3", "source": "2", "target": "3", "label": "FORGED_MODBUS_CMD", "animated": True, "style": {"stroke": "#EF4444", "strokeWidth": 2}},
            {"id": "e3-4", "source": "3", "target": "4", "label": "UNAUTHORIZED_WRITE_40001", "animated": True, "style": {"stroke": "#EF4444", "strokeWidth": 2}},
            {"id": "e4-5", "source": "4", "target": "5", "label": "PREDICTED NEXT STEP (SIS Bypass)", "animated": True, "style": {"stroke": "#F59E0B", "strokeDasharray": "5,5"}}
        ]
    },
    "exfiltration": {
        "nodes": [
            {"id": "1", "position": {"x": 50, "y": 150}, "data": {"label": "Anomalous IP: 203.0.113.15 (RU)", "type": "External Threat", "risk": "Critical", "ip": "203.0.113.15"}},
            {"id": "2", "position": {"x": 350, "y": 150}, "data": {"label": "VPN-GW-01 [Impossible Travel]", "type": "Gateway", "risk": "High", "ip": "192.168.1.1"}},
            {"id": "3", "position": {"x": 700, "y": 150}, "data": {"label": "Compromised Account: m.taylor", "type": "User", "risk": "High", "technique": "T1078"}},
            {"id": "4", "position": {"x": 1050, "y": 150}, "data": {"label": "DNS Tunneling (TXT Queries)", "type": "Network Channel", "risk": "Critical", "technique": "T1071.004"}},
            {"id": "5", "position": {"x": 1400, "y": 150}, "data": {"label": "bad-domain-exfil.com (C2 Server)", "type": "External C2", "risk": "Critical", "status": "Exfiltration Target"}}
        ],
        "edges": [
            {"id": "e1-2", "source": "1", "target": "2", "label": "VPN_AUTH_TUNNEL", "animated": True, "style": {"stroke": "#EF4444"}},
            {"id": "e2-3", "source": "2", "target": "3", "label": "HIJACKED_SESSION", "animated": True, "style": {"stroke": "#F59E0B"}},
            {"id": "e3-4", "source": "3", "target": "4", "label": "SPAWNED_TUNNEL_SCRIPT", "animated": True, "style": {"stroke": "#38BDF8"}},
            {"id": "e4-5", "source": "4", "target": "5", "label": "EXFILTRATING_PAYLOAD", "animated": True, "style": {"stroke": "#EF4444", "strokeWidth": 2}}
        ]
    }
}

@router.get("/{incident_id}")
async def get_attack_graph(incident_id: str):
    inc_lower = incident_id.lower()
    if "scada" in inc_lower or "ot" in inc_lower:
        return SCENARIO_GRAPHS["scada"]
    elif "vpn" in inc_lower or "exfil" in inc_lower:
        return SCENARIO_GRAPHS["exfiltration"]
    return SCENARIO_GRAPHS["ransomware"]
