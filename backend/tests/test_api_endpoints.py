import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert "SentinelAI" in data["system"]

def test_dashboard_metrics(client):
    res = client.get("/api/v1/dashboard/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "threat_score" in data
    assert "mttd_minutes" in data
    assert "mttr_minutes" in data
    assert data["threat_score"] >= 0

def test_dashboard_timeline(client):
    res = client.get("/api/v1/dashboard/timeline")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "anomalies" in data[0]

def test_dashboard_heatmap(client):
    res = client.get("/api/v1/dashboard/heatmap")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert any(zone["status"] == "Critical" for zone in data)

def test_incidents_list(client):
    res = client.get("/api/v1/incidents")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "title" in data[0]
    assert "risk_score" in data[0]

def test_incident_detail(client):
    res = client.get("/api/v1/incidents/inc_ransomware_001")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "inc_ransomware_001"
    assert "mitre_mappings" in data
    assert len(data["mitre_mappings"]) > 0

def test_trigger_incident_action(client):
    res = client.post(
        "/api/v1/incidents/inc_ransomware_001/trigger-action?action=Isolate%20Host&target=SRV-DC-01"
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "SRV-DC-01" in data["message"]

def test_mitre_matrix(client):
    res = client.get("/api/v1/mitre/matrix")
    assert res.status_code == 200
    data = res.json()
    assert "tactics" in data
    assert "matrix" in data
    assert "Initial Access" in data["matrix"]

def test_threat_intel_iocs(client):
    res = client.get("/api/v1/threat-intel/iocs")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert any("198.51.100.42" in (item.get("ioc_value") or item.get("value", "")) for item in data)

def test_threat_intel_lookup_malicious(client):
    res = client.get("/api/v1/threat-intel/lookup/198.51.100.42")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "MALICIOUS"
    assert "APT29" in data["details"]["actor"]

def test_threat_intel_lookup_clean(client):
    res = client.get("/api/v1/threat-intel/lookup/8.8.8.8")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "CLEAN"

def test_attack_graph_scenarios(client):
    for scenario in ["ransomware", "scada", "exfiltration"]:
        res = client.get(f"/api/v1/attack-graph/{scenario}")
        assert res.status_code == 200
        data = res.json()
        assert "nodes" in data
        assert "edges" in data
        assert len(data["nodes"]) >= 4

def test_assets_list(client):
    res = client.get("/api/v1/assets")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 5
    assert any(a.get("environment") == "OT" for a in data)

def test_uba_anomalies(client):
    res = client.get("/api/v1/uba/anomalies")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert any("Impossible Travel" in a.get("anomaly_type", "") for a in data)

def test_copilot_chat(client):
    res = client.post(
        "/api/v1/copilot/chat",
        json={"message": "Explain ransomware outbreak and mitigation"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "response" in data
    assert "sources" in data
    assert len(data["sources"]) > 0

def test_analytics_summary(client):
    res = client.get("/api/v1/analytics/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["detection_accuracy"] >= 90.0
    assert data["mttd_minutes"] <= 5.0
    assert len(data["top_attack_vectors"]) >= 3
