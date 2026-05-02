# 👑 Video Analytics Platform — Ultimate Master API Specification (v5.0)

> **FOR FULL-STACK IMPLEMENTATION**: This document contains the final, audited schemas extracted directly from the UI page logic (`src/pages/*.jsx`). It explains exactly what each endpoint does and its role in the user interface.

---

## 🛰️ 1. GLOBAL INFRASTRUCTURE (Dashboard & Discovery)

### A. System Health & Aggregates
**Endpoint:** `GET /api/system/overview`  
**What it does:** Returns high-level system metrics (Total counts across all nodes).  
**Role in UI:** Powers the "Big Number" cards on the main Dashboard landing page.

```json
{
  "total_cameras": 100,
  "active_streams": 98,
  "incident_rate": "High",
  "global_metrics": {
    "people_flow_24h": 12500,
    "vehicle_flow_24h": 8450
  }
}
```

### B. Camera Inventory (Explorer & Map)
**Endpoint:** `GET /api/cameras`  
**What it does:** The primary source for all camera locations and stream URLs.  
**Role in UI:** Powers the **GIS Map**, the **Camera Explorer** grid, and defines which AI modules are active on each node.

```json
{
  "cameras": [
    {
      "camera_id": "CAM_01",
      "status": "active",
      "location_id": "North Zone",
      "latitude": 28.61,
      "longitude": 77.20,
      "hls_url": "http://edge/hls/cam01/index.m3u8",
      "enabled_usecases": ["traffic", "wrong_way", "illegal_parking"],
      "alert_count": 5
    }
  ]
}
```

---

## 🛣️ 2. TRAFFIC INTELLIGENCE SUITE
**Endpoint:** `GET /api/analytics/traffic/{id}` (or specialized sub-endpoints)  
**What it does:** Fetches detailed behavioral analytics from the traffic edge models.  
**Role in UI:** Drives the **Universal Analytics Hub** telemetry cards and the **Detection Log** table.

### A. Congestion Metrics
**UI Role:** Populates the "Network Congestion" card (High/Low levels).
```json
{
  "congestion_level": "high",
  "vehicle_count": 45,
  "average_speed": 12.5,
  "timestamp": "ISO8601"
}
```

### B. Illegal Parking & Wrong Way
**UI Role:** Adds forensic details like "Reason" and "Location" to the Incident logs.
```json
{
  "events": [
    {
      "track_id": "P-101",
      "plate_number": "ABC-1234",
      "parked_duration_seconds": 450,
      "reason": "Fire Hydrant Blocked",
      "location": "Main Ramp B",
      "vehicle_type": "truck",
      "timestamp": "ISO8601"
    }
  ]
}
```

### C. Speeding & Velocity
**UI Role:** Populates the "Velocity Metrics" card (Avg/Peak speed).
```json
{
  "statistics": { "average_speed": 42.5, "highest_speed": 98.2 },
  "events": [
    { "track_id": "S-99", "speed_kmh": 105, "is_violation": true, "vehicle_type": "car" }
  ]
}
```

### D. Vehicle Flow (IN/OUT)
**UI Role:** Populates the Inflow/Outflow throughput cards.
```json
{
  "counts": { "IN": 452, "OUT": 389 },
  "timestamp": "ISO8601"
}
```

---

## 👥 3. PEOPLE & SAFETY SUITE
**Endpoint:** `GET /api/analytics/people/{id}`  
**What it does:** Returns specialized footfall and occupancy counting data.  
**Role in UI:** Powers the **People Count Details** page and the **In Frame Now** dynamic counter.

### A. Footfall & Capacity
```json
{
  "metrics": {
    "total": 1200,
    "count_in": 750,
    "count_out": 450,
    "current_frame_count": 18
  },
  "detections": [
    { "id": "P-44", "direction": "in", "crossed_line": true, "confidence": 0.98 }
  ]
}
```

---

## 🚨 4. GLOBAL INCIDENT CENTER
**Endpoint:** `GET /api/alerts/live`  
**What it does:** A real-time stream of all security violations across the platform.  
**Role in UI:** Populates the **Safety Center Feed**, **Top Alert Banners**, and provides forensic snapshots (`thumbnail_url`).

```json
[
  {
    "id": "AL-55",
    "cameraId": "CAM_01",
    "cameraName": "North Gate",
    "message": "Wrong Way Detected",
    "severity": "critical",
    "usecase": "wrong_way",
    "timestamp": "ISO8601",
    "thumbnail_url": "http://cdn/evid/AL-55_thumb.jpg",
    "full_res_url": "http://cdn/evid/AL-55_full.jpg"
  }
]
```

---

## 🔳 5. VIDEO CANVAS (The Real-Time Edge)
**Endpoint:** `GET /api/cameras/{id}/detections/{usecase}`  
**What it does:** Fetches the exact object coordinates (High frequency polling).  
**Role in UI:** This allows the UI to draw **Bounding Boxes** over the live video. *Crucial for visual intelligence.*

```json
{
  "objects": [
    {
      "id": "trk_901",
      "label": "person",
      "bbox": { "x": 100, "y": 150, "width": 50, "height": 120 },
      "confidence": 0.94
    }
  ]
}
```

---

## 📈 6. ANALYTICS REPORTING
**Endpoint:** `GET /api/reports?camera_id={id}&usecase={uc}&start_time={S}&end_time={E}`  
**What it does:** Historical data query for chart plotting.  
**Role in UI:** Powers the **Historical Line Charts** and forensic summary tables.

```json
{
  "summary": { "total_count": 8500, "peak_hour": "14:00", "avg_per_hour": 354 },
  "timeline": [
    { "time": "08:00", "count": 120 },
    { "time": "09:00", "count": 145 }
  ]
}
```

---

## 🚀 7. DEVELOPER IMPLEMENTATION GUIDE

To build the backend for this platform, follow these phases for a smooth integration with the current UI.

### Phase 1: The Core Foundation
*   **Target**: `GET /api/cameras` and `GET /api/system/overview`.
*   **Goal**: Get the Map and Dashboard populated with camera markers and global counts.
*   **Priority 1**: Ensure `hls_url` works. The UI uses standard HLS players to show the live feed.

### Phase 2: The "Live Edge" Canvas
*   **Target**: `GET /api/cameras/{id}/detections/{usecase}`.
*   **Constraint**: This endpoint must be **highly optimized**. The UI polls this every **900ms - 1500ms** to draw bounding boxes on the video.
*   **Coordinate Mapping**: The `bbox` `x, y, width, height` must be calculated relative to the video stream's resolution (e.g., if the stream is 1280x720, `x=640` is the middle).

### Phase 3: Intelligence Modules
*   **Target**: `GET /api/analytics/traffic/{id}` and `GET /api/analytics/people/{id}`.
*   **Data Structure**: Ensure the `events` array contains the exact sub-module fields like `plate_number`, `parked_duration_seconds`, and `congestion_level`.
*   **Role**: These populate the dynamic telemetry cards and the historical detection tables.

### Phase 4: Security Ops (Safety Center)
*   **Target**: `GET /api/alerts/live`.
*   **Evidence Snapshots**: Every alert **must** have a `thumbnail_url`. This is a static URL to a JPEG forensic snapshot taken at the moment of violation.
*   **State Management**: Use the `acknowledged` boolean to track which alerts the operator has cleared.

---

## 🏁 IMPLEMENTATION SUMMARY
*   **Base URL**: `https://n22tx49p-5099.inc1.devtunnels.ms`
*   **Polling Frequency**: Analytics: 2500ms | Canvas: 900ms.
*   **Coordinate Space**: All `bbox` values are in pixels relative to video stream resolution.
*   **Forensic Snapshots**: Required for all entries in the Incident Center (`thumbnail_url`).
*   **Administrative**: `POST /api/cameras/{id}/usecases` expects an array `["people_count", "traffic", ...]`.
