// ══════════════════════════════════════════════════════════════
//  WEBRTC (WHEP) PLAYER HELPER
//
//  Replaces HLS for ultra-low latency (<100ms) RTSP streaming.
//  Uses WebRTC HTTP Egress Protocol (WHEP) supported natively
//  by MediaMTX, go2rtc, and modern RTSP stream gateways.
// ══════════════════════════════════════════════════════════════

export async function attachWebRTC(videoEl, streamUrl) {
  if (!streamUrl || !videoEl) return null

  // Convert standard HLS/RTSP URLs to WHEP endpoint if needed
  let whepUrl = streamUrl
  if (streamUrl.startsWith('rtsp://')) {
    // If backend sends raw rtsp://, route via local/configured MediaMTX WHEP port 8889
    const streamName = streamUrl.split('/').pop() || 'live'
    whepUrl = `http://localhost:8889/${streamName}/whep`
  } else if (streamUrl && streamUrl.includes(':8888/') && streamUrl.endsWith('/index.m3u8')) {
    // Convert HLS port 8888 URL -> WebRTC WHEP port 8889 URL
    whepUrl = streamUrl.replace(':8888/', ':8889/').replace('/index.m3u8', '/whep')
  }

  try {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19002' }],
    })

    pc.addTransceiver('video', { direction: 'recvonly' })
    pc.addTransceiver('audio', { direction: 'recvonly' })

    pc.ontrack = (evt) => {
      if (evt.streams && evt.streams[0]) {
        videoEl.srcObject = evt.streams[0]
        videoEl.play().catch(() => {})
      }
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const res = await fetch(whepUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: offer.sdp,
    })

    if (!res.ok) {
      pc.close()
      throw new Error(`WHEP HTTP ${res.status}: ${res.statusText}`)
    }

    const answerSdp = await res.text()
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }))

    return {
      destroy: () => {
        pc.close()
        videoEl.srcObject = null
      },
      pc,
    }
  } catch (err) {
    console.warn('[WebRTC WHEP] Direct WebRTC failed, falling back:', err)
    return null
  }
}
