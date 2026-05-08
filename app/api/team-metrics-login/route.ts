import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge' // matches middleware runtime; uses Web Crypto

const COOKIE_NAME    = 'tm_auth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

function toBase64Url(bytes: ArrayBuffer): string {
  const b = btoa(String.fromCharCode(...new Uint8Array(bytes)))
  return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function signToken(secret: string): Promise<string> {
  const exp     = Date.now() + COOKIE_MAX_AGE * 1000
  const payload = String(exp)

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return `${payload}.${toBase64Url(sig)}`
}

export async function POST(req: NextRequest) {
  const password = process.env.TEAM_METRICS_PASSWORD
  const secret   = process.env.TEAM_METRICS_SESSION_SECRET

  if (!password || !secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({} as { password?: string }))
  const supplied = typeof body?.password === 'string' ? body.password : ''

  if (!timingSafeEqual(supplied, password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = await signToken(secret)
  const res   = NextResponse.json({ ok: true })
  res.cookies.set({
    name:     COOKIE_NAME,
    value:    token,
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    path:     '/',
    maxAge:   COOKIE_MAX_AGE,
  })
  return res
}

export async function DELETE() {
  // Logout: clear the cookie
  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name:     COOKIE_NAME,
    value:    '',
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    path:     '/',
    maxAge:   0,
  })
  return res
}
