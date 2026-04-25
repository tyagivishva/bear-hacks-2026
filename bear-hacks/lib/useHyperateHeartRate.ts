'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type HyperateMsg = {
  hr?: number | null
  heartRate?: number | null
  bpm?: number | null
}

export function useHyperateHeartRate(hyperateId: string) {
  const [bpm, setBpm] = useState<number | null>(null)
  const [status, setStatus] = useState<'connecting' | 'live' | 'simulating' | 'error'>(
    'connecting',
  )
  const [simBpm, setSimBpm] = useState<number>(92)
  const lastLiveAtRef = useRef<number>(0)

  const url = useMemo(
    () => `wss://app.hyperate.io/socket.external?id=${encodeURIComponent(hyperateId)}`,
    [hyperateId],
  )

  useEffect(() => {
    let ws: WebSocket | null = null
    let stop = false

    function fallbackToSimulation() {
      setStatus('simulating')
      setBpm((prev) => prev ?? simBpm)
    }

    try {
      setStatus('connecting')
      ws = new WebSocket(url)

      ws.onopen = () => {
        if (stop) return
        setStatus('live')
      }

      ws.onerror = () => {
        if (stop) return
        setStatus('error')
        fallbackToSimulation()
      }

      ws.onclose = () => {
        if (stop) return
        fallbackToSimulation()
      }

      ws.onmessage = (event) => {
        if (stop) return
        try {
          const parsed: HyperateMsg = JSON.parse(String(event.data))
          const next =
            typeof parsed.hr === 'number'
              ? parsed.hr
              : typeof parsed.heartRate === 'number'
                ? parsed.heartRate
                : typeof parsed.bpm === 'number'
                  ? parsed.bpm
                  : null

          if (next == null || !Number.isFinite(next)) return
          lastLiveAtRef.current = Date.now()
          setStatus('live')
          setBpm(Math.round(next))
        } catch {
          // ignore non-json payloads
        }
      }
    } catch {
      fallbackToSimulation()
    }

    const interval = window.setInterval(() => {
      if (stop) return
      if (!lastLiveAtRef.current) return
      // If no live data in a while, switch to simulation (demo-friendly).
      if (Date.now() - lastLiveAtRef.current > 8000) {
        fallbackToSimulation()
      }
    }, 2000)

    return () => {
      stop = true
      window.clearInterval(interval)
      try {
        ws?.close()
      } catch {
        // ignore
      }
    }
    // Intentionally omit simBpm so we don't reconnect WS on slider changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, hyperateId])

  const effectiveBpm = status === 'simulating' ? simBpm : bpm

  return {
    bpm: effectiveBpm,
    rawBpm: bpm,
    status,
    simBpm,
    setSimBpm,
    forceSimulation: () => setStatus('simulating'),
  }
}

