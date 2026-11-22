import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_soar_recommended_playbooks(client):
    res = client.get("/api/v1/response/playbooks")
    assert res.status_code == 200
    data = res.json()
    assert "playbook_name" in data
    assert "actions" in data

def test_soar_playbook_execution(client):
    req_payload = {
        "playbook_id": "isolate_host",
        "target": "SRV-DC-01 (192.168.1.10)",
        "parameters": {}
    }
    res = client.post("/api/v1/response/execute", json=req_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "Success"
    assert "execution" in data
    assert data["execution"]["target"] == "SRV-DC-01 (192.168.1.10)"

def test_soar_list_executions(client):
    res = client.get("/api/v1/response/executions")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1

def test_soar_report_data(client):
    res = client.get("/api/v1/response/report/data?incident_id=inc_ransomware_001")
    assert res.status_code == 200
    data = res.json()
    assert "incident_id" in data
    assert "threat_index" in data
    assert "ai_explanation" in data
    assert "mitre_mappings" in data

def test_soar_pdf_report_download(client):
    res = client.get("/api/v1/response/report/download?incident_id=inc_ransomware_001")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 1000
    # PDF files start with %PDF
    assert res.content.startswith(b"%PDF")
