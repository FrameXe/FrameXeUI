# 💎 Video Analytics Platform — Complete Enterprise API Contract (v3.0)

> This document is the **Single Source of Truth** for the Full-System Backend.
> It defines the exact JSON structure for every component in our high-end UI.

---

## 🏛️ 1. GLOBAL DASHBOARD (Landing Page)
**Endpoint:** `GET /api/dashboard/overview`

Populates the main metrics cards on the home screen.

**Response:**
```json
{
  "total_cameras": { "count": 125, "active": 122, "offline": 3 },
  "global_metrics": {
    "vehicle_flow_today": 8450,
    "people_count_today": 12500,
    "active_alerts_critical": 5
  },
  "alert_distribution": {
    "traffic": 45,
    "intrusion": 12,
    "crowd": 8
  }
}
```

---

## 🎥 2. CAMERA ORCHESTRATION & MANAGEMENT
### A. Camera Inventory & Edge URLs
**Endpoint:** `GET /api/cameras`

Required for the **Camera Explorer** and **GIS Map**.
*`enabled_usecases` dictates which AI features appear in the Detail Hub.*

```json
{
  "cameras": [
    {
      "camera_id": "CAM-01",
      "name": "North Entry Gate",
      "hls_url": "http://edge-server/hls/cam01.m3u8",
      "status": "active",
      "location": { "lat": 28.6, "lng": 77.2, "name": "Zone Alpha" },
      "enabled_usecases": ["traffic", "wrong_way", "illegal_parking", "vehicle_count", "people_count"]
    }
  ]
}
```

### B. Use Case Configuration
**Endpoint:** `POST /api/cameras/{id}/config`
**Body:**
```json
{
  "main_suite": "traffic",
  "sub_modules": ["wrong_way", "speeding", "congestion"]
}
```

---

## 🧠 3. INTELLIGENCE DETAIL API (Universal Hub)
Every camera detail page polls these based on its active modules.

### A. Traffic Intelligence Suite
**Endpoint:** `GET /api/cameras/{id}/traffic/{sub_module}`
*Used for: `wrong_way`, `illegal_parking`, `speeding`, `vehicle_count`, `congestion`, `parking_mgmt`.*

**Common JSON Response Shape:**
```json
{
  "timestamp": "ISO8601",
  "metrics": {
    "primary_value": 45.2,
    "secondary_value": 12,
    "unit": "km/h"
  },
  "live_events": [
    {
      "track_id": "T-101",
      "classification": "car",
      "highlight": "95 km/h",
      "reason": "Emergency Lane Breach",
      "location": "Main Ramp B",
      "plate_number": "ABC-123",
      "is_violation": true
    }
  ]
}
```

### B. People & Safety Suite
**Endpoint:** `GET /api/cameras/{id}/people/analytics`
*Used for: `people_count`, `crowd_alert`, `intrusion`.*

```json
{
  "people_analytics": {
    "current_frame_count": 12,
    "total_in": 780,
    "total_out": 745,
    "capacity_status": "warning"
  },
  "violation_log": [
    {
      "id": "INT-99",
      "type": "intrusion",
      "message": "Unauthorized entry in Zone C",
      "timestamp": "ISO8601"
    }
  ]
}
```

---

## 🚨 4. GLOBAL INCIDENT CENTER
### A. Incident Feed
**Endpoint:** `GET /api/alerts/feed`
**Query:** `?severity=critical&acknowledged=false`

Populates the real-time alert banners and center sidebar.

```json
[
  {
    "id": "AL-55",
    "camera_id": "CAM-01",
    "camera_name": "Gate 1",
    "message": "Wrong Way Detected",
    "severity": "critical",
    "timestamp": "ISO8601",
    "thumbnail_url": "/api/alerts/AL-55/image.jpg"
  }
]
```

### B. Alert Intervention
**Endpoint:** `PATCH /api/alerts/{id}/ack`
**Body:** `{ "user": "operator_1", "notes": "Dispatched security" }`

---

## 📊 5. OPERATIONAL REPORTING (Time-Series)
**Endpoint:** `GET /api/reports/analytics`

Populates the charts in the **Reports Section**.

```json
{
  "summary": { "total": 1240, "peak": 62, "avg": 35 },
  "timeline": [
    { "time": "08:00", "vehicle_count": 45, "people_count": 120 },
    { "time": "09:00", "vehicle_count": 88, "people_count": 210 }
  ]
}
```

---

## 🔗 6. TECHNICAL SPECIFICATIONS
*   **Polling Interval**: 2500ms (Max latency recommended).
*   **Protocol**: REST over HTTPS.
*   **Video Delivery**: Low-latency HLS (LL-HLS) preferred.
*   **Encodings**: All timestamps in **UTC (ISO 8601)**.
*   **Bounding Boxes**: `[x, y, w, h]` normalized to video resolution.

> **Final Note**: If the backend sends an empty array for `live_events`, the UI will automatically enter **Observation Mode** (Live Analysis icon spinning). 
