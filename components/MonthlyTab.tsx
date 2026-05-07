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

// Pastel palette matching the Weekly Narrative card colors.
// Indexes 0–3 are used for the metric KPI cards; index 4 (teal) is the Phone Activity color.
const KPI_PALETTE = [
  { bg: '#E3F2FD', fg: '#1565C0' }, // blue
  { bg: '#E8F5E9', fg: '#2E7D32' }, // green
  { bg: '#FFF3E0', fg: '#E65100' }, // amber
  { bg: '#F3E5F5', fg: '#6A1B9A' }, // purple
  { bg: '#E0F2F1', fg: '#00695C' }, // teal — Phone Activity
]
const PHONE_PALETTE = KPI_PALETTE[4]

const PHONE_METRIC_ID = '__phone_activity__'

// ── Helpers ──────────────────────────────────────────────────
function weekToYM(weekDate: string) {
  const d = new Date(weekDate + 'T12:00:00')
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function fmtMonthShort(ym: string) {
  const [, m] = ym.split('-')
  return new Date(2024, Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short' })
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

// Combined dept-wide activity score: outbound + inbound + tasks + notes
function aggregatePhoneCombined(entries: any[], deptKey: string): number {
  let total = 0
  for (const e of entries) {
    for (const adv of (e.advocates?.[deptKey] || [])) {
      total += (Number(adv.out) || 0) + (Number(adv.in) || 0)
             + (Number(adv.tasks) || 0) + (Number(adv.notescreated) || 0)
    }
  }
  return total
}

// Build last N months of metric + phone totals for trend chart
function buildTrend(entries: any[], deptKey: string, currYM: string, monthsBack = 6) {
  const months: { ym: string; values: Record<string, number>; phoneTotal: number }[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const targetYM = shiftMonth(currYM, -i)
    const monthRows = entries.filter(e => e.week_date && weekToYM(e.week_date) === targetYM)
    months.push({
      ym: targetYM,
      values: aggregateMetrics(monthRows, deptKey),
      phoneTotal: aggregatePhoneCombined(monthRows, deptKey),
    })
  }
  return months
}

function niceCeil(n: number): number {
  if (n <= 1) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(n)))
  return Math.ceil(n / mag) * mag
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

// Helper for inline delta rendering — used by both KpiCard and PhoneActivityCard
function deltaInfo(curr: number, prev: number, dir?: 'up' | 'down') {
  const diff = curr - prev
  let color = '#94A3B8'
  if (diff !== 0) {
    if (dir === 'up')   color = diff > 0 ? '#16A34A' : '#DC2626'
    if (dir === 'down') color = diff < 0 ? '#16A34A' : '#DC2626'
  }
  const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '–'
  const pct   = prev === 0 ? null : (diff / prev) * 100
  return { diff, color, arrow, pct }
}

// KPI card — styled to match Weekly Narrative cards
function KpiCard({ label, value, prevValue, dir, palette }: {
  label: string; value: number; prevValue: number; dir?: 'up' | 'down'; palette: { bg: string; fg: string };
}) {
  const { diff, color, arrow, pct } = deltaInfo(value, prevValue, dir)

  return (
    <div style={{
      flex: '1 1 180px',
      minWidth: 180,
      background: palette.bg,
      borderRadius: 10,
      padding: '14px 16px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
        fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em',
        color: palette.fg,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: palette.fg, flexShrink: 0 }} />
        {label}
      </div>

      <div style={{ fontSize: 26, fontWeight: 700, color: '#1C2B4A', lineHeight: 1.05 }}>
        {value.toLocaleString()}
      </div>

      <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <span style={{ color }}>{arrow}</span>
        <span style={{ color }}>{diff > 0 ? '+' : ''}{diff.toLocaleString()}</span>
        {pct !== null && (
          <span style={{ color: '#64748B', fontWeight: 500 }}>
            ({pct > 0 ? '+' : ''}{pct.toFixed(1)}%)
          </span>
        )}
        <span style={{ color: '#94A3B8', marginLeft: 2 }}>vs prev</span>
      </div>
    </div>
  )
}

// Phone Activity card — full-width, with team total + per-advocate breakdown
function PhoneActivityCard({ total, prevTotal, perUser, deptColor }: {
  total: number; prevTotal: number;
  perUser: { name: string; initials: string; score: number; prevScore: number }[];
  deptColor: string;
}) {
  const { diff, color, arrow, pct } = deltaInfo(total, prevTotal, 'up')
  const sorted = [...perUser].sort((a, b) => b.score - a.score)

  return (
    <div style={{
      background: PHONE_PALETTE.bg,
      borderRadius: 10,
      padding: '16px 18px',
      flex: '1 1 100%',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14,
        fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em',
        color: PHONE_PALETTE.fg,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: PHONE_PALETTE.fg, flexShrink: 0 }} />
        Phone Activity
      </div>

      {/* Body — team total on left, per-user breakdown on right */}
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>

        {/* Team total + formula description */}
        <div style={{ flex: '0 0 220px', minWidth: 200 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748B', marginBottom: 4 }}>
            Team Total
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1C2B4A', lineHeight: 1.05 }}>
            {total.toLocaleString()}
          </div>
          <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <span style={{ color }}>{arrow}</span>
            <span style={{ color }}>{diff > 0 ? '+' : ''}{diff.toLocaleString()}</span>
            {pct !== null && (
              <span style={{ color: '#64748B', fontWeight: 500 }}>
                ({pct > 0 ? '+' : ''}{pct.toFixed(1)}%)
              </span>
            )}
            <span style={{ color: '#94A3B8', marginLeft: 2 }}>vs prev</span>
          </div>

          {/* Description of how the score is calculated */}
          <div style={{
            marginTop: 14,
            paddingTop: 10,
            borderTop: '1px solid rgba(0,105,92,0.15)',
            fontSize: 11,
            color: '#475569',
            lineHeight: 1.55,
          }}>
            <span style={{ fontWeight: 700, color: PHONE_PALETTE.fg }}>How this is calculated:</span>{' '}
            outbound calls + inbound calls + tasks + notes, summed across every advocate in this department for the month.
          </div>
        </div>

        {/* Per-advocate breakdown */}
        <div style={{ flex: '1 1 280px', minWidth: 280 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748B', marginBottom: 8 }}>
            Per Advocate
          </div>
          {sorted.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94A3B8', padding: '8px 0' }}>No advocates configured.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sorted.map(u => {
                const u_diff  = u.score - u.prevScore
                const u_color = u_diff > 0 ? '#16A34A' : u_diff < 0 ? '#DC2626' : '#94A3B8'
                const u_arrow = u_diff > 0 ? '▲' : u_diff < 0 ? '▼' : '–'
                return (
                  <div key={u.name} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 8px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.55)',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: deptColor, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, flexShrink: 0,
                    }}>
                      {u.initials}
                    </div>
                    <span style={{
                      flex: 1, fontSize: 12.5, color: '#1C2B4A', fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {u.name}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1C2B4A', minWidth: 56, textAlign: 'right' }}>
                      {u.score.toLocaleString()}
                    </span>
                    <span style={{ fontSize: 11, color: u_color, fontWeight: 700, minWidth: 60, textAlign: 'right' }}>
                      {u_diff !== 0 ? `${u_arrow} ${u_diff > 0 ? '+' : ''}${u_diff.toLocaleString()}` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 6-month multi-line trend chart (pure SVG)
function TrendChart({ months, lines, currYM }: {
  months: { ym: string; values: Record<string, number>; phoneTotal: number }[];
  lines: { id: string; label: string; color: string }[];
  currYM: string;
}) {
  const W = 720, H = 240
  const PAD_L = 48, PAD_R = 16, PAD_T = 16, PAD_B = 32
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const getValue = (mo: typeof months[0], id: string) =>
    id === PHONE_METRIC_ID ? mo.phoneTotal : (mo.values[id] || 0)

  const allValues = months.flatMap(m => lines.map(l => getValue(m, l.id)))
  const rawMax    = Math.max(...allValues, 0)
  const niceMax   = niceCeil(rawMax || 1)

  const xStep = innerW / Math.max(months.length - 1, 1)
  const getX  = (i: number) => PAD_L + i * xStep
  const getY  = (v: number) => PAD_T + innerH - (v / niceMax) * innerH

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => f * niceMax)

  const polylines = lines.map(l => ({
    line: l,
    points: months.map((mo, i) => `${getX(i)},${getY(getValue(mo, l.id))}`).join(' '),
  }))

  const hasAnyData = rawMax > 0

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 8 }}>
        {lines.map(l => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 14, height: 3, borderRadius: 2, background: l.color }} />
            <span style={{ fontWeight: 500, color: '#1C2B4A' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {yTicks.map((t, i) => (
          <line key={i} x1={PAD_L} y1={getY(t)} x2={W - PAD_R} y2={getY(t)} stroke="#F1F5F9" strokeWidth="1" />
        ))}

        {yTicks.map((t, i) => (
          <text key={i} x={PAD_L - 8} y={getY(t) + 4} textAnchor="end" fontSize="10" fill="#94A3B8" fontFamily="'DM Sans','Segoe UI',sans-serif">
            {Math.round(t).toLocaleString()}
          </text>
        ))}

        {months.map((mo, i) => {
          const isCurr = mo.ym === currYM
          return (
            <text key={mo.ym}
              x={getX(i)} y={H - PAD_B + 18}
              textAnchor="middle"
              fontSize="11"
              fill={isCurr ? '#1C2B4A' : '#94A3B8'}
              fontWeight={isCurr ? 700 : 400}
              fontFamily="'DM Sans','Segoe UI',sans-serif">
              {fmtMonthShort(mo.ym)}
            </text>
          )
        })}

        {!hasAnyData && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="12" fill="#94A3B8" fontFamily="'DM Sans','Segoe UI',sans-serif">
            No data in this 6-month window
          </text>
        )}

        {hasAnyData && polylines.map(p => (
          <g key={p.line.id}>
            <polyline
              points={p.points}
              fill="none"
              stroke={p.line.color}
              strokeWidth="2.25"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {months.map((mo, i) => (
              <circle key={i}
                cx={getX(i)}
                cy={getY(getValue(mo, p.line.id))}
                r="3.5"
                fill="#fff"
                stroke={p.line.color}
                strokeWidth="2"
              />
            ))}
          </g>
        ))}
      </svg>
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
  const prevPh = useMemo(() => aggregatePhone(prevRows, dept),   [prevRows, dept])

  // Phone Activity combined totals (advocate-only)
  const currPhoneTotal = useMemo(() => aggregatePhoneCombined(currRows, dept), [currRows, dept])
  const prevPhoneTotal = useMemo(() => aggregatePhoneCombined(prevRows, dept), [prevRows, dept])

  // Phone Activity per-advocate combined scores (current + previous month)
  const phonePerUser = useMemo(() => {
    if (team !== 'advocate') return []
    return (ADV_DEPTS[dept]?.advocates || []).map((adv: any) => {
      const c = currPh[adv.name] || { out: 0, inp: 0, tasks: 0, nc: 0 }
      const p = prevPh[adv.name] || { out: 0, inp: 0, tasks: 0, nc: 0 }
      const score     = (c.out || 0) + (c.inp || 0) + (c.tasks || 0) + (c.nc || 0)
      const prevScore = (p.out || 0) + (p.inp || 0) + (p.tasks || 0) + (p.nc || 0)
      return { name: adv.name, initials: adv.initials, score, prevScore }
    })
  }, [team, dept, currPh, prevPh])

  const allYMs   = useMemo(() => { const s = new Set<string>(); entries.forEach(e => e.week_date && s.add(weekToYM(e.week_date))); return Array.from(s).sort() }, [entries])
  const hasPrev  = allYMs.some(m => m < ym)
  const hasNext  = ym < nowYM

  const deptDef  = (depts as any)[dept]
  const wkCount  = currRows.length

  // Top 4 metrics from dept config
  const topMetrics = useMemo(() => (deptDef?.metrics || []).slice(0, 4), [deptDef])

  // 6 months of trend data (for chart)
  const trendMonths = useMemo(() => buildTrend(entries, dept, ym, 6), [entries, dept, ym])

  // Chart lines: 4 metrics + Phone Activity (advocate only)
  const trendLines = useMemo(() => {
    const lines = topMetrics.map((m: any, i: number) => ({
      id: m.id, label: m.label, color: KPI_PALETTE[i % 4].fg,
    }))
    if (team === 'advocate') {
      lines.push({ id: PHONE_METRIC_ID, label: 'Phone Activity', color: PHONE_PALETTE.fg })
    }
    return lines
  }, [topMetrics, team])

  const TH: React.CSSProperties = { textAlign: 'right', padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', whiteSpace: 'nowrap' }
  const TD: React.CSSProperties = { padding: '10px 10px', textAlign: 'right', color: '#64748B' }

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>

      {/* ── Month nav + team toggle ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>

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

      {/* ── KPI cards + Phone Activity + 6-month trend (TOPMOST DATA SECTION) ── */}
      <Card>
        <SectionLabel>Monthly Key Metrics — {fmtMonth(ym)}</SectionLabel>

        {topMetrics.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontSize: 13 }}>
            No metrics defined for this department.
          </div>
        ) : (
          <>
            {/* Row of metric KPI cards */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: team === 'advocate' ? 16 : 24 }}>
              {topMetrics.map((m: any, idx: number) => (
                <KpiCard
                  key={m.id}
                  label={m.label}
                  value={currM[m.id] || 0}
                  prevValue={prevM[m.id] || 0}
                  dir={m.dir}
                  palette={KPI_PALETTE[idx % 4]}
                />
              ))}
            </div>

            {/* Phone Activity card (advocate only) */}
            {team === 'advocate' && (
              <div style={{ marginBottom: 24 }}>
                <PhoneActivityCard
                  total={currPhoneTotal}
                  prevTotal={prevPhoneTotal}
                  perUser={phonePerUser}
                  deptColor={DEPT_COLORS[dept]}
                />
              </div>
            )}

            {/* 6-month trend chart */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 18 }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94A3B8', margin: '0 0 12px' }}>
                6-Month Trend
              </p>
              <TrendChart months={trendMonths} lines={trendLines} currYM={ym} />
            </div>
          </>
        )}
      </Card>

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
