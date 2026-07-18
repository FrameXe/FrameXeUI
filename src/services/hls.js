// ══════════════════════════════════════════════════════════════
//  HLS PLAYER HELPER
//
//  Kaise kaam karta hai:
//  1. hls.js dynamically import hota hai (bundle size chhota rakho)
//  2. Video element pe HLS stream attach hoti hai
//  3. Video element hidden rehta hai DOM mein
//  4. Canvas render loop mein ctx.drawImage(video) se frame copy hota hai
//
//  hlsUrl set karna:
//  mockData.js mein camera ka hlsUrl set karo:
//  hlsUrl: 'http://192.168.1.10:8888/live/cam-01/index.m3u8'
//
//  MediaMTX example stream URL format:
//  http://<server-ip>:8888/<stream-name>/index.m3u8
// ══════════════════════════════════════════════════════════════

export async function attachHLS(videoEl, hlsUrl) {
  if (!hlsUrl || !videoEl) return null

  try {
    const { default: Hls } = await import('hls.js')

    if (Hls.isSupported()) {
      // Chrome, Firefox, Edge — hls.js use karo
      const hls = new Hls({
        enableWorker:               true,
        lowLatencyMode:             true,           // live stream ke liye
        liveSyncDuration:           6.0,            // Sync within 6s of live edge (3 segments of 2s)
        liveMaxLatencyDuration:     10.0,           // Hard cap latency of 10s max (seconds)
        maxLiveSyncPlaybackRate:    1.2,            // playback rate se lag catch-up
        backBufferLength:           5,
      })




      hls.loadSource(hlsUrl)
      hls.attachMedia(videoEl)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoEl.play().catch(() => {})
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.warn('[HLS] Network error, retrying...', data);
            hls.startLoad()
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            console.warn('[HLS] Media error, trying to recover...', data);
            hls.recoverMediaError()
          } else {
            console.error('[HLS] Unrecoverable fatal error, destroying player', data);
            hls.destroy()
          }
        }
      })

      return hls // cleanup ke liye — hls.destroy() call karo

    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS — native HLS
      videoEl.src = hlsUrl
      videoEl.play().catch(() => {})
      return null
    }
  } catch (e) {
    console.error('[HLS] Failed to attach:', e)
    return null
  }
}
