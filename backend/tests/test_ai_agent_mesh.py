import pytest
from app.services.simulator_engine import simulator_engine
from app.agents.graph import run_agent_pipeline
from app.agents.behavior_agent import behavior_agent_node
from app.agents.threat_intel_agent import threat_intel_agent_node
from app.agents.mitre_agent import mitre_agent_node
from app.agents.correlation_agent import correlation_agent_node
from app.agents.risk_agent import risk_agent_node
from app.agents.prediction_agent import prediction_agent_node
from app.agents.response_agent import response_agent_node
from app.agents.report_agent import report_agent_node
from app.agents.state import AgentState

def test_simulator_generates_baseline_and_attack():
    events = simulator_engine.generate_synthetic_events(count=50, scenario="ransomware")
    assert len(events) >= 50
    anomalies = [e for e in events if e.get("is_anomaly")]
    assert len(anomalies) >= 1
    # Check event fields
    sample = events[0]
    assert "timestamp" in sample
    assert "hostname" in sample
    assert "source_type" in sample

def test_langgraph_full_pipeline_execution():
    events = simulator_engine.generate_synthetic_events(count=20, scenario="ransomware")
    anom_events = [e for e in events if e.get("is_anomaly")]
    assert len(anom_events) > 0

    state: AgentState = run_agent_pipeline(anom_events)
    
    # 1. Behavior node analyzed
    assert len(state["analyzed_events"]) == len(anom_events)
    
    # 2. Threat Intel node flagged hits
    assert isinstance(state["threat_intel_hits"], list)
    
    # 3. MITRE mapping node populated techniques
    assert len(state["mitre_mappings"]) > 0
    assert any("T10" in str(m.get("technique_id", "")) for m in state["mitre_mappings"])
    
    # 4. Correlation node grouped into incident
    assert len(state["correlated_incidents"]) >= 1
    
    # 5. Composite Risk score computed
    assert state["composite_risk_score"] >= 70
    
    # 6. Attacker Next Step predicted
    assert "predicted_next_step" in state["predicted_next_step"]
    assert state["predicted_next_step"]["confidence"] > 0.5
    
    # 7. Recommended Playbooks generated
    assert "playbook_name" in state["recommended_playbook"]
    assert "actions" in state["recommended_playbook"]
    
    # 8. Executive Report generated
    assert "# SENTINEL-AI EXECUTIVE INCIDENT BRIEFING" in state["generated_report"]
    
    # 9. Agent audit trail logged
    assert len(state["agent_logs"]) >= 8

def test_behavior_agent_standalone():
    raw_events = [
        {
            "id": "evt_test_1",
            "hostname": "SRV-DC-01",
            "process_command_line": "mimikatz.exe privilege::debug sekurlsa::logonpasswords",
            "source_type": "Sysmon",
            "is_anomaly": True
        }
    ]
    state: AgentState = {
        "raw_events": raw_events,
        "analyzed_events": [],
        "threat_intel_hits": [],
        "mitre_mappings": [],
        "correlated_incidents": [],
        "composite_risk_score": 0,
        "predicted_next_step": {},
        "recommended_playbook": {},
        "generated_report": "",
        "agent_logs": []
    }
    result = behavior_agent_node(state)
    assert len(result["analyzed_events"]) == 1
    assert any("BehaviorAgent" in log for log in result["agent_logs"])

def test_threat_intel_agent_standalone():
    analyzed = [
        {"id": "evt_1", "destination_ip": "198.51.100.42", "hostname": "SRV-DC-01"}
    ]
    state: AgentState = {
        "raw_events": [],
        "analyzed_events": analyzed,
        "threat_intel_hits": [],
        "mitre_mappings": [],
        "correlated_incidents": [],
        "composite_risk_score": 0,
        "predicted_next_step": {},
        "recommended_playbook": {},
        "generated_report": "",
        "agent_logs": []
    }
    result = threat_intel_agent_node(state)
    assert len(result["threat_intel_hits"]) >= 1
    assert result["threat_intel_hits"][0]["threat_actor"] == "APT29 (Cozy Bear)"
