import { NextRequest, NextResponse } from 'next/server'

// ── Config ──────────────────────────────────────────────────────────────
const PROTECTED_PREFIX = '/checkins'
const LOGIN_PATH       = '/team-metrics-login'
const COOKIE_NAME      = 'tm_auth'
// ────────────────────────────────────────────────────────────────────────

async function verifyToken(token: string, secret: string): Promise<boolean> {
  try {
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return false

    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    // Decode base64url signature
    const b64 = sig.replace(/-/g, '+').replace(/_/g, '/')
    const sigBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payload))
    if (!valid) return false

    const exp = parseInt(payload, 10)
    if (!Number.isFinite(exp) || exp < Date.now()) return false

    return true
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only guard the Team Metrics section
  if (!pathname.startsWith(PROTECTED_PREFIX)) return NextResponse.next()

  const secret = process.env.TEAM_METRICS_SESSION_SECRET
  if (!secret) {
    // Misconfigured — fail closed so we don't accidentally expose data
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = LOGIN_PATH
    loginUrl.searchParams.set('error', 'config')
    return NextResponse.redirect(loginUrl)
  }

  const token = req.cookies.get(COOKIE_NAME)?.value
  if (token && (await verifyToken(token, secret))) {
    return NextResponse.next()
  }

  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = LOGIN_PATH
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Match /checkins and any sub-route. If you have API routes that serve
  // Team Metrics data (e.g. /api/checkins/*), add them here too.
  matcher: ['/checkins', '/checkins/:path*'],
}
