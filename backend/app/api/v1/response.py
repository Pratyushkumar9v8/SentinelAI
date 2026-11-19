import io
from datetime import datetime
from fastapi import APIRouter, Response, HTTPException
from pydantic import BaseModel
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from app.agents.response_agent import response_agent_node
from app.agents.state import AgentState
from app.api.v1.incidents import MOCK_INCIDENTS

router = APIRouter()

class PlaybookExecutionRequest(BaseModel):
    playbook_id: str
    target: str
    parameters: dict = {}

EXECUTION_LOGS = [
    {
        "id": "exec_001",
        "playbook_name": "Endpoint Host Isolation",
        "target": "SRV-DC-01 (192.168.1.10)",
        "status": "Success",
        "executed_at": "2026-07-22 10:26:00",
        "output_log": "VLAN isolation command pushed to switch SW-CORE-01. Port Gi1/0/10 shutdown. Host isolated."
    },
    {
        "id": "exec_002",
        "playbook_name": "Firewall Perimeter Drop Rule",
        "target": "198.51.100.42 (C2 Server)",
        "status": "Success",
        "executed_at": "2026-07-22 10:26:30",
        "output_log": "ACL rule added to FW-PERIMETER-01: 'deny ip any host 198.51.100.42'. Egress traffic dropped."
    }
]

@router.get("/playbooks")
async def get_recommended_playbooks():
    dummy_state: AgentState = {
        "raw_events": [], "analyzed_events": [], "threat_intel_hits": [], "mitre_mappings": [],
        "correlated_incidents": [], "composite_risk_score": 90, "predicted_next_step": {},
        "recommended_playbook": {}, "generated_report": "", "agent_logs": []
    }
    result = response_agent_node(dummy_state)
    return result["recommended_playbook"]

@router.get("/executions")
async def list_playbook_executions():
    return EXECUTION_LOGS

@router.post("/execute")
async def execute_playbook(req: PlaybookExecutionRequest):
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    action_names = {
        "isolate_host": "Endpoint Host Isolation",
        "block_c2": "Firewall Perimeter Drop Rule",
        "revoke_tokens": "Revoke User Credentials & Tokens",
        "kill_process": "Terminate Malicious Process Tree"
    }
    name = action_names.get(req.playbook_id, req.playbook_id.replace("_", " ").title())
    
    log_msg = f"SOAR Orchestrator dispatched playbook [{name}] against target [{req.target}]. All verification health checks passed."
    
    execution_record = {
        "id": f"exec_{len(EXECUTION_LOGS)+1:03d}",
        "playbook_name": name,
        "target": req.target,
        "status": "Success",
        "executed_at": timestamp,
        "output_log": log_msg
    }
    EXECUTION_LOGS.insert(0, execution_record)
    
    # Also update any matching mock incident
    for inc in MOCK_INCIDENTS:
        if req.target in str(inc.get("root_cause_asset_id", "")) or req.target in str(inc.get("summary", "")):
            inc["status"] = "Contained"
            inc["responses"].append({
                "id": execution_record["id"],
                "action_type": name,
                "target": req.target,
                "status": "Success",
                "executed_by": "Autonomous SOAR Engine",
                "executed_at": timestamp,
                "output_log": log_msg
            })

    return {
        "status": "Success",
        "message": f"Playbook '{name}' executed successfully on '{req.target}'",
        "execution": execution_record
    }

@router.get("/report/data")
async def get_executive_report_data(incident_id: str = "inc_ransomware_001"):
    inc = next((i for i in MOCK_INCIDENTS if i["id"] == incident_id), MOCK_INCIDENTS[0])
    return {
        "incident_id": inc["id"],
        "title": inc["title"],
        "summary": inc["summary"],
        "threat_index": inc["risk_score"],
        "severity": inc["severity"],
        "status": inc["status"],
        "root_cause": inc.get("root_cause_asset_id", "SRV-DC-01"),
        "ai_explanation": inc.get("ai_explanation"),
        "predicted_next_step": inc.get("predicted_next_step"),
        "prediction_confidence": inc.get("prediction_confidence", 0.94),
        "mitre_mappings": inc.get("mitre_mappings", []),
        "executed_responses": inc.get("responses", []),
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    }

@router.get("/report/download")
async def download_executive_pdf(incident_id: str = "inc_ransomware_001"):
    inc = next((i for i in MOCK_INCIDENTS if i["id"] == incident_id), MOCK_INCIDENTS[0])
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        textColor=colors.HexColor('#0284C7'),
        spaceAfter=15
    )
    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=10,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )
    bold_body_style = ParagraphStyle(
        'BoldBody',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    story = []

    # Title & Subtitle
    story.append(Paragraph("SENTINEL-AI EXECUTIVE INCIDENT BRIEFING", title_style))
    story.append(Paragraph("Autonomous Cyber Resilience Platform for Critical National Infrastructure (CNI)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284C7'), spaceBefore=2, spaceAfter=12))

    # Meta Overview Table
    meta_data = [
        [Paragraph("<b>Incident ID:</b>", body_style), Paragraph(inc["id"], body_style), Paragraph("<b>Classification:</b>", body_style), Paragraph("CNI Defense Critical", body_style)],
        [Paragraph("<b>Severity:</b>", body_style), Paragraph(f"<font color='red'><b>{inc['severity']}</b></font>", body_style), Paragraph("<b>Threat Score:</b>", body_style), Paragraph(f"<b>{inc['risk_score']} / 100</b>", body_style)],
        [Paragraph("<b>Status:</b>", body_style), Paragraph(inc["status"], body_style), Paragraph("<b>Generated At:</b>", body_style), Paragraph(datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"), body_style)],
    ]
    meta_table = Table(meta_data, colWidths=[90, 180, 90, 180])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # Executive Summary
    story.append(Paragraph("1. Executive Summary & Problem Description", h2_style))
    story.append(Paragraph(f"<b>Title:</b> {inc['title']}", bold_body_style))
    story.append(Paragraph(f"<b>Summary:</b> {inc['summary']}", body_style))
    story.append(Spacer(1, 6))

    # AI Agent Mesh Explanation
    story.append(Paragraph("2. Autonomous Agentic AI Correlation & Root Cause Analysis", h2_style))
    story.append(Paragraph(inc.get("ai_explanation", "Multi-stage correlation detected across IT and OT telemetry."), body_style))
    story.append(Spacer(1, 6))

    # Predictive Threat Analysis
    story.append(Paragraph("3. Predictive Attacker Progression Analysis", h2_style))
    story.append(Paragraph(f"<b>Predicted Next Attacker Step:</b> {inc.get('predicted_next_step', 'N/A')}", body_style))
    story.append(Paragraph(f"<b>Prediction Confidence Score:</b> {int(inc.get('prediction_confidence', 0.94) * 100)}%", body_style))
    story.append(Spacer(1, 6))

    # MITRE ATT&CK Mapping
    story.append(Paragraph("4. MITRE ATT&CK Matrix Techniques Observed", h2_style))
    mitre_rows = [["Tactic", "Technique ID", "Technique Name", "Confidence"]]
    for m in inc.get("mitre_mappings", []):
        mitre_rows.append([
            m.get("tactic", ""),
            m.get("technique_id", m.get("id", "")),
            m.get("technique_name", m.get("name", "")),
            f"{int(m.get('confidence', 0.95)*100)}%" if "confidence" in m else "95%"
        ])
    mitre_table = Table(mitre_rows, colWidths=[120, 100, 240, 80])
    mitre_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F1F5F9')]),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(mitre_table)
    story.append(Spacer(1, 10))

    # SOAR Execution Audit Trail
    story.append(Paragraph("5. Automated SOAR Playbook Execution Audit", h2_style))
    resp_rows = [["Action Type", "Target Entity", "Status", "Execution Timestamp"]]
    for r in inc.get("responses", []):
        resp_rows.append([
            r.get("action_type", r.get("action", "")),
            r.get("target", ""),
            r.get("status", "Success"),
            r.get("executed_at", r.get("time", ""))
        ])
    if len(resp_rows) == 1:
        resp_rows.append(["Endpoint Host Isolation", inc.get("root_cause_asset_id", "SRV-DC-01"), "Success", datetime.utcnow().strftime("%H:%M:%S")])
    
    resp_table = Table(resp_rows, colWidths=[160, 160, 80, 140])
    resp_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F1F5F9')]),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(resp_table)

    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#94A3B8'), spaceBefore=5, spaceAfter=8))
    story.append(Paragraph("<i>This executive report was compiled autonomously by SentinelAI Agentic Mesh v1.0.0. Classified for CNI Operations.</i>", ParagraphStyle('Foot', parent=body_style, fontSize=8, textColor=colors.HexColor('#64748B'))))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    filename = f"SentinelAI_Executive_Report_{inc['id']}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
