import pytest
from app.ml.anomaly_detector import anomaly_engine
from app.ml.graph_analyzer import graph_analyzer

def test_ml_anomaly_detector_benign_event():
    benign_event = {
        "timestamp": "2026-07-22T12:00:00",
        "hostname": "SRV-APP-02",
        "user_name": "j.smith",
        "process_command_line": "svchost.exe -k netsvcs",
        "destination_port": 80,
        "source_type": "Sysmon"
    }
    score, is_anomaly = anomaly_engine.predict_anomaly(benign_event)
    assert 0.0 <= score <= 1.0
    # Benign event should have low score
    assert score < 0.65
    assert not is_anomaly

def test_ml_anomaly_detector_malicious_override():
    malicious_event = {
        "timestamp": "2026-07-22T10:20:00",
        "hostname": "SRV-DC-01",
        "user_name": "administrator",
        "process_command_line": "vssadmin delete shadows /all /quiet",
        "destination_port": 445,
        "source_type": "Sysmon"
    }
    score, is_anomaly = anomaly_engine.predict_anomaly(malicious_event)
    assert score >= 0.95
    assert is_anomaly is True

def test_graph_analyzer_topology_generation():
    events = [
        {
            "id": "evt_1",
            "hostname": "WKSTN-FIN-08",
            "user_name": "j.smith",
            "source_ip": "192.168.1.50",
            "destination_ip": "198.51.100.42",
            "process_name": "WINWORD.EXE",
            "process_command_line": "WINWORD.EXE Invoice.docm",
            "is_anomaly": True
        },
        {
            "id": "evt_2",
            "hostname": "SRV-DC-01",
            "user_name": "administrator",
            "source_ip": "192.168.1.50",
            "destination_ip": "192.168.1.10",
            "process_name": "mimikatz.exe",
            "process_command_line": "mimikatz.exe privilege::debug",
            "is_anomaly": True
        }
    ]
    graph = graph_analyzer.build_attack_graph_for_incident(events)
    assert "nodes" in graph
    assert "edges" in graph
    assert len(graph["nodes"]) >= 2
    assert len(graph["edges"]) >= 2
    
    node_types = {n.get("type") for n in graph["nodes"]}
    assert "Device" in node_types or "User" in node_types or "Process" in node_types
