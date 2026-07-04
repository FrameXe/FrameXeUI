import { useEffect, useRef } from 'react'
import { computeClockOffset, CameraSync } from '../lib/cameraSync.js'

/**
 * useCameraSync — React hook to sync overlay rendering with camera feed.
 *
 * @param {string} cameraId - Camera ID
 * @param {object} options - Options
 * @param {string} options.sseUrl - SSE Stream URL
 * @param {string} options.sseEventName - Custom SSE event name
 * @param {function} onRender - Callback fired when a frame's overlays should be rendered
 */
export function useCameraSync(cameraId, options = {}, onRender) {
  const syncRef = useRef(null)
  const onRenderRef = useRef(onRender)

  // Keep callback reference fresh
  useEffect(() => {
    onRenderRef.current = onRender
  }, [onRender])

  useEffect(() => {
    if (!cameraId) return
    let cancelled = false
    let sync = null

    const init = async () => {
      // 1. Calibrate client-server clock offsets
      const offset = await computeClockOffset()
      if (cancelled) return

      // 2. Instantiate and start synchronizer
      sync = new CameraSync(cameraId, {
        clockOffsetMs: offset,
        sseUrl:        options.sseUrl,
        sseEventName:  options.sseEventName,
      })

      sync.onRender = (detection) => {
        if (!cancelled && onRenderRef.current) {
          onRenderRef.current(detection)
        }
      }

      syncRef.current = sync
      await sync.start()
    }

    init()

    return () => {
      cancelled = true
      sync?.destroy()
      syncRef.current = null
    }
  }, [cameraId, options.sseUrl, options.sseEventName])

  return syncRef
}
