import asyncio
import random
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.api.websockets.manager import ws_manager

router = APIRouter()

TELEMETRY_SAMPLES = [
    {"source_type": "Sysmon", "hostname": "SRV-DC-01", "desc": "Process injection detected into lsass.exe via NtWriteVirtualMemory (T1003.001)", "score": 0.98, "is_anomaly": True},
    {"source_type": "OT_Modbus", "hostname": "HMI-WATER-PUMP-01", "desc": "Modbus Function 0x06 single register override on PLC-CHEM-02 (T0855)", "score": 0.96, "is_anomaly": True},
    {"source_type": "Sysmon", "hostname": "WKSTN-FIN-08", "desc": "Obfuscated PowerShell -enc download invocation from Word document macro", "score": 0.92, "is_anomaly": True},
    {"source_type": "VPN", "hostname": "VPN-GW-01", "desc": "Impossible travel authentication for account m.taylor (Geo-IP: Moscow, RU)", "score": 0.88, "is_anomaly": True},
    {"source_type": "DNS", "hostname": "FW-PERIMETER-01", "desc": "High frequency TXT query burst to anomalous domain bad-domain-exfil.com", "score": 0.85, "is_anomaly": True},
    {"source_type": "Firewall", "hostname": "FW-PERIMETER-01", "desc": "Standard HTTPS TLS 1.3 egress stream to Microsoft CDN", "score": 0.12, "is_anomaly": False},
    {"source_type": "Sysmon", "hostname": "SRV-APP-02", "desc": "Routine scheduled task invocation svchost.exe -k netsvcs", "score": 0.08, "is_anomaly": False},
    {"source_type": "LinuxAudit", "hostname": "SRV-APP-02", "desc": "cron job execution /usr/sbin/logrotate /etc/logrotate.conf", "score": 0.05, "is_anomaly": False},
    {"source_type": "Auth", "hostname": "SRV-DC-01", "desc": "Kerberos TGT ticket requested for account j.smith (Event ID 4768)", "score": 0.15, "is_anomaly": False}
]

@router.websocket("/ws/live-stream")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(2.5)
            sample = random.choice(TELEMETRY_SAMPLES)
            now_str = datetime.utcnow().strftime("%H:%M:%S")
            live_event = {
                "type": "LIVE_TELEMETRY",
                "timestamp": now_str,
                "time": now_str,
                "source_type": sample["source_type"],
                "type_name": sample["source_type"],
                "hostname": sample["hostname"],
                "host": sample["hostname"],
                "desc": sample["desc"],
                "anomaly_score": sample["score"],
                "score": sample["score"],
                "is_anomaly": sample["is_anomaly"]
            }
            await ws_manager.broadcast(live_event)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
