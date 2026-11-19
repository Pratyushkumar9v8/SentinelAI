from datetime import datetime
from fastapi import APIRouter
from app.services.simulator_engine import simulator_engine
from app.agents.graph import run_agent_pipeline
from app.api.websockets.manager import ws_manager
from app.api.v1.incidents import MOCK_INCIDENTS

router = APIRouter()

@router.post("/run-scenario")
async def trigger_simulation_scenario(scenario: str = "ransomware", count: int = 1000):
    events = simulator_engine.generate_synthetic_events(count=count, scenario=scenario)
    anom_events = [e for e in events if e.get("is_anomaly")]
    
    # Run events through LangGraph Agent Mesh
    pipeline_result = run_agent_pipeline(anom_events)
    
    risk_score = pipeline_result.get("composite_risk_score", 95)
    predicted_next = pipeline_result.get("predicted_next_step", {})
    mitre_list = pipeline_result.get("mitre_mappings", [])
    agent_logs = pipeline_result.get("agent_logs", [])
    
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    
    # Map scenarios to incident metadata
    scenario_details = {
        "ransomware": {
            "id": f"inc_sim_ransomware_{datetime.utcnow().strftime('%H%M%S')}",
            "title": "Multi-Stage APT Ransomware Outbreak on Domain Controller",
            "summary": "Simulated multi-stage attack: Phishing execution -> Mimikatz LSASS memory dump -> Shadow Copy deletion.",
            "severity": "Critical",
            "root_cause_asset_id": "SRV-DC-01 (192.168.1.10)",
            "ai_explanation": "Agent mesh identified spearphishing payload execution on workstation followed by LSASS dumping and WMI lateral movement to the Primary Domain Controller.",
        },
        "exfiltration": {
            "id": f"inc_sim_exfil_{datetime.utcnow().strftime('%H%M%S')}",
            "title": "Compromised VPN Session & Covert DNS Data Tunneling",
            "summary": "Simulated impossible travel VPN authentication from anomalous geo-location followed by high-frequency DNS TXT tunneling.",
            "severity": "High",
            "root_cause_asset_id": "VPN-GW-01 (203.0.113.15)",
            "ai_explanation": "Agent mesh identified impossible travel anomaly for user m.taylor coupled with sub-second DNS TXT queries to bad-domain-exfil.com.",
        },
        "insider_ot": {
            "id": f"inc_sim_scada_{datetime.utcnow().strftime('%H%M%S')}",
            "title": "Unauthorized SCADA PLC Modbus Register Override in Water Subnet",
            "summary": "Simulated rogue insider dispatching direct Modbus function code 0x06 write commands to municipal water dosing PLCs.",
            "severity": "Critical",
            "root_cause_asset_id": "HMI-WATER-PUMP-01 (10.0.4.12)",
            "ai_explanation": "Agent mesh detected off-hours Modbus single register override without standard HMI operator authorization tokens.",
        }
    }
    
    meta = scenario_details.get(scenario, scenario_details["ransomware"])
    
    new_incident = {
        "id": meta["id"],
        "title": meta["title"],
        "summary": meta["summary"],
        "severity": meta["severity"],
        "status": "In Progress",
        "risk_score": risk_score,
        "assigned_to": "analyst@sentinel.cni.gov",
        "root_cause_asset_id": meta["root_cause_asset_id"],
        "ai_explanation": meta["ai_explanation"],
        "predicted_next_step": predicted_next.get("predicted_next_step", "Data Encrypted for Impact & Lateral movement"),
        "prediction_confidence": predicted_next.get("confidence", 0.94),
        "created_at": timestamp,
        "updated_at": timestamp,
        "mitre_mappings": mitre_list if mitre_list else [
            {"id": "m1", "tactic": "Execution", "technique_id": "T1059", "technique_name": "Command and Scripting Interpreter", "confidence": 0.95, "observed_at": timestamp}
        ],
        "responses": [
            {
                "id": "r_sim_01",
                "action_type": "Isolate Endpoint",
                "target": meta["root_cause_asset_id"],
                "status": "Success",
                "executed_by": "Autonomous SOAR Agent",
                "executed_at": timestamp,
                "output_log": f"Quarantine policy enacted for {meta['root_cause_asset_id']}."
            }
        ]
    }
    
    # Prepend to MOCK_INCIDENTS
    MOCK_INCIDENTS.insert(0, new_incident)
    
    # Broadcast to WebSockets
    await ws_manager.broadcast({
        "type": "SIMULATION_TRIGGERED",
        "scenario": scenario,
        "incident": new_incident,
        "threat_score": risk_score,
        "anomalies_count": len(anom_events),
        "timestamp": timestamp
    })
    
    return {
        "status": "success",
        "scenario": scenario,
        "incident_id": new_incident["id"],
        "total_generated_events": len(events),
        "anomalous_events_detected": len(anom_events),
        "composite_risk_score": risk_score,
        "predicted_next_step": predicted_next,
        "mitre_mappings": mitre_list,
        "agent_logs": agent_logs
    }
