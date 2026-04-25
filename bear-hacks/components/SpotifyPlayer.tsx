'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { beginSpotifyLogin, getStoredToken, logoutSpotify } from '@/lib/spotifyAuth'

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void
    Spotify?: any
  }
}

type PlayerState = {
  isPaused: boolean
  trackName: string
  artistName: string
  albumName: string
  albumArtUrl: string | null
}

function loadSpotifySdk() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('No window'))
    if (window.Spotify?.Player) return resolve()

    const existing = document.querySelector<HTMLScriptElement>('script[data-spotify-sdk="1"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Spotify SDK failed to load')))
      return
    }

    window.onSpotifyWebPlaybackSDKReady = () => resolve()

    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    script.dataset.spotifySdk = '1'
    script.onerror = () => reject(new Error('Spotify SDK failed to load'))
    document.body.appendChild(script)
  })
}

export function SpotifyPlayer({
  energy,
  valence,
  accent,
}: {
  energy: number
  valence: number
  accent: 'blue' | 'violet' | 'red'
}) {
  const [token, setToken] = useState(() => (typeof window === 'undefined' ? null : getStoredToken()))
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const playerRef = useRef<any>(null)
  const [state, setState] = useState<PlayerState>({
    isPaused: true,
    trackName: 'Not playing',
    artistName: '',
    albumName: '',
    albumArtUrl: null,
  })
  const [err, setErr] = useState<string | null>(null)

  const accentClass = useMemo(() => {
    if (accent === 'red') return 'from-red-500/30 via-red-500/10 to-zinc-950'
    if (accent === 'blue') return 'from-sky-500/20 via-indigo-500/10 to-zinc-950'
    return 'from-violet-500/20 via-fuchsia-500/10 to-zinc-950'
  }, [accent])

  useEffect(() => {
    setToken(getStoredToken())
  }, [])

  useEffect(() => {
    let mounted = true
    if (!token?.access_token) return

    loadSpotifySdk()
      .then(() => {
        if (!mounted) return
        const player = new window.Spotify.Player({
          name: 'AURA (Web Player)',
          getOAuthToken: (cb: (t: string) => void) => cb(token.access_token),
          volume: 0.8,
        })

        playerRef.current = player

        player.addListener('ready', ({ device_id }: { device_id: string }) => {
          setDeviceId(device_id)
          setErr(null)
        })

        player.addListener('not_ready', () => {
          setDeviceId(null)
        })

        player.addListener('player_state_changed', (s: any) => {
          if (!s) return
          const track = s.track_window?.current_track
          const art = track?.album?.images?.[0]?.url ?? null
          setState({
            isPaused: s.paused,
            trackName: track?.name ?? 'Unknown track',
            artistName: track?.artists?.map((a: any) => a.name).join(', ') ?? '',
            albumName: track?.album?.name ?? '',
            albumArtUrl: art,
          })
        })

        player.connect().catch(() => setErr('Could not connect Spotify player.'))
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Spotify setup failed.'))

    return () => {
      mounted = false
      try {
        playerRef.current?.disconnect?.()
      } catch {
        // ignore
      }
      playerRef.current = null
    }
  }, [token?.access_token])

  async function callWebApi(path: string, init?: RequestInit) {
    if (!token?.access_token) throw new Error('Not logged in')
    const res = await fetch(`https://api.spotify.com/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`Spotify API error: ${res.status} ${t}`)
    }
    return res
  }

  async function transferPlayback() {
    if (!deviceId) return
    await callWebApi('/me/player', {
      method: 'PUT',
      body: JSON.stringify({ device_ids: [deviceId], play: false }),
    })
  }

  async function playMoodSeed() {
    // Hackathon-friendly demo: play recommendations based on energy/valence.
    // Requires a market; uses US as a safe default.
    const res = await callWebApi(
      `/recommendations?limit=20&market=US&seed_genres=chill,study,edm&target_energy=${encodeURIComponent(
        energy,
      )}&target_valence=${encodeURIComponent(valence)}`,
    )
    const json = await res.json()
    const uris: string[] = (json?.tracks ?? []).map((t: any) => t?.uri).filter(Boolean)
    if (!uris.length) throw new Error('No tracks returned from recommendations.')
    await callWebApi(`/me/player/play?device_id=${encodeURIComponent(deviceId ?? '')}`, {
      method: 'PUT',
      body: JSON.stringify({ uris }),
    })
  }

  const rotateClass =
    accent === 'red'
      ? 'animate-[spin_4s_linear_infinite]'
      : accent === 'blue'
        ? 'animate-[spin_18s_linear_infinite]'
        : 'animate-[spin_10s_linear_infinite]'

  return (
    <div className={`rounded-3xl border border-white/10 bg-gradient-to-b ${accentClass} p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-300">Spotify</div>
          <div className="mt-1 text-lg font-semibold">AURA Player</div>
          <div className="mt-1 text-sm text-zinc-300">
            {token?.access_token ? (
              <span>
                Status:{' '}
                <span className="text-zinc-100">{deviceId ? 'Ready' : 'Connecting…'}</span>
              </span>
            ) : (
              <span>Status: Not logged in</span>
            )}
          </div>
          {err ? <div className="mt-2 text-sm text-red-300">{err}</div> : null}
        </div>

        <div className="flex items-center gap-2">
          {token?.access_token ? (
            <button
              onClick={() => {
                logoutSpotify()
                setToken(null)
                setDeviceId(null)
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
            >
              Log out
            </button>
          ) : (
            <button
              onClick={() => beginSpotifyLogin().catch((e) => setErr(String(e)))}
              className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
            >
              Login with Spotify
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[140px_1fr]">
        <div className="relative">
          <div className="absolute -inset-2 rounded-3xl bg-white/5 blur-xl" />
          <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
            {state.albumArtUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.albumArtUrl}
                alt=""
                className={`h-full w-full object-cover ${rotateClass} ${
                  accent === 'red' ? 'will-change-transform' : ''
                }`}
              />
            ) : (
              <div className="grid h-full place-items-center text-xs text-zinc-400">
                Album art
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className={`text-sm text-zinc-300 ${accent === 'red' ? 'animate-glitch' : ''}`}>
            Now playing
          </div>
          <div className="mt-1 truncate text-xl font-semibold">{state.trackName}</div>
          <div className="mt-1 truncate text-sm text-zinc-300">
            {state.artistName}
            {state.albumName ? <span className="text-zinc-500"> · {state.albumName}</span> : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => playerRef.current?.togglePlay?.()}
              disabled={!token?.access_token}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              {state.isPaused ? 'Play' : 'Pause'}
            </button>
            <button
              onClick={() => playerRef.current?.previousTrack?.()}
              disabled={!token?.access_token}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100 hover:bg-white/10 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => playerRef.current?.nextTrack?.()}
              disabled={!token?.access_token}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100 hover:bg-white/10 disabled:opacity-40"
            >
              Next
            </button>
            <button
              onClick={() => transferPlayback().catch((e) => setErr(String(e)))}
              disabled={!token?.access_token || !deviceId}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100 hover:bg-white/10 disabled:opacity-40"
            >
              Use this device
            </button>
            <button
              onClick={() => playMoodSeed().catch((e) => setErr(String(e)))}
              disabled={!token?.access_token || !deviceId}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100 hover:bg-white/10 disabled:opacity-40"
            >
              Play mood mix
            </button>
          </div>

          <div className="mt-4 text-xs text-zinc-400">
            Target mood: <span className="text-zinc-200">energy {energy}</span> ·{' '}
            <span className="text-zinc-200">valence {valence}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

