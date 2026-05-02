# 🌍 Video Analytics Platform — Visual & Data API Specification (Final)

> **FOR BACKEND & EDGE TEAMS**: This spec covers 100% of the UI data needs. 
> All JSON shapes must match exactly to populate the Enterprise Dashboard, Intelligence Hub, and Video Canvas.

---

## 🚀 1. SYSTEM-WIDE ORCHESTRATION

### A. Global Status Aggregates
**Endpoint:** `GET /api/system/overview`
*Used for: Dashboard top cards.*
```json
{
  "total_cameras": 100,
  "active_streams": 98,
  "incident_rate_today": "High",
  "global_footfall_24h": 12500,
  "global_vehicle_count_24h": 8450
}
```

### B. Camera Explorer & GIS Map
**Endpoint:** `GET /api/cameras`
*Used for: Camera list, Map markers, and HLS Stream initialization.*
```json
{
  "cameras": [
    {
      "camera_id": "CAM_01",
      "name": "North Gate Entry",
      "location": { "lat": 28.61, "lng": 77.20, "zone": "Zone Alpha" },
      "hls_url": "http://edge-server:8080/hls/cam01/index.m3u8",
      "status": "active",
      "enabled_suites": ["traffic", "people"],
      "sub_modules": ["wrong_way", "illegal_parking", "people_count"]
    }
  ]
}
```

---

## 🔳 2. VISUAL INTELLIGENCE (The Detection Canvas)

### A. Live Object Bounding Boxes
**Endpoint:** `GET /api/cameras/{id}/detections/{usecase}`
*Used for: Drawing real-time boxes on the `<video>` canvas. Normalized coordinates.*
```json
{
  "timestamp": "ISO8601",
  "camera_id": "CAM_01",
  "objects": [
    {
      "id": "track_101",
      "label": "car",
      "confidence": 0.96,
      "bbox": { "x": 120, "y": 200, "width": 80, "height": 60 },
      "metadata": { "plate": "ABC-123", "speed": 85 } 
    }
  ]
}
```

---

## 🧠 3. INTELLIGENCE SUITES & SUB-MODULES

### A. Traffic & Parking Intelligence
**Endpoint:** `GET /api/analytics/traffic/{id}?module={sub_module}`
*Used for: Universal Analytics Hub cards and detection logs.*

**Requested Response Format:**
```json
{
  "module": "illegal_parking",
  "live_metrics": { "current_violations": 5, "avg_duration_mins": 12 },
  "event_log": [
    {
      "track_id": "V-99",
      "highlight": "15m duration",
      "reason": "Fire Hydrant Blocked",
      "location": "Loading Bay A",
      "plate": "XYZ-900",
      "timestamp": "ISO8601"
    }
  ]
}
```

### B. People & Safety Intelligence
**Endpoint:** `GET /api/analytics/people/{id}?module={sub_module}`
*Used for: People Counting, Crowd Alert, Intrusion.*
```json
{
  "module": "people_count",
  "metrics": { "total_in": 450, "total_out": 420, "current_occupancy": 30 },
  "status": "warning"
}
```

---

## 🚨 4. GLOBAL INCIDENT FEED

### A. Real-Time Alert Stream
**Endpoint:** `GET /api/alerts/live`
*Used for: Dashboard top banners and sidebars.*
```json
[
  {
    "id": "ALERT_123",
    "camera_name": "Gate 1",
    "severity": "critical",
    "type": "wrong_way",
    "message": "Vehicle driving against flow at Exit A",
    "timestamp": "ISO8601",
    "thumbnail_url": "/api/alerts/thumbs/123.jpg"
  }
]
```

---

## 📊 5. ANALYTICS & REPORT GENERATION

### A. Historical Report API
**Endpoint:** `GET /api/reports/query`
**Query Params:** `?camera_id=CAM_01&usecase=traffic&start=2024-03-01&end=2024-03-07`

**Response Output:**
```json
{
  "summary": { "total_events": 8450, "peak_hour": "14:00", "violation_rate": "12%" },
  "chart_data": [
    { "time": "Mon", "count": 1200 },
    { "time": "Tue", "count": 1450 }
  ]
}
```

---

## 🛠️ 6. CONFIGURATION ENGINE

### A. Apply AI Settings to Camera
**Endpoint:** `POST /api/cameras/{id}/configure`
**Body:**
```json
{
  "enable_main_suite": "traffic",
  "active_sub_models": ["wrong_way", "speeding", "vehicle_count", "congestion"],
  "detection_threshold": 0.5
}
```

---

## 🏁 TECHNICAL REQUIREMENT CHECKS:
*   [X] **Canvas Integration**: Bounding Box JSON with `x, y, w, h` included.
*   [X] **HLS Streaming**: `hls_url` included in camera discovery.
*   [X] **Mini-Canvas**: Uses the standard `detections` endpoint for fast polling.
*   [X] **Dynamic Details**: `reason` and `location` fields included for illegal parking/wrong way.
*   [X] **Dashboard Power**: Global aggregate endpoint included.
*   [X] **Reports Section**: Time-series chart data API defined.

> **Architecture Note**: Frontend uses a **Mock-to-Real Strategy**. If you deploy endpoints matching these JSON shapes, the UI will instantly switch from simulated data to live production analysis.
