// ══════════════════════════════════════════════════════════════
//  MOCK DATA
//  USE_MOCK = false karo → real API (src/config/index.js)
//
//  Production API shape:
//  GET /api/cameras → cameras array with hls_url + location inline
//  GET /api/cameras/{id}/detections/{usecase}
//  GET /api/cameras/{id}/alerts/{usecase}
//  GET /api/reports?camera_id=&usecase=&start_time=&end_time=
// ══════════════════════════════════════════════════════════════

import { ORIG_W, ORIG_H } from '../config/index.js'

// ── CAMERAS ───────────────────────────────────────────────────
// Production flow:
//   1. GET /api/cameras → list of cameras with hls_url + enabled_usecases
//   2. HLS stream plays in <video> element on canvas
//   3. GPU worker processes frames → sends detection boxes via
//      GET /api/cameras/{camera_id}/detections/{usecase}
//   4. UI overlays bounding boxes on canvas based on assigned usecases
export const MOCK_CAMERAS = [
  {
    camera_id: 'CAM-001',
    location_id: 'zone-A',
    camera_location: 'zone-A',
    latitude: 28.6139,
    longitude: 77.2090,
    enabled_usecases: ['people_count', 'intrusion'],
    status: 'active',
    alert_count: 2,
    hls_url: 'http://localhost:8080/hls/CAM-001/index.m3u8'
  },
  {
    camera_id: 'CAM-002',
    location_id: 'zone-A',
    camera_location: 'zone-A',
    latitude: 28.6140,
    longitude: 77.2091,
    enabled_usecases: ['traffic', 'speeding', 'wrong_way', 'vehicle_count'],
    status: 'active',
    alert_count: 1,
    hls_url: 'https://wnlpfl7c-8080.inc1.devtunnels.ms/hls/cam_001/index.m3u8'
  },
  {
    camera_id: 'CAM-003',
    location_id: 'zone-B',
    camera_location: 'zone-B',
    latitude: 28.6141,
    longitude: 77.2092,
    enabled_usecases: ['traffic', 'parking_mgmt', 'illegal_parking', 'congestion'],
    status: 'active',
    alert_count: 0,
    hls_url: 'https://wnlpfl7c-8080.inc1.devtunnels.ms/hls/cam_002/index.m3u8'
  },
  {
    camera_id: 'CAM-004',
    location_id: 'zone-B',
    camera_location: 'zone-B',
    latitude: 28.6142,
    longitude: 77.2093,
    enabled_usecases: ['crowd_alert'],
    status: 'active',
    alert_count: 3,
    hls_url: 'http://localhost:8080/hls/CAM-004/index.m3u8'
  },
  {
    camera_id: 'CAM-005',
    location_id: 'zone-C',
    camera_location: 'zone-C',
    latitude: 28.6143,
    longitude: 77.2094,
    enabled_usecases: [],
    status: 'offline',
    alert_count: 0,
    hls_url: 'http://localhost:8080/hls/CAM-005/index.m3u8'
  },
]

// ── DETECTION GENERATOR ───────────────────────────────────────
// Matches GET /api/cameras/{id}/detections/{usecase}
// bbox: { x, y, width, height } in pixel coordinates (ORIG_W x ORIG_H)
const SPEEDS = [42, 67, 88, 103, 55, 72, 95]

export function genLiveDet(cameraId = "cam-001", usecase = "people_counting") {
  let objects = []
  if (usecase === "people_counting" || usecase.includes('people')) objects = ["person", "face"]
  else if (usecase === "traffic" || usecase.includes('vehicle')) objects = ["car", "truck", "bike"]
  else if (usecase === "intrusion") objects = ["person"]
  else objects = ["object"]

  const randomObject = objects[Math.floor(Math.random() * objects.length)]

  // Custom metrics based on usecase
  let metadata = {}
  if (usecase === 'traffic' || usecase === 'speeding' || usecase === 'vehicle_speed') {
    metadata.speed = Math.floor(Math.random() * 40 + 20) + (Math.random() > 0.9 ? 50 : 0)
  } else if (usecase === 'parking_mgmt') {
    const spots = ['A1', 'A2', 'B5', 'C3', 'D10']
    metadata.parking_spot = spots[Math.floor(Math.random() * spots.length)]
    metadata.parking_status = Math.random() > 0.5 ? 'Occupied' : 'Available'
  } else if (usecase === 'illegal_parking') {
    metadata.parked_duration = Math.floor(Math.random() * 300) + 's'
    metadata.is_illegal = true
  } else if (usecase === 'wrong_way') {
    metadata.direction = Math.random() > 0.5 ? 'North-Bound' : 'South-Bound'
    metadata.is_wrong_way = true
  } else if (usecase.includes('people') || usecase.includes('crowd')) {
    metadata.intensity = (Math.random() * 5).toFixed(1)
  }

  // Enterprise Store Integration:
  // Randomly (2% chance per detection poll) simulate a Backend Alert generation!
  // This causes the alert to instantly show up everywhere in our synced architecture
  if (Math.random() > 0.98) {
    const msgs = ALERT_MSGS[usecase] || ['Severity Violation Detection']
    const sevs = ['critical', 'high', 'medium']
    const camConfig = MOCK_CAMERAS.find(c => c.camera_id === cameraId) || {}

    addGlobalAlert({
      id: `alert_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: usecase,
      usecase: usecase,
      cameraId: cameraId,
      cameraName: cameraId,
      location: camConfig.location_id || 'Remote Node',
      message: msgs[Math.floor(Math.random() * msgs.length)],
      severity: sevs[Math.floor(Math.random() * sevs.length)],
      timestamp: new Date().toISOString(),
      acknowledged: false
    })
  }

  return {
    id: "obj-" + Math.floor(Math.random() * 100000),
    label: randomObject,
    confidence: (Math.random() * 0.2 + 0.8).toFixed(2),
    ...metadata,
    bbox: {
      x: Math.floor(Math.random() * 500),
      y: Math.floor(Math.random() * 300),
      width: Math.floor(Math.random() * 50 + 50),
      height: Math.floor(Math.random() * 100 + 100)
    }
  }
}

// Generate the full response for GET /api/cameras/{id}/detections/{usecase}
export function genMockDetection(cameraId, usecase) {
  const count = Math.floor(Math.random() * 3) + 1
  return {
    timestamp: new Date().toISOString(),
    usecase: usecase,
    objects: Array.from({ length: count }).map(() => genLiveDet(cameraId, usecase)),
    count: count
  }
}

// ── ALERTS GENERATOR ──────────────────────────────────────────
// Matches GET /api/cameras/{id}/alerts/{usecase}
const ALERT_MSGS = {
  people_count: ['People count exceeded threshold', 'Unusual crowd pattern detected'],
  people_counting: ['People count exceeded threshold', 'Unusual crowd pattern detected'],
  traffic: ['Wrong way detected', 'Illegal parking', 'Traffic congestion forming'],
  intrusion: ['Unauthorized entry detected', 'Motion in restricted zone'],
  crowd_alert: ['Crowd limit exceeded', 'Dangerous crowd density alert'],
  vehicle_speed: ['Over-speed detected', 'Speed violation recorded'],
}

export function genMockAlerts(cameraId, usecase) {
  // We no longer randomly generate on the fly!
  // This function is kept for backwards compatibility but we should use the persistent store.
  return [];
}

// THE ENTERPRISE GLOBAL STORE
export let MOCK_ALERTS = [];

// Initialize it once so it's consistent
MOCK_CAMERAS.forEach(cam => {
  cam.enabled_usecases.forEach(uc => {
    const msgs = ALERT_MSGS[uc] || ['Alert detected'];
    const sevs = ['high', 'critical', 'medium', 'low'];
    // Generate only ONE initial alert per use case so the user can test with it
    MOCK_ALERTS.push({
      id: `alert_${cam.camera_id}_${uc}_${Math.floor(Math.random() * 90000)}`,
      type: uc,
      message: msgs[0],
      timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(),
      severity: sevs[0],
      usecase: uc,
      cameraId: cam.camera_id,
      cameraName: cam.camera_id,
      location: cam.location_id,
      acknowledged: false,
    });
  });
});

export function addGlobalAlert(alert) {
  MOCK_ALERTS = [alert, ...MOCK_ALERTS];
}

export function ackGlobalAlert(cameraId, alertId) {
  MOCK_ALERTS = MOCK_ALERTS.map(a => a.id === alertId ? { ...a, acknowledged: true } : a);
}
// ── TRAFFIC SUB-USECASE GENERATORS ───────────────────────
export function genMockCongestion(cameraId) {
  return {
    tenant_id: "tenant_123",
    camera_id: cameraId,
    service: "congestion",
    timestamp: new Date().toISOString(),
    congestion_level: ["low", "medium", "high"][Math.floor(Math.random() * 3)],
    vehicle_count: Math.floor(Math.random() * 60 + 10),
    average_speed: (Math.random() * 40 + 10).toFixed(1),
    alerts: [],
    metadata: {}
  }
}

export function genMockIllegalParking(cameraId) {
  const isViolation = Math.random() > 0.8;
  const events = isViolation ? [{
    track_id: 100 + Math.floor(Math.random() * 900),
    vehicle_type: "car",
    plate_number: "ABC-" + Math.floor(Math.random() * 9000),
    timestamp: new Date().toISOString(),
    parked_duration_seconds: Math.floor(Math.random() * 600 + 300),
    is_violation: true,
    reason: ["No Parking Zone", "Blocked Fire Hydrant", "Emergency Lane Breach", "Authorized Only Zone", "Loading Dock Obstruction"][Math.floor(Math.random() * 5)],
    confidence: 0.92
  }] : [];

  const alerts = isViolation ? [{
    alert_type: "illegal_parking_detected",
    severity: "high",
    message: `Vehicle ${events[0].plate_number} parked illegally for over 5 mins`,
    timestamp: new Date().toISOString(),
    metadata: {}
  }] : [];

  return {
    tenant_id: "tenant_123",
    camera_id: cameraId,
    service: "illegal_parking",
    timestamp: new Date().toISOString(),
    events,
    alerts,
    metadata: {}
  }
}

export function genMockParkingMgmt(cameraId) {
  const total = 100;
  const occupied = Math.floor(Math.random() * 80 + 10);
  return {
    tenant_id: "tenant_123",
    camera_id: cameraId,
    service: "parking_mgmt",
    timestamp: new Date().toISOString(),
    total_spots: total,
    available_spots: total - occupied,
    occupied_spots: occupied,
    events: [{
      spot_id: "A" + Math.floor(Math.random() * 20),
      status: "occupied",
      vehicle_type: "car",
      plate_number: "XYZ-" + Math.floor(Math.random() * 9000),
      timestamp: new Date().toISOString(),
      confidence: 0.95
    }],
    alerts: [],
    metadata: {}
  }
}

export function genMockPeopleCount(cameraId) {
  const countIn = Math.floor(Math.random() * 100);
  const countOut = Math.floor(Math.random() * 80);
  return {
    tenant_id: "tenant_123",
    camera_id: cameraId,
    service: "people_count",
    timestamp: new Date().toISOString(),
    metrics: {
      total: countIn + countOut,
      count_in: countIn,
      count_out: countOut,
      current_frame_count: Math.floor(Math.random() * 10),
      classes: { person: countIn + countOut }
    },
    detections: [{
      type: "people",
      id: "ped_" + Math.floor(Math.random() * 1000),
      class: "person",
      bbox: [100, 200, 150, 400],
      confidence: 0.88,
      tracking_id: "track_" + Math.floor(Math.random() * 1000),
      crossed_line: Math.random() > 0.5,
      direction: Math.random() > 0.5 ? "in" : "out"
    }],
    alerts: [],
    metadata: {}
  }
}

export function genMockSpeeding(cameraId) {
  const isViolation = Math.random() > 0.8;
  const speed = isViolation ? (Math.random() * 30 + 70) : (Math.random() * 20 + 30);
  const events = [{
    track_id: 500 + Math.floor(Math.random() * 400),
    speed_kmh: parseFloat(speed.toFixed(1)),
    vehicle_type: Math.random() > 0.5 ? "truck" : "car",
    timestamp: new Date().toISOString(),
    is_violation: isViolation,
    confidence: 0.89
  }];

  const alerts = isViolation ? [{
    alert_type: "speed_violation",
    severity: "high",
    message: `${events[0].vehicle_type} detected speeding at ${events[0].speed_kmh} km/h`,
    timestamp: new Date().toISOString(),
    metadata: {}
  }] : [];

  return {
    tenant_id: "tenant_123",
    camera_id: cameraId,
    service: "speed_detection",
    timestamp: new Date().toISOString(),
    events,
    alerts,
    statistics: {
      average_speed: 45.2,
      highest_speed: speed > 80 ? speed.toFixed(1) : 85.5
    },
    metadata: {}
  }
}

export function genMockVehicleCount(cameraId) {
  return {
    tenant_id: "tenant_123",
    camera_id: cameraId,
    service: "vehicle_count",
    timestamp: new Date().toISOString(),
    counts: { IN: 120, OUT: 97 },
    events: [{
      track_id: 800 + Math.floor(Math.random() * 100),
      direction: Math.random() > 0.5 ? "IN" : "OUT",
      vehicle_type: "car",
      timestamp: new Date().toISOString(),
      confidence: 0.94,
      metadata: {}
    }],
    alerts: [],
    metadata: {}
  }
}

export function genMockWrongWay(cameraId) {
  const isViolation = Math.random() > 0.9;
  const events = isViolation ? [{
    track_id: 300 + Math.floor(Math.random() * 100),
    vehicle_type: Math.random() > 0.5 ? "motorcycle" : "car",
    location: ["Main Exit Ramp", "Counter-flow at Lane B", "One-way Entry Point", "Highway Shoulder Access"][Math.floor(Math.random() * 4)],
    timestamp: new Date().toISOString(),
    confidence: 0.97
  }] : [];

  const alerts = isViolation ? [{
    alert_type: "wrong_way_detected",
    severity: "critical",
    message: "Motorcycle detected driving in wrong direction",
    timestamp: new Date().toISOString(),
    metadata: {}
  }] : [];

  return {
    tenant_id: "tenant_123",
    camera_id: cameraId,
    service: "wrong_way",
    timestamp: new Date().toISOString(),
    events,
    alerts,
    metadata: {}
  }
}

// Matches GET /api/reports?...
export function genMockReport(cameraId, usecase, startTime, endTime) {
  const hours = Array.from({ length: 24 }, (_, h) => ({
    time: `${String(h).padStart(2, '0')}:00`,
    count: Math.floor(Math.random() * 50) + 1,
  }))
  const total = hours.reduce((s, h) => s + h.count, 0)
  const peak = hours.reduce((p, h) => h.count > p.count ? h : p, hours[0])
  return {
    camera_id: cameraId,
    usecase,
    start_time: startTime,
    end_time: endTime,
    summary: {
      total_count: total,
      peak_hour: peak.time,
      peak_count: peak.count,
      average_per_hour: Math.round(total / 24),
    },
    timeline: hours,
  }
}

// ── PEOPLE ANALYTICS GENERATOR ────────────────────────────────
// For alert detail panel — click an alert → see people analytics
export function genMockPeopleAnalytics(cameraId) {
  const hourly = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, '0')}:00`,
    count: Math.floor(Math.random() * 45) + 2,
  }))
  const totalToday = hourly.reduce((s, h) => s + h.count, 0)
  const peak = hourly.reduce((p, h) => h.count > p.count ? h : p, hourly[0])
  const currentInFrame = Math.floor(Math.random() * 10) + 3
  const capacityLimit = 20

  return {
    cameraId,
    currentInFrame,
    totalToday,
    peakHour: peak.hour,
    peakCount: peak.count,
    avgPerHour: Math.round(totalToday / 24),
    capacityLimit,
    capacityStatus: currentInFrame > capacityLimit ? 'critical' : currentInFrame > capacityLimit * 0.7 ? 'warning' : 'ok',
    hourlyTimeline: hourly,
  }
}

// Unused but kept for compatibility
export const MOCK_SUMMARY = { total_entries: 1842, total_exits: 1790, peak_inside: 210, total_events: 3680 }
export const MOCK_EVENTS = { total: 0, data: [] }
export const MOCK_SESSIONS = { total: 0, data: [] }