'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { SpotifyPlayer } from '@/components/SpotifyPlayer'
import { bpmToMood } from '@/lib/mood'
import { useHyperateHeartRate } from '@/lib/useHyperateHeartRate'

type CurrentApp = 'VS Code' | 'Chrome'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export default function Page() {
  const hyperate = useHyperateHeartRate('34681')
  const bpm = hyperate.bpm ?? 92

  const mood = useMemo(() => bpmToMood(bpm), [bpm])
  const isHype = mood.band === 'hype'
  const isChill = mood.band === 'chill'

  const [currentApp, setCurrentApp] = useState<CurrentApp>('VS Code')

  // Background pulse synced to BPM.
  const bpmMv = useMotionValue(bpm)
  const bpmSpring = useSpring(bpmMv, { stiffness: 120, damping: 18, mass: 0.6 })
  const pulse = useTransform(bpmSpring, (v: number) => {
    const norm = clamp((v - 60) / 100, 0, 1) // ~60-160 bpm -> 0..1
    return 0.95 + norm * 0.08
  })
  const glow = useTransform(bpmSpring, (v: number) => {
    const norm = clamp((v - 60) / 100, 0, 1)
    return 0.25 + norm * 0.35
  })

  useEffect(() => {
    bpmMv.set(bpm)
  }, [bpm, bpmMv])

  const shellAccent =
    mood.accent === 'red'
      ? 'ring-red-500/30'
      : mood.accent === 'blue'
        ? 'ring-sky-500/30'
        : 'ring-violet-500/30'

  const bgGradient =
    mood.accent === 'red'
      ? 'from-red-950 via-zinc-950 to-black'
      : mood.accent === 'blue'
        ? 'from-sky-950 via-zinc-950 to-black'
        : 'from-violet-950 via-zinc-950 to-black'

  return (
    <main className={`min-h-screen bg-gradient-to-b ${bgGradient} text-zinc-100`}>
      <div className="relative overflow-hidden">
        {/* Pulsing ambience */}
        <motion.div
          style={{ scale: pulse, opacity: glow }}
          className="pointer-events-none absolute inset-0"
        >
          <div
            className={`absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl ${
              isHype
                ? 'bg-red-500/25'
                : isChill
                  ? 'bg-sky-500/20'
                  : 'bg-violet-500/20'
            }`}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.08),transparent_55%)]" />
        </motion.div>

        <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
          <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                <span className={isHype ? 'animate-glitch' : ''}>Break the Norm</span>
                <span className="text-zinc-400">·</span>
                <span className="text-zinc-300">HypeRate</span>
                <span className="text-zinc-400">→</span>
                <span className="text-zinc-300">Spotify</span>
              </div>

              <h1
                className={`mt-4 text-3xl font-semibold tracking-tight md:text-5xl ${
                  isHype ? 'text-red-100' : ''
                }`}
              >
                Your playlist that reacts to your heart.
              </h1>

              <p className="mt-3 text-sm leading-6 text-zinc-300 md:text-base">
                Live BPM drives mood targeting (energy/valence) and the UI “breaks the norm” when you
                cross intensity thresholds.
              </p>
            </div>

            <div className={`rounded-3xl border border-white/10 bg-white/5 p-4 ring-1 ${shellAccent}`}>
              <div className="flex items-center justify-between gap-6">
                <div>
                  <div className="text-xs uppercase tracking-widest text-zinc-400">Heart rate</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <div className={`text-3xl font-semibold ${isHype ? 'text-red-200' : ''}`}>
                      {bpm}
                    </div>
                    <div className="text-sm text-zinc-400">BPM</div>
                  </div>
                  <div className="mt-1 text-sm text-zinc-300">
                    Mood: <span className="text-zinc-100">{mood.label}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs uppercase tracking-widest text-zinc-400">Stream</div>
                  <div className="mt-1 text-sm text-zinc-200">
                    {hyperate.status === 'live' ? 'Live' : hyperate.status === 'connecting' ? 'Connecting…' : 'Sim'}
                  </div>
                  <button
                    onClick={() => hyperate.forceSimulation()}
                    className="mt-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10"
                  >
                    Force demo mode
                  </button>
                </div>
              </div>

              {hyperate.status !== 'live' ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Simulation Slider</span>
                    <span className="text-zinc-200">{hyperate.simBpm} BPM</span>
                  </div>
                  <input
                    aria-label="Simulated BPM"
                    type="range"
                    min={70}
                    max={150}
                    value={hyperate.simBpm}
                    onChange={(e) => hyperate.setSimBpm(Number(e.target.value))}
                    className="mt-2 w-full accent-white"
                  />
                </div>
              ) : null}
            </div>
          </header>

          <section className="mt-8 grid grid-cols-1 gap-6 md:mt-10 md:grid-cols-3">
            <div className="md:col-span-2">
              <SpotifyPlayer energy={mood.energy} valence={mood.valence} accent={mood.accent} />
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-widest text-zinc-400">
                  Workstation tracking (mock)
                </div>
                <div className="mt-2 text-sm text-zinc-300">
                  Simulate what you’re doing on screen to show “context-aware” UI shifts.
                </div>

                <div className="mt-4">
                  <label className="text-sm text-zinc-200">Current app</label>
                  <select
                    value={currentApp}
                    onChange={(e) => setCurrentApp(e.target.value as CurrentApp)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-white/10"
                  >
                    <option>VS Code</option>
                    <option>Chrome</option>
                  </select>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-xs uppercase tracking-widest text-zinc-500">UI shift</div>
                  <div className="mt-2 text-sm text-zinc-200">
                    {currentApp === 'VS Code' ? (
                      <span>
                        Focus mode: tighter layout, calmer micro‑animations to keep you coding.
                      </span>
                    ) : (
                      <span>
                        Discovery mode: bolder visuals and quicker feedback to match browsing tempo.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`rounded-3xl border border-white/10 bg-white/5 p-5 ${
                  isHype ? 'ring-1 ring-red-500/30' : isChill ? 'ring-1 ring-sky-500/20' : ''
                }`}
              >
                <div className="text-xs uppercase tracking-widest text-zinc-400">Break the norm</div>
                <div className="mt-2 text-sm text-zinc-300">
                  {isHype ? (
                    <span>
                      BPM &gt; 110: glitch mode, red primary, album art spins faster.
                    </span>
                  ) : isChill ? (
                    <span>
                      BPM &lt; 80: soft gradients and slow “breathing” ambience.
                    </span>
                  ) : (
                    <span>80–110: balanced visuals for flow state.</span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                    <div className="text-zinc-500">Energy</div>
                    <div className="mt-1 text-zinc-100">{mood.energy}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                    <div className="text-zinc-500">Valence</div>
                    <div className="mt-1 text-zinc-100">{mood.valence}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <footer className="mt-10 border-t border-white/10 pt-6 text-xs text-zinc-500">
            Tip: set `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` in `bear-hacks/.env.local` and add the callback
            URL in your Spotify dashboard.
          </footer>
        </div>
      </div>
    </main>
  )
}

