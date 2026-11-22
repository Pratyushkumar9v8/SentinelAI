import numpy as np
from sklearn.ensemble import IsolationForest
import logging

logger = logging.getLogger(__name__)

class AnomalyDetectorEngine:
    def __init__(self):
        # Initialize Isolation Forest with 100 estimators
        self.clf = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
        
        # Fit on realistic enterprise baseline telemetry distribution:
        # [hour (0-23), cmd_length (5-120), is_admin (0/1), is_rare_port (0/1), is_ot (0/1)]
        np.random.seed(42)
        n_samples = 400
        hours = np.random.normal(13.0, 3.0, n_samples).clip(0, 23)
        cmd_lens = np.random.normal(35.0, 15.0, n_samples).clip(5, 120)
        is_admin = np.random.choice([0.0, 1.0], size=n_samples, p=[0.9, 0.1])
        is_rare = np.random.choice([0.0, 1.0], size=n_samples, p=[0.95, 0.05])
        is_ot = np.random.choice([0.0, 1.0], size=n_samples, p=[0.95, 0.05])
        baseline = np.column_stack([hours, cmd_lens, is_admin, is_rare, is_ot])
        
        self.clf.fit(baseline)

    def extract_features(self, event_data: dict) -> np.ndarray:
        """
        Extract numerical features from event payload:
        [hour_of_day, command_length, is_admin_user, is_rare_port, is_ot_event]
        """
        timestamp = event_data.get("timestamp")
        hour = 12.0
        if hasattr(timestamp, "hour"):
            hour = float(timestamp.hour)
        elif isinstance(timestamp, str) and "T" in timestamp:
            try:
                hour = float(timestamp.split("T")[1].split(":")[0])
            except Exception:
                hour = 12.0

        cmd = event_data.get("process_command_line", "") or ""
        cmd_len = float(len(cmd))

        user = str(event_data.get("user_name", "")).lower()
        is_admin = 1.0 if any(k in user for k in ["admin", "root", "system", "administrator"]) else 0.0

        dest_port = event_data.get("destination_port") or 80
        is_rare_port = 1.0 if dest_port not in [80, 443, 53, 22, 135, 445] else 0.0

        source_type = str(event_data.get("source_type", ""))
        is_ot = 1.0 if "OT" in source_type or "Modbus" in source_type else 0.0

        return np.array([[hour, cmd_len, is_admin, is_rare_port, is_ot]])

    def predict_anomaly(self, event_data: dict) -> tuple[float, bool]:
        """
        Returns (anomaly_score [0.0 to 1.0], is_anomaly [True/False])
        Calculated using Isolation Forest decision function mapped via sigmoid.
        """
        features = self.extract_features(event_data)
        dec_score = float(self.clf.decision_function(features)[0])
        
        # Logistic sigmoid normalization of decision function:
        # Inliers (positive decision score) map to ~0.02 - 0.25
        # Outliers (negative decision score) map to > 0.65
        normalized_score = float(1.0 / (1.0 + np.exp(dec_score * 12.0)))
        
        # Override heuristics for known dangerous patterns
        cmd = str(event_data.get("process_command_line", "")).lower()
        if any(term in cmd for term in ["vssadmin delete", "mimikatz", "downloadstring", "nc -e", "modbus_write_single_register"]):
            normalized_score = max(normalized_score, 0.95)

        is_anomaly = normalized_score > 0.65
        return round(normalized_score, 4), is_anomaly

anomaly_engine = AnomalyDetectorEngine()
