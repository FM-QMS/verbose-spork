'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const next          = searchParams.get('next')  || '/checkins'
  const configError   = searchParams.get('error') === 'config'

  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(configError ? 'Server is missing TEAM_METRICS_SESSION_SECRET.' : '')
  const [loading,  setLoading]  = useState(false)

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

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F8FAFC', padding: 16,
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#fff', padding: 32, borderRadius: 12,
        boxShadow: '0 4px 16px rgba(28,43,74,0.08)',
        width: '100%', maxWidth: 360, border: '1px solid #E2E8F0',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C2B4A', margin: '0 0 6px' }}>
          Team Metrics
        </h1>
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>
          Enter the team password to continue.
        </p>

        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          required
          style={{
            width: '100%', padding: '10px 12px', fontSize: 14,
            border: '1px solid #E2E8F0', borderRadius: 8,
            marginBottom: 12, boxSizing: 'border-box', outline: 'none',
          }}
        />

        {error && (
          <div style={{ fontSize: 13, color: '#DC2626', marginBottom: 12 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          style={{
            width: '100%', padding: '10px 16px', fontSize: 14, fontWeight: 600,
            background: '#1C2B4A', color: '#fff', border: 'none', borderRadius: 8,
            cursor: loading || !password ? 'not-allowed' : 'pointer',
            opacity: loading || !password ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? 'Checking…' : 'Continue'}
        </button>
      </form>
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
