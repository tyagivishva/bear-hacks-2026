'use client'

// Minimal Spotify OAuth PKCE helper (no client secret required).
// Requires `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` and Spotify dashboard redirect URI:
//   http://localhost:3000/callback
// (add your deployed URL callback too when ready).

const TOKEN_KEY = 'btn_spotify_token_v1'
const VERIFIER_KEY = 'btn_spotify_pkce_verifier_v1'

export type SpotifyToken = {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  obtained_at: number
}

function base64UrlEncode(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  // btoa expects binary string
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function sha256(input: string) {
  const enc = new TextEncoder().encode(input)
  return crypto.subtle.digest('SHA-256', enc)
}

function randomVerifier(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const arr = new Uint32Array(length)
  crypto.getRandomValues(arr)
  let out = ''
  for (let i = 0; i < arr.length; i++) out += chars[arr[i] % chars.length]
  return out
}

export function getStoredToken(): SpotifyToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const t = JSON.parse(raw) as SpotifyToken
    if (!t?.access_token) return null
    const expiresAt = t.obtained_at + t.expires_in * 1000
    if (Date.now() > expiresAt - 10_000) return null
    return t
  } catch {
    return null
  }
}

export function storeToken(token: Omit<SpotifyToken, 'obtained_at'>) {
  const t: SpotifyToken = { ...token, obtained_at: Date.now() }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t))
  return t
}

export function logoutSpotify() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(VERIFIER_KEY)
}

export async function beginSpotifyLogin() {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  if (!clientId) {
    throw new Error(
      'Missing NEXT_PUBLIC_SPOTIFY_CLIENT_ID. Create `bear-hacks/.env.local` (not the repo root) and restart `npm run dev`.',
    )
  }

  const verifier = randomVerifier()
  localStorage.setItem(VERIFIER_KEY, verifier)
  const challenge = base64UrlEncode(await sha256(verifier))

  const redirectUri = `${window.location.origin}/callback`
  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
  ].join(' ')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: scopes,
  })

  window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`)
}

export async function exchangeCodeForToken(code: string) {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  if (!clientId) {
    throw new Error(
      'Missing NEXT_PUBLIC_SPOTIFY_CLIENT_ID. Create `bear-hacks/.env.local` (not the repo root) and restart `npm run dev`.',
    )
  }

  const verifier = localStorage.getItem(VERIFIER_KEY)
  if (!verifier) throw new Error('Missing PKCE verifier (try login again)')

  const redirectUri = `${window.location.origin}/callback`

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  })

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${res.status} ${text}`)
  }

  const json = (await res.json()) as Omit<SpotifyToken, 'obtained_at'>
  return storeToken(json)
}

