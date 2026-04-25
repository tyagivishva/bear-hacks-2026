'use client'

import { useEffect, useState } from 'react'
import { exchangeCodeForToken } from '@/lib/spotifyAuth'

export default function CallbackPage() {
  const [msg, setMsg] = useState('Finishing Spotify login…')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const err = params.get('error')

    if (err) {
      setMsg(`Spotify login error: ${err}`)
      return
    }

    if (!code) {
      setMsg('Missing authorization code. Try “Login with Spotify” again.')
      return
    }

    exchangeCodeForToken(code)
      .then(() => {
        setMsg('Logged in. Redirecting…')
        window.location.replace('/')
      })
      .catch((e) => {
        setMsg(e instanceof Error ? e.message : 'Token exchange failed.')
      })
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 grid place-items-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-lg font-semibold">AURA</h1>
        <p className="mt-2 text-sm text-zinc-300">{msg}</p>
      </div>
    </main>
  )
}

