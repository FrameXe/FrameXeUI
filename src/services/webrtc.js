// ══════════════════════════════════════════════════════════════
//  WEBRTC / EMBEDDED RTSP PLAYER HELPER
//
//  Handles both:
//   1. Local RTSP streams via Embedded Electron Decoder (port 9990)
//   2. Direct WebRTC WHEP endpoints (port 8889)
// ══════════════════════════════════════════════════════════════
import { logDiag } from '../lib/logCapture.js'

export async function attachWebRTC(videoEl, streamUrl) {
  if (!streamUrl || !videoEl) {
    logDiag('error', `[StreamPlayer] attachWebRTC called with missing args: videoEl=${!!videoEl} streamUrl="${streamUrl}"`)
    return null
  }

  // ── Mode 1: Direct RTSP URL → Use local Electron RTSP Server (Port 9990) ──
  if (streamUrl.startsWith('rtsp://')) {
    const localStreamUrl = `http://127.0.0.1:9990/stream?url=${encodeURIComponent(streamUrl)}`
    logDiag('webrtc', `[StreamPlayer] Direct RTSP detected → Connecting to Local Electron RTSP Server: ${localStreamUrl}`)

    try {
      const img = new Image()
      img.onload = () => {
        logDiag('webrtc', `[StreamPlayer] ✅ Local RTSP MJPEG frame loaded | ${streamUrl}`)
      }
      img.onerror = (e) => {
        logDiag('error', `[StreamPlayer] ❌ Local RTSP MJPEG load error: ${e}`)
      }
      img.src = localStreamUrl
      videoEl._rtspImg = img

      logDiag('webrtc', `[StreamPlayer] ✅ Attached local RTSP offscreen MJPEG image stream | ${streamUrl}`)

      return {
        destroy: () => {
          logDiag('webrtc', `[StreamPlayer] Stopping local RTSP playback | ${streamUrl}`)
          try {
            img.src = ''
            videoEl._rtspImg = null
          } catch (_) {}
        }
      }
    } catch (err) {
      logDiag('error', `[StreamPlayer] ❌ Local RTSP stream attach failed: ${err.message}`)
      return null
    }
  }

  // ── Mode 2: WHEP WebRTC Stream Endpoint (Port 8889) ───────────────────
  let whepUrl = streamUrl
  const currentHost = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost'

  if (!streamUrl.startsWith('http://') && !streamUrl.startsWith('https://')) {
    whepUrl = `http://${currentHost}:8889/${streamUrl.trim().replace(/^\/+|\/+$/g, '')}/whep`
  }

  logDiag('webrtc', `[WebRTC WHEP] Connecting to WHEP endpoint: ${whepUrl}`)

  try {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    pc.oniceconnectionstatechange = () => {
      logDiag('webrtc', `[WebRTC] ICE state: ${pc.iceConnectionState} | ${whepUrl}`)
    }

    pc.onconnectionstatechange = () => {
      logDiag('webrtc', `[WebRTC] Peer state: ${pc.connectionState} | ${whepUrl}`)
    }

    pc.addTransceiver('video', { direction: 'recvonly' })
    pc.addTransceiver('audio', { direction: 'recvonly' })

    pc.ontrack = (evt) => {
      logDiag('webrtc', `[WebRTC] Track received: kind=${evt.track.kind} streams=${evt.streams.length} | ${whepUrl}`)
      if (evt.streams?.[0]) {
        videoEl.muted = true
        videoEl.playsInline = true
        videoEl.srcObject = evt.streams[0]
        videoEl.play()
          .then(() => logDiag('webrtc', `[WebRTC] ✅ video.play() OK | ${whepUrl}`))
          .catch(e => logDiag('error', `[WebRTC] video.play() rejected: ${e.message} | ${whepUrl}`))
      }
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    logDiag('webrtc', `[WebRTC] SDP offer created → POSTing to WHEP server...`)

    let res
    try {
      res = await fetch(whepUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      })
    } catch (fetchErr) {
      logDiag('error', `[WebRTC] ❌ fetch() FAILED → ${fetchErr.message} | WHEP URL: ${whepUrl}`)
      pc.close()
      return null
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logDiag('error', `[WebRTC] ❌ WHEP server returned HTTP ${res.status} ${res.statusText} | URL: ${whepUrl} | ${body.slice(0, 300)}`)
      pc.close()
      return null
    }

    const answerSdp = await res.text()
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }))
    logDiag('webrtc', `[WebRTC] ✅ SDP answer applied | ${whepUrl}`)

    return {
      destroy: () => {
        logDiag('webrtc', `[WebRTC] Destroying peer connection | ${whepUrl}`)
        pc.close()
        videoEl.srcObject = null
      },
      pc,
    }
  } catch (err) {
    logDiag('error', `[WebRTC] ❌ Unexpected error: ${err.message || String(err)} | ${whepUrl}`)
    return null
  }
}
