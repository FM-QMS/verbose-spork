'use client'
import { useState, useMemo } from 'react'
import { ADV_DEPTS, FITTER_DEPTS, ADV_DEPT_KEYS, FITTER_DEPT_KEYS } from '@/utils/metrics'

interface Entry {
  id: string
  week_date: string
  week_label: string
  type: string
  submitter?: string
  notes_meta?: string
  metrics: Record<string, Record<string, number>>
  advocates?: Record<string, { name: string; out: string; in: string; talk: string; tasks: string }[]>
  wins?: string
  blockers?: string
}

interface Props {
  entries: Entry[]
  type: 'advocate' | 'fitter'
}

const DEPT_COLORS: Record<string, string> = {
  cgm: '#1565C0', shoe: '#00695C', chase: '#E65100', pfp: '#4527A0', fitter: '#BF360C',
}
const DEPT_BG: Record<string, string> = {
  cgm: '#E3F0FF', shoe: '#E0F2F1', chase: '#FFF3E0', pfp: '#EDE7F6', fitter: '#FBE9E7',
}

function shortDate(d: string) {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  catch { return d }
}

function deltaStyle(diff: number, dir: 'up' | 'down' = 'down') {
  if (diff === 0) return { color: '#94A3B8', label: '—' }
  const sign = diff > 0 ? '+' : ''
  const improving = (dir === 'down' && diff < 0) || (dir === 'up' && diff > 0)
  return {
    color: improving ? '#2E7D32' : '#C62828',
    label: `${sign}${diff.toLocaleString()}`,
    bg: improving ? '#F0FDF4' : '#FFF5F5',
  }
}

export default function HistoryTable({ entries, type }: Props) {
  const deptKeys  = type === 'advocate' ? (ADV_DEPT_KEYS as unknown as string[]) : (FITTER_DEPT_KEYS as unknown as string[])
  const depts     = type === 'advocate' ? ADV_DEPTS : FITTER_DEPTS

  const [fromDate, setFromDate]         = useState('')
  const [toDate, setToDate]             = useState('')
  const [activeDept, setActiveDept]     = useState(deptKeys[0])
  const [showPhone, setShowPhone]       = useState(false)
  const [selectedWeeks, setSelectedWeeks] = useState<Set<string>>(new Set())
  const [maxWeeks, setMaxWeeks]         = useState(6)

  // Filter by date range
  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (fromDate && e.week_date < fromDate) return false
      if (toDate   && e.week_date > toDate)   return false
      return true
    })
  }, [entries, fromDate, toDate])

  // Show last N weeks, sorted newest first for display
  const displayed = useMemo(() => {
    return [...filtered].sort((a, b) => b.week_date.localeCompare(a.week_date)).slice(0, maxWeeks)
  }, [filtered, maxWeeks])

  // For comparisons, keep chronological order
  const chrono = useMemo(() => [...displayed].sort((a, b) => a.week_date.localeCompare(b.week_date)), [displayed])

  const dept     = depts[activeDept]
  const metrics  = dept?.metrics || []
  const advocates = type === 'advocate' ? (ADV_DEPTS as any)[activeDept]?.advocates || [] : []

  if (entries.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: 8 }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500, margin: 0 }}>No check-ins saved yet</p>
      </div>
    )
  }

  return (
    <div>
      {/* controls bar */}
      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date range</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              style={{ width: 148, fontSize: 13, padding: '6px 10px', border: '1.5px solid #E2E8F0', borderRadius: 7, background: '#fff', color: '#334155' }} />
            <span style={{ fontSize: 12, color: '#94A3B8' }}>to</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              style={{ width: 148, fontSize: 13, padding: '6px 10px', border: '1.5px solid #E2E8F0', borderRadius: 7, background: '#fff', color: '#334155' }} />
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(''); setToDate('') }}
                style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Show weeks</p>
          <div style={{ display: 'flex', borderRadius: 7, overflow: 'hidden', border: '1.5px solid #E2E8F0' }}>
            {[4, 6, 8, 12].map(n => (
              <button key={n} onClick={() => setMaxWeeks(n)}
                style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: maxWeeks === n ? '#0A2342' : '#F8FAFC', color: maxWeeks === n ? '#fff' : '#64748B' }}>
                {n}w
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>
            Showing <strong style={{ color: '#0A2342' }}>{displayed.length}</strong> of {filtered.length} weeks
          </span>
        </div>
      </div>

      {/* dept tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {deptKeys.map(dk => (
          <button key={dk} onClick={() => setActiveDept(dk)}
            style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 20, cursor: 'pointer',
              border: `1.5px solid ${activeDept === dk ? DEPT_COLORS[dk] : '#E2E8F0'}`,
              background: activeDept === dk ? DEPT_BG[dk] : '#F8FAFC',
              color: activeDept === dk ? DEPT_COLORS[dk] : '#64748B', transition: 'all 0.15s' }}>
            {depts[dk]?.label}
          </button>
        ))}
        {type === 'advocate' && (
          <button onClick={() => setShowPhone(p => !p)}
            style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 20, cursor: 'pointer', marginLeft: 'auto',
              border: `1.5px solid ${showPhone ? '#334155' : '#E2E8F0'}`,
              background: showPhone ? '#F1F5F9' : '#F8FAFC',
              color: showPhone ? '#334155' : '#64748B' }}>
            {showPhone ? 'Hide phone' : 'Show phone activity'}
          </button>
        )}
      </div>

      {displayed.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
          No check-ins in this date range.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #E2E8F0' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: '100%' }}>
            <thead>
              {/* week header row */}
              <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', background: '#F8FAFC', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', position: 'sticky', left: 0, zIndex: 2, minWidth: 200, borderRight: '2px solid #E2E8F0' }}>
                  Metric
                </th>
                {chrono.map((e, i) => {
                  const isLatest = i === chrono.length - 1
                  return (
                    <th key={e.week_date} style={{ padding: '10px 14px', textAlign: 'center', background: isLatest ? DEPT_BG[activeDept] : '#F8FAFC', minWidth: 120, borderLeft: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isLatest ? DEPT_COLORS[activeDept] : '#334155' }}>
                        {shortDate(e.week_date)}
                      </div>
                      {e.submitter && (
                        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{e.submitter}</div>
                      )}
                      {isLatest && (
                        <div style={{ fontSize: 9, fontWeight: 700, color: DEPT_COLORS[activeDept], textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Latest</div>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, mi) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9', background: mi % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                  {/* metric label */}
                  <td style={{ padding: '8px 14px', fontWeight: 500, color: '#334155', fontSize: 12, position: 'sticky', left: 0, background: mi % 2 === 0 ? '#fff' : '#FAFBFC', borderRight: '2px solid #E2E8F0', zIndex: 1 }}>
                    {m.label}
                  </td>
                  {/* values per week */}
                  {chrono.map((e, wi) => {
                    const val     = e.metrics?.[activeDept]?.[m.id]
                    const prevE   = wi > 0 ? chrono[wi - 1] : null
                    const prevVal = prevE?.metrics?.[activeDept]?.[m.id]
                    const isLatest = wi === chrono.length - 1

                    let delta = null
                    if (val !== undefined && prevVal !== undefined) {
                      delta = deltaStyle(val - prevVal, m.dir || 'down')
                    }

                    return (
                      <td key={e.week_date} style={{ padding: '8px 14px', textAlign: 'center', borderLeft: '1px solid #F1F5F9', background: isLatest ? DEPT_BG[activeDept] + '60' : 'transparent' }}>
                        {val !== undefined ? (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A2342', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                              {val.toLocaleString()}
                            </div>
                            {delta && delta.label !== '—' && (
                              <div style={{ fontSize: 10, fontWeight: 600, color: delta.color, marginTop: 2 }}>
                                {delta.label}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#CBD5E1', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* phone activity rows */}
              {showPhone && advocates.length > 0 && (
                <>
                  <tr>
                    <td colSpan={chrono.length + 1} style={{ padding: '8px 14px', background: '#F1F5F9', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: DEPT_COLORS[activeDept], position: 'sticky', left: 0 }}>
                      Phone activity
                    </td>
                  </tr>
                  {advocates.map((adv: any, ai: number) => (
                    ['Outbound', 'Inbound', 'Talk time'].map((field, fi) => (
                      <tr key={`${adv.name}-${field}`} style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFBFC' }}>
                        <td style={{ padding: '7px 14px 7px 24px', color: '#64748B', fontSize: 12, position: 'sticky', left: 0, background: '#FAFBFC', borderRight: '2px solid #E2E8F0', zIndex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {fi === 0 && (
                              <div style={{ width: 18, height: 18, borderRadius: '50%', background: DEPT_COLORS[activeDept], color: '#fff', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {adv.initials}
                              </div>
                            )}
                            {fi > 0 && <div style={{ width: 18, flexShrink: 0 }} />}
                            <span style={{ fontWeight: fi === 0 ? 600 : 400, color: fi === 0 ? '#334155' : '#64748B' }}>
                              {fi === 0 ? adv.name : field}
                            </span>
                            {fi === 0 && <span style={{ color: '#CBD5E1', fontSize: 11 }}>— {field}</span>}
                          </div>
                        </td>
                        {chrono.map((e, wi) => {
                          const advList = e.advocates?.[activeDept] || []
                          const advEntry = advList.find((x: any) => x.name === adv.name)
                          const fieldKey = field === 'Outbound' ? 'out' : field === 'Inbound' ? 'in' : 'talk'
                          const v = advEntry ? (advEntry as any)[fieldKey] : null
                          const isLatest = wi === chrono.length - 1
                          return (
                            <td key={e.week_date} style={{ padding: '7px 14px', textAlign: 'center', borderLeft: '1px solid #F1F5F9', fontSize: 12, fontWeight: 500, color: v ? '#334155' : '#CBD5E1', background: isLatest ? DEPT_BG[activeDept] + '60' : 'transparent' }}>
                              {v || '—'}
                            </td>
                          )
                        })}
                      </tr>
                    ))
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* narrative section */}
      {chrono.some(e => e.wins || e.blockers) && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748B', marginBottom: 10 }}>Weekly narratives</p>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(chrono.length, 3)}, minmax(0,1fr))`, gap: 10 }}>
            {chrono.filter(e => e.wins || e.blockers).map(e => (
              <div key={e.week_date} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#0A2342', marginBottom: 8, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{shortDate(e.week_date)}</p>
                {e.wins && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#2E7D32', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wins</span>
                    <p style={{ fontSize: 12, color: '#475569', marginTop: 2, lineHeight: 1.5 }}>{e.wins}</p>
                  </div>
                )}
                {e.blockers && (
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#C62828', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Blockers</span>
                    <p style={{ fontSize: 12, color: '#475569', marginTop: 2, lineHeight: 1.5 }}>{e.blockers}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
