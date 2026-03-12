# Video Analytics Platform

## REPO STRUCTURE — KAHAN KYA HAI

```
video-analytics/
│
├── index.html                          ← Entry point (mat chhedna)
├── package.json                        ← Dependencies
├── vite.config.js                      ← Vite config
├── tailwind.config.js                  ← Tailwind
├── postcss.config.js                   ← PostCSS
│
└── src/
    │
    ├── main.jsx                        ← Root render (mat chhedna)
    ├── App.jsx                         ← All routes defined here
    ├── index.css                       ← Global styles
    │
    ├── config/
    │   └── index.js                   ← ⭐ SIRF YEH FILE CHANGE KARO
    │                                      Mock → API switch
    │                                      HLS URL config
    │
    ├── constants/
    │   └── useCases.js                ← Use cases add/edit karo
    │
    ├── services/
    │   ├── mockData.js                ← ⭐ Camera list + HLS URL yahan
    │   ├── api.js                     ← Mock/Real API calls
    │   ├── liveDetections.js          ← Canvas detection feed (mock/api/ws)
    │   ├── hls.js                     ← HLS stream attach helper
    │   └── canvasDraw.js              ← Canvas drawing functions
    │
    ├── store/
    │   └── index.js                   ← Zustand global state
    │
    ├── hooks/
    │   ├── useCameras.js
    │   ├── useAlerts.js
    │   └── useDetections.js
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Layout.jsx             ← Wrapper (sidebar + topbar)
    │   │   ├── TopBar.jsx             ← Header bar
    │   │   └── Sidebar.jsx            ← Left nav
    │   │
    │   ├── camera/
    │   │   ├── MiniCanvas.jsx         ← Grid tile (video + boxes)
    │   │   └── CanvasEditor.jsx       ← Fullscreen (click pe khulta hai)
    │   │
    │   └── shared/
    │       └── index.jsx              ← KpiCard, Btn, Tag, Loading etc
    │
    └── pages/
        ├── Dashboard.jsx              ← / route
        ├── CameraExplorer.jsx         ← /cameras
        ├── CameraDetail.jsx           ← /camera/:id
        ├── UseCaseView.jsx            ← /use-case/:id
        ├── EventsAlerts.jsx           ← /events
        └── Reports.jsx                ← /reports
```

---

## SETUP — 3 COMMANDS

```bash
npm install
npm run dev
# Browser mein: http://localhost:5173
```

---

## HLS STREAM ADD KARNA

`src/services/mockData.js` mein camera ka `hlsUrl` set karo:

```js
// PEHLE (mock background)
{ id:'cam-01', name:'Gate Entrance', ..., hlsUrl: null }

// BAAD MEIN (real HLS)
{ id:'cam-01', name:'Gate Entrance', ..., hlsUrl: 'http://192.168.1.10:8888/live/cam-01/index.m3u8' }
```

HLS null → animated mock CCTV background dikhega
HLS set → real camera stream canvas pe

---

## API PE JAANA

Sirf `src/config/index.js` mein ek line change:

```js
// PEHLE
export const USE_MOCK = true

// BAAD MEIN
export const USE_MOCK = false
export const API_BASE = 'http://tumhara-backend.com'
```

---

## ROUTES

| URL                    | Page              |
|------------------------|-------------------|
| /                      | Dashboard         |
| /cameras               | Camera Grid       |
| /camera/cam-01         | Fullscreen Canvas |
| /use-case/people       | Use Case View     |
| /events                | Alerts            |
| /reports               | Reports           |

