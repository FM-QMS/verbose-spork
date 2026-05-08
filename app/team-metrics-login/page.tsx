'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ── Brand tokens (match the workspace selection page) ────────────────
const BRAND = {
  navy:        '#1C2B4A',
  navySoft:    '#64748B',
  navyMuted:   '#94A3B8',
  border:      '#E2E8F0',
  blue:        '#4A8FE7',
  blueLight:   'rgba(74, 143, 231, 0.10)',
  pink:        '#E91E63',
  bgGradient:  'linear-gradient(135deg, #EBF1FB 0%, #F1EEF6 50%, #FBE8EE 100%)',
  serif:       '"Playfair Display", "DM Serif Display", Georgia, serif',
}
// ─────────────────────────────────────────────────────────────────────

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const next         = searchParams.get('next')  || '/checkins'
  const configError  = searchParams.get('error') === 'config'

  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(configError ? 'Server is missing TEAM_METRICS_SESSION_SECRET.' : '')
  const [loading,  setLoading]  = useState(false)
  const [focused,  setFocused]  = useState(false)
  const [btnHover, setBtnHover] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/team-metrics-login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push(next)
        router.refresh()
      } else {
        setError('Incorrect password')
        setPassword('')
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const disabled = loading || !password

  return (
    <div style={{
      minHeight:  '100vh',
      background: BRAND.bgGradient,
      display:    'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* ── Top bar ── */}
      <header style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        padding: '24px 40px',
      }}>
        <div style={{ fontSize: 12, color: BRAND.navyMuted }}>
          Internal Operations Platform
        </div>
      </header>

      {/* ── Main column ── */}
      <main style={{
        flex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '40px 24px 80px',
      }}>
        {/* Pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 999,
          background: BRAND.blueLight,
          fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
          color: BRAND.blue, textTransform: 'uppercase',
          marginBottom: 28,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: BRAND.blue }} />
          Team Metrics
        </div>

        {/* Heading */}
        <h1 style={{
          fontFamily: BRAND.serif,
          fontSize: 'clamp(36px, 5.5vw, 56px)',
          fontWeight: 700, color: BRAND.navy,
          textAlign: 'center', margin: '0 0 18px',
          lineHeight: 1.08, letterSpacing: '-0.02em',
        }}>
          Welcome back.<br />
          Please sign in.
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 14, color: BRAND.navyMuted,
          textAlign: 'center', margin: '0 0 40px',
          maxWidth: 440, lineHeight: 1.6,
        }}>
          Enter the team password to access weekly check-ins, trends, and AI-powered insights.
        </p>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 16,
          width: '100%', maxWidth: 420,
          boxShadow: '0 4px 24px rgba(28, 43, 74, 0.06)',
          overflow: 'hidden',
        }}>
          {/* Top accent — same blue gradient as the Team Metrics card */}
          <div style={{
            height: 4,
            background: `linear-gradient(90deg, ${BRAND.blue} 0%, #6BA8F0 100%)`,
          }} />

          <form onSubmit={handleSubmit} style={{ padding: 32 }}>
            {/* Lock icon in tinted square */}
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: BRAND.blueLight,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 18,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke={BRAND.blue} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <h2 style={{
              fontFamily: BRAND.serif,
              fontSize: 22, fontWeight: 700, color: BRAND.navy,
              margin: '0 0 8px', letterSpacing: '-0.01em',
            }}>
              Team Metrics
            </h2>
            <p style={{
              fontSize: 13, color: BRAND.navySoft,
              margin: '0 0 22px', lineHeight: 1.55,
            }}>
              Weekly check-ins, trends, history, and AI-powered insights across advocate and fitter teams.
            </p>

            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Enter team password"
              autoFocus
              required
              style={{
                width: '100%', padding: '12px 14px', fontSize: 14,
                border: `1.5px solid ${focused ? BRAND.blue : BRAND.border}`,
                borderRadius: 10,
                marginBottom: 12, boxSizing: 'border-box', outline: 'none',
                fontFamily: 'inherit', color: BRAND.navy,
                transition: 'border-color 0.15s, box-shadow 0.15s',
                boxShadow: focused ? `0 0 0 3px ${BRAND.blueLight}` : 'none',
              }}
            />

            {error && (
              <div style={{
                fontSize: 13, color: '#DC2626',
                marginBottom: 12, padding: '10px 12px',
                background: 'rgba(220, 38, 38, 0.07)',
                borderRadius: 8,
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={disabled}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              style={{
                width: '100%', padding: '12px 18px',
                fontSize: 14, fontWeight: 600,
                background: BRAND.navy, color: '#fff',
                border: 'none', borderRadius: 10,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                transform: !disabled && btnHover ? 'translateY(-1px)' : 'translateY(0)',
                boxShadow: !disabled && btnHover ? '0 4px 12px rgba(28, 43, 74, 0.18)' : 'none',
                transition: 'opacity 0.15s, transform 0.1s, box-shadow 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Checking…' : 'Open workspace  →'}
            </button>
          </form>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        textAlign: 'center', fontSize: 11, color: BRAND.navyMuted,
        padding: '0 24px 24px',
      }}>
        © {new Date().getFullYear()} Quantum Medical · Internal use only
      </footer>
    </div>
  )
}

export default function TeamMetricsLogin() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
