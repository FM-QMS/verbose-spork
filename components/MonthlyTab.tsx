'use client'
import { useState, useMemo } from 'react'
import { ADV_DEPTS, FITTER_DEPTS, ADV_DEPT_KEYS, FITTER_DEPT_KEYS } from '@/utils/metrics'

type TeamType = 'advocate' | 'fitter'

const DEPT_COLORS: Record<string, string> = {
  cgm: '#1565C0', shoe: '#00695C', chase: '#E65100', pfp: '#4527A0', fitter: '#BF360C',
}
const DEPT_BG: Record<string, string> = {
  cgm: '#E3F0FF', shoe: '#E0F2F1', chase: '#FFF3E0', pfp: '#EDE7F6', fitter: '#FBE9E7',
}

// ── Helpers ──────────────────────────────────────────────────
function weekToYM(weekDate: string) {
  const d = new Date(weekDate + 'T12:00:00')
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function parseTalkMins(s: string): number {
  if (!s) return 0
  const parts = String(s).split(':').map(Number)
  if (parts.length >= 2) return (parts[0] || 0) * 60 + (parts[1] || 0)
  return 0
}

function fmtTalkMins(mins: number): string {
  if (mins === 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function aggregateMetrics(entries: any[], deptKey: string): Record<string, number> {
  const t: Record<string, number> = {}
  for (const e of entries) {
    for (const [k, v] of Object.entries(e.metrics?.[deptKey] || {})) {
      t[k] = (t[k] || 0) + (Number(v) || 0)
    }
  }
  return t
}

function aggregatePhone(entries: any[], deptKey: string) {
  const t: Record<string, { out: number; inp: number; talk: number; tasks: number; pv: number; nc: number }> = {}
  for (const e of entries) {
    for (const adv of (e.advocates?.[deptKey] || [])) {
      if (!adv.name) continue
      if (!t[adv.name]) t[adv.name] = { out: 0, inp: 0, talk: 0, tasks: 0, pv: 0, nc: 0 }
      t[adv.name].out   += Number(adv.out)  || 0
      t[adv.name].inp   += Number(adv.in)   || 0
      t[adv.name].talk  += parseTalkMins(adv.talk)
      t[adv.name].tasks += Number(adv.tasks) || 0
      t[adv.name].pv    += Number(adv.pagevisits)   || 0
      t[adv.name].nc    += Number(adv.notescreated) || 0
    }
  }
  return t
}

// ── Sub-components ────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94A3B8', margin: '0 0 14px', fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      {children}
    </p>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '22px 26px', marginBottom: 16, boxShadow: '0 2px 12px rgba(28,43,74,0.06)' }}>
      {children}
    </div>
  )
}

function NavBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 32, height: 32, borderRadius: 8, border: '1.5px solid #E2E8F0',
      background: disabled ? '#F1F5F9' : '#F8FAFC',
      cursor: disabled ? 'not-allowed' : 'pointer',
      color: disabled ? '#CBD5E1' : '#1C2B4A',
      fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
      lineHeight: 1,
    }}>
      {children}
    </button>
  )
}

function Delta({ curr, prev, dir }: { curr: number; prev: number; dir?: 'up' | 'down' }) {
  const diff = curr - prev
  if (diff === 0) return <span style={{ color: '#94A3B8', fontSize: 12 }}>—</span>
  let color = '#94A3B8'
  if (dir === 'up')   color = diff > 0 ? '#16A34A' : '#DC2626'
  if (dir === 'down') color = diff < 0 ? '#16A34A' : '#DC2626'
  return (
    <span style={{ color, fontSize: 12, fontWeight: 700 }}>
      {diff > 0 ? '+' : ''}{diff.toLocaleString()}
    </span>
  )
}

function EmptyState({ month }: { month: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '36px 0', color: '#94A3B8' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>No check-in data for {fmtMonth(month)}</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>Submit a check-in for this period to see results here.</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function MonthlyTab({ advEntries, fitterEntries }: { advEntries: any[]; fitterEntries: any[] }) {
  const nowYM = (() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })()

  const [ym,   setYM]   = useState(nowYM)
  const [team, setTeam] = useState<TeamType>('advocate')
  const [dept, setDept] = useState('cgm')

  const prevYM   = shiftMonth(ym, -1)
  const entries  = team === 'advocate' ? advEntries : fitterEntries
  const deptKeys = (team === 'advocate' ? ADV_DEPT_KEYS : FITTER_DEPT_KEYS) as readonly string[]
  const depts    = team === 'advocate' ? ADV_DEPTS : FITTER_DEPTS

  const currRows = useMemo(() => entries.filter(e => e.week_date && weekToYM(e.week_date) === ym),     [entries, ym])
  const prevRows = useMemo(() => entries.filter(e => e.week_date && weekToYM(e.week_date) === prevYM), [entries, prevYM])

  const currM  = useMemo(() => aggregateMetrics(currRows, dept), [currRows, dept])
  const prevM  = useMemo(() => aggregateMetrics(prevRows, dept), [prevRows, dept])
  const currPh = useMemo(() => aggregatePhone(currRows, dept),   [currRows, dept])

  const allYMs   = useMemo(() => { const s = new Set<string>(); entries.forEach(e => e.week_date && s.add(weekToYM(e.week_date))); return Array.from(s).sort() }, [entries])
  const hasPrev  = allYMs.some(m => m < ym)
  const hasNext  = ym < nowYM

  const deptDef  = (depts as any)[dept]
  const wkCount  = currRows.length

  const TH: React.CSSProperties = { textAlign: 'right', padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', whiteSpace: 'nowrap' }
  const TD: React.CSSProperties = { padding: '10px 10px', textAlign: 'right', color: '#64748B' }

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>

      {/* ── Month nav + team toggle ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>

          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <NavBtn onClick={() => setYM(shiftMonth(ym, -1))} disabled={!hasPrev}>‹</NavBtn>
            <div style={{ textAlign: 'center', minWidth: 170 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1C2B4A', fontFamily: 'Georgia,serif' }}>
                {fmtMonth(ym)}
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                {wkCount === 0 ? 'No data yet' : `${wkCount} week${wkCount !== 1 ? 's' : ''} of data`}
              </div>
            </div>
            <NavBtn onClick={() => setYM(shiftMonth(ym, 1))} disabled={!hasNext}>›</NavBtn>
          </div>

          {/* Team toggle */}
          <div style={{ display: 'flex', gap: 4, background: '#F8FAFC', borderRadius: 10, padding: 3, border: '1px solid #E2E8F0' }}>
            {(['advocate', 'fitter'] as TeamType[]).map(t => (
              <button key={t}
                onClick={() => { setTeam(t); setDept(t === 'advocate' ? 'cgm' : 'pfp') }}
                style={{
                  padding: '6px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                  background: team === t ? '#fff' : 'transparent',
                  color:      team === t ? '#1C2B4A' : '#94A3B8',
                  boxShadow:  team === t ? '0 1px 4px rgba(28,43,74,0.1)' : 'none',
                }}>
                {t === 'advocate' ? 'Advocate' : 'Fitter'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Dept tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: '#fff', borderRadius: 10, padding: '10px 14px', border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', alignSelf: 'center', marginRight: 4 }}>Team</span>
        {deptKeys.map(d => (
          <button key={d} onClick={() => setDept(d)} style={{
            padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border:      `1.5px solid ${dept === d ? DEPT_COLORS[d] : '#E2E8F0'}`,
            background:  dept === d ? DEPT_BG[d] : '#F8FAFC',
            color:       dept === d ? DEPT_COLORS[d] : '#64748B',
            transition: 'all 0.15s',
          }}>
            {(depts as any)[d].label}
          </button>
        ))}
      </div>

      {/* ── Report Metrics ── */}
      <Card>
        <SectionLabel>Report Metrics</SectionLabel>
        {wkCount === 0 ? <EmptyState month={ym} /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                  <th style={{ ...TH, textAlign: 'left', padding: '8px 0' }}>Metric</th>
                  <th style={TH}>{fmtMonth(ym)}</th>
                  <th style={TH}>{fmtMonth(prevYM)}</th>
                  <th style={{ ...TH, padding: '8px 0' }}>Change</th>
                </tr>
              </thead>
              <tbody>
                {deptDef?.metrics?.map((m: any, i: number) => {
                  const c = currM[m.id] || 0
                  const p = prevM[m.id] || 0
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #F8FAFC', background: i % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                      <td style={{ padding: '10px 0', color: '#1C2B4A', fontWeight: 500 }}>{m.label}</td>
                      <td style={{ ...TD, fontWeight: 700, color: '#1C2B4A', fontSize: 14 }}>{c.toLocaleString()}</td>
                      <td style={TD}>{p.toLocaleString()}</td>
                      <td style={{ ...TD, padding: '10px 0' }}><Delta curr={c} prev={p} dir={m.dir} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Phone Activity (advocate only) ── */}
      {team === 'advocate' && (
        <Card>
          <SectionLabel>Phone Activity — {fmtMonth(ym)}</SectionLabel>
          {wkCount === 0 ? <EmptyState month={ym} /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                    <th style={{ ...TH, textAlign: 'left', padding: '8px 0' }}>Advocate</th>
                    <th style={TH}>Outbound</th>
                    <th style={TH}>Inbound</th>
                    <th style={TH}>Talk Time</th>
                    <th style={TH}>Tasks</th>
                    <th style={TH}>Page Visits</th>
                    <th style={{ ...TH, padding: '8px 0' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {ADV_DEPTS[dept]?.advocates?.map((adv: any, i: number) => {
                    const ph = currPh[adv.name] || { out: 0, inp: 0, talk: 0, tasks: 0, pv: 0, nc: 0 }
                    return (
                      <tr key={adv.name} style={{ borderBottom: '1px solid #F8FAFC', background: i % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                        <td style={{ padding: '10px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: DEPT_COLORS[dept], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                              {adv.initials}
                            </div>
                            <span style={{ fontWeight: 500, color: '#1C2B4A' }}>{adv.name}</span>
                          </div>
                        </td>
                        <td style={{ ...TD, fontWeight: 700, color: '#1C2B4A' }}>{ph.out.toLocaleString()}</td>
                        <td style={TD}>{ph.inp.toLocaleString()}</td>
                        <td style={TD}>{fmtTalkMins(ph.talk)}</td>
                        <td style={TD}>{ph.tasks.toLocaleString()}</td>
                        <td style={TD}>{ph.pv.toLocaleString()}</td>
                        <td style={{ ...TD, padding: '10px 0' }}>{ph.nc.toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

    </div>
  )
}
