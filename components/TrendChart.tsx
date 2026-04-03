'use client'
import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { MetricDef } from '@/utils/metrics'

Chart.register(...registerables)

const PALETTE = [
  '#1565C0','#00838F','#E65100','#2E7D32','#6A1B9A',
  '#AD1457','#0277BD','#558B2F','#F57F17','#4527A0',
  '#00695C','#C62828','#1B5E20','#880E4F',
]

interface Entry {
  week_date: string
  week_label: string
  metrics: Record<string, Record<string, number>>
  advocates?: Record<string, { name: string; out: string; in: string; talk: string; tasks: string }[]>
}

interface Props {
  deptKey: string
  metrics: MetricDef[]
  entries: Entry[]
  accentColor: string
  advocates?: { name: string; initials: string }[]
}

function shortLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d); mon.setDate(diff)
  return mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function parseTalkTime(val: string): number {
  if (!val) return 0
  const hm = val.match(/(\d+)h\s*(\d+)m/)
  if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2])
  const colon = val.split(':')
  if (colon.length >= 2) return parseInt(colon[0]) * 60 + parseInt(colon[1])
  return 0
}

type ViewMode = 'metrics' | 'phone'

// Normalize datasets to 0-100 scale for readability when ranges differ wildly
function normalizeData(datasets: { label: string; data: (number|null)[]; color: string; rawMax: number }[]) {
  return datasets.map(ds => {
    const vals = ds.data.filter((v): v is number => v !== null)
    const max  = Math.max(...vals, 1)
    return { ...ds, normalizedData: ds.data.map(v => v === null ? null : Math.round((v / max) * 100)) }
  })
}

// Check if selected metrics span wildly different ranges (> 5x difference between max values)
function rangesVaryWidely(metrics: MetricDef[], active: Set<string>, entries: Entry[], deptKey: string): boolean {
  const maxVals = metrics
    .filter(m => active.has(m.id))
    .map(m => {
      const vals = entries.map(e => e.metrics?.[deptKey]?.[m.id]).filter((v): v is number => v !== undefined)
      return Math.max(...vals, 0)
    })
    .filter(v => v > 0)
  if (maxVals.length < 2) return false
  const hi = Math.max(...maxVals), lo = Math.min(...maxVals)
  return hi / lo > 5
}

export default function TrendChart({ deptKey, metrics, entries, accentColor, advocates = [] }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const chartRef    = useRef<Chart | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [view, setView]             = useState<ViewMode>('metrics')
  const [active, setActive]         = useState<Set<string>>(new Set(metrics.map(m => m.id)))
  const [activeAdv, setActiveAdv]   = useState<Set<string>>(new Set(advocates.map(a => a.name)))
  const [phoneMetric, setPhoneMetric] = useState<'out' | 'in' | 'talk'>('out')
  const [filterOpen, setFilterOpen] = useState(false)
  const [normalized, setNormalized] = useState(false)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Auto-suggest normalization when ranges vary widely
  const shouldSuggestNorm = view === 'metrics' && rangesVaryWidely(metrics, active, entries, deptKey)

  useEffect(() => {
    if (!canvasRef.current || !entries.length) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

    const labels = entries.map(e => shortLabel(e.week_date))
    let datasets: any[] = []

    if (view === 'metrics') {
      const activeMetrics = metrics.filter(m => active.has(m.id))
      const rawDatasets = activeMetrics.map(m => {
        const ci = metrics.indexOf(m)
        const data = entries.map(e => e.metrics?.[deptKey]?.[m.id] ?? null)
        const vals = data.filter((v): v is number => v !== null)
        return { label: m.label, data, color: PALETTE[ci % PALETTE.length], rawMax: Math.max(...vals, 0) }
      })

      if (normalized) {
        const normed = normalizeData(rawDatasets)
        datasets = normed.map(ds => ({
          label: ds.label,
          data: ds.normalizedData,
          borderColor: ds.color,
          backgroundColor: ds.color + '15',
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 7,
          borderWidth: 2,
          spanGaps: true,
          fill: false,
        }))
      } else {
        datasets = rawDatasets.map(ds => ({
          label: ds.label,
          data: ds.data,
          borderColor: ds.color,
          backgroundColor: ds.color + '15',
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 7,
          borderWidth: 2,
          spanGaps: true,
          fill: false,
        }))
      }
    } else {
      datasets = advocates.filter(a => activeAdv.has(a.name)).map((a, i) => {
        const color = PALETTE[i % PALETTE.length]
        const data  = entries.map(e => {
          const al = e.advocates?.[deptKey] || []
          const ae = al.find((x: any) => x.name === a.name)
          if (!ae) return null
          if (phoneMetric === 'out')  return parseInt(ae.out)  || null
          if (phoneMetric === 'in')   return parseInt(ae.in)   || null
          if (phoneMetric === 'talk') return parseTalkTime(ae.talk) || null
          return null
        })
        return { label: a.name, data, borderColor: color, backgroundColor: color + '25',
          tension: 0.35, pointRadius: 4, pointHoverRadius: 7,
          borderWidth: 2, spanGaps: true, fill: false }
      })
    }

    const isNorm = normalized && view === 'metrics'

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              font: { size: 11, family: 'Inter' },
              boxWidth: 12, boxHeight: 3,
              padding: 16,
              color: '#475569',
              usePointStyle: true,
              pointStyle: 'line',
            },
          },
          tooltip: {
            backgroundColor: 'rgba(10,35,66,0.92)',
            titleFont: { size: 12, family: 'Plus Jakarta Sans' },
            bodyFont: { size: 12, family: 'Inter' },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx: any) => {
                const v = ctx.parsed.y
                if (v === null || v === undefined) return ''
                if (isNorm) {
                  // Show actual value in tooltip even when normalized
                  const ds = ctx.dataset
                  const idx = ctx.dataIndex
                  const rawDs = metrics.filter(m => active.has(m.id))
                  const m = rawDs[ctx.datasetIndex]
                  const actual = m ? entries[idx]?.metrics?.[deptKey]?.[m.id] : null
                  return ` ${ctx.dataset.label}: ${actual?.toLocaleString() ?? v} (index: ${v})`
                }
                if (view === 'phone' && phoneMetric === 'talk') {
                  const h = Math.floor(v / 60), mn = v % 60
                  return ` ${ctx.dataset.label}: ${h}h ${mn}m`
                }
                return ` ${ctx.dataset.label}: ${v.toLocaleString()}`
              }
            }
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              font: { size: 11, family: 'Inter' },
              color: '#94A3B8',
              maxRotation: 0,
            },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              font: { size: 11, family: 'Inter' },
              color: '#94A3B8',
              padding: 8,
              callback: (v: any) => {
                if (isNorm) return v + (v === 100 ? ' (max)' : '')
                if (view === 'phone' && phoneMetric === 'talk') {
                  const h = Math.floor(v / 60), mn = v % 60
                  return mn === 0 ? `${h}h` : `${h}h${mn}m`
                }
                return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v
              }
            },
            beginAtZero: true,
            border: { display: false },
            ...(isNorm ? { min: 0, max: 100, title: { display: true, text: 'Normalized index (100 = each metric\'s own max)', font: { size: 10, family: 'Inter' }, color: '#94A3B8' } } : {}),
          },
        },
      },
    })
    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [entries, active, activeAdv, deptKey, metrics, view, phoneMetric, advocates, normalized])

  const latest = entries[entries.length - 1]
  const prev   = entries.length > 1 ? entries[entries.length - 2] : null

  // Find most recent entry with phone data (outbound/inbound/talk)
  const latestWithPhone = [...entries].reverse().find(e => {
    const advList = e.advocates?.[deptKey] || []
    return advList.some((a: any) => a.out || a.in || a.talk)
  })
  const phoneLatest = latestWithPhone || latest
  const phoneLatestIdx = latestWithPhone ? entries.indexOf(latestWithPhone) : entries.length - 1
  const phonePrev = phoneLatestIdx > 0 ? entries[phoneLatestIdx - 1] : null

  // Find most recent entry with pagevisits/notescreated data (may be a different week)
  const latestWithPV = [...entries].reverse().find(e => {
    const advList = e.advocates?.[deptKey] || []
    return advList.some((a: any) => a.pagevisits || a.notescreated)
  })
  const pvLatest = latestWithPV || phoneLatest
  const pvLatestIdx = latestWithPV ? entries.indexOf(latestWithPV) : phoneLatestIdx
  const pvPrev = pvLatestIdx > 0 ? entries[pvLatestIdx - 1] : null

  const filterItems = view === 'metrics'
    ? metrics.map(m => ({ id: m.id, label: m.label, checked: active.has(m.id) }))
    : advocates.map(a => ({ id: a.name, label: a.name, checked: activeAdv.has(a.name) }))

  const allChecked  = filterItems.every(i => i.checked)
  const noneChecked = filterItems.every(i => !i.checked)
  const activeCount = filterItems.filter(i => i.checked).length

  function toggleItem(id: string) {
    if (view === 'metrics') setActive(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
    else setActiveAdv(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function selectAll() {
    if (view === 'metrics') setActive(new Set(metrics.map(m => m.id)))
    else setActiveAdv(new Set(advocates.map(a => a.name)))
  }
  function clearAll() {
    if (view === 'metrics') setActive(new Set())
    else setActiveAdv(new Set())
  }

  return (
    <div>
      {/* controls row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
          {(['metrics', 'phone'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: view === v ? accentColor : '#F8FAFC', color: view === v ? '#fff' : '#64748B', transition: 'all 0.15s' }}>
              {v === 'metrics' ? 'Report metrics' : 'Phone activity'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {view === 'phone' && (
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
              {([['out','Outbound'],['in','Inbound'],['talk','Talk time']] as [string,string][]).map(([k,label]) => (
                <button key={k} onClick={() => setPhoneMetric(k as any)}
                  style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                    background: phoneMetric === k ? '#334155' : '#F8FAFC', color: phoneMetric === k ? '#fff' : '#64748B', transition: 'all 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* normalize toggle — only show when ranges vary */}
          {view === 'metrics' && shouldSuggestNorm && (
            <button onClick={() => setNormalized(n => !n)}
              title="Some metrics have very different scales. Normalizing shows relative trends instead of raw numbers."
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${normalized ? '#E65100' : '#E2E8F0'}`,
                borderRadius: 8,
                background: normalized ? '#FFF3E0' : '#F8FAFC',
                color: normalized ? '#E65100' : '#64748B', transition: 'all 0.15s' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M2 20h20M6 20V10M10 20V4M14 20V14M18 20V8"/>
              </svg>
              {normalized ? 'Normalized' : 'Normalize scale'}
            </button>
          )}

          {/* filter button */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button onClick={() => setFilterOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: `1.5px solid ${filterOpen ? accentColor : '#E2E8F0'}`, borderRadius: 8,
                background: filterOpen ? accentColor + '10' : '#F8FAFC', color: filterOpen ? accentColor : '#475569', transition: 'all 0.15s' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              Filter results
              {activeCount < filterItems.length && (
                <span style={{ background: accentColor, color: '#fff', fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>
                  {activeCount}
                </span>
              )}
            </button>

            {filterOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(10,35,66,0.12)', minWidth: 240, zIndex: 100, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {view === 'metrics' ? 'Metrics' : 'Advocates'}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={selectAll} style={{ fontSize: 11, fontWeight: 600, color: accentColor, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Select all</button>
                    <span style={{ color: '#E2E8F0' }}>|</span>
                    <button onClick={clearAll} style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear</button>
                  </div>
                </div>
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {filterItems.map((item, i) => (
                    <label key={item.id} onClick={() => toggleItem(item.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer',
                        background: item.checked ? accentColor + '08' : 'transparent',
                        borderBottom: i < filterItems.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        border: `2px solid ${item.checked ? accentColor : '#CBD5E1'}`,
                        background: item.checked ? accentColor : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.checked && (
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: 13, color: item.checked ? '#1E293B' : '#64748B', fontWeight: item.checked ? 500 : 400, flex: 1 }}>{item.label}</span>
                      {view === 'metrics' && item.checked && (
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: PALETTE[metrics.findIndex(m => m.id === item.id) % PALETTE.length], flexShrink: 0 }} />
                      )}
                    </label>
                  ))}
                </div>
                <div style={{ padding: '10px 14px', borderTop: '1px solid #F1F5F9' }}>
                  <button onClick={() => setFilterOpen(false)}
                    style={{ width: '100%', padding: 8, fontSize: 13, fontWeight: 700, background: accentColor, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer' }}>
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* normalize hint */}
      {shouldSuggestNorm && !normalized && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#FFF3E0', border: '1px solid #FED7AA', borderRadius: 8, marginBottom: 10, fontSize: 12, color: '#92400E' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          Some metrics have very different scales, making smaller values hard to see.
          <button onClick={() => setNormalized(true)} style={{ fontWeight: 700, color: '#E65100', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' }}>
            Normalize scale
          </button>
        </div>
      )}

      {/* chart */}
      {entries.length === 0 ? (
        <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, background: '#F0F6FF', border: '1.5px dashed #BFDBFE' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="1.5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#1565C0', margin: 0 }}>No data yet</p>
          <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Upload or submit a check-in to see trends</p>
        </div>
      ) : noneChecked ? (
        <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, background: '#F8FAFC', border: '1.5px dashed #E2E8F0' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#94A3B8', margin: 0 }}>No metrics selected</p>
          <button onClick={selectAll} style={{ fontSize: 12, color: accentColor, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Select all</button>
        </div>
      ) : (
        <div style={{ position: 'relative', height: 300, background: '#FAFBFD', borderRadius: 10, border: '1px solid #F1F5F9', padding: '12px 8px 4px' }}>
          <canvas ref={canvasRef} />
        </div>
      )}

      {/* metric snapshot */}
      {view === 'metrics' && latest && active.size > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748B', marginBottom: 10 }}>Latest week snapshot</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
            {metrics.filter(m => active.has(m.id)).map(m => {
              const val     = latest.metrics?.[deptKey]?.[m.id]
              const prevVal = prev?.metrics?.[deptKey]?.[m.id]
              if (val === undefined) return null
              let chgLabel = '', chgColor = '#64748B'
              if (prevVal !== undefined && prevVal !== null) {
                const diff = val - prevVal
                if (prevVal !== 0) {
                  const pct = Math.round((diff / prevVal) * 100), sign = diff > 0 ? '+' : ''
                  chgLabel = `${sign}${diff} (${sign}${pct}%)`
                } else { chgLabel = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '—' }
                const dir = m.dir || 'down'
                chgColor = diff === 0 ? '#64748B' : ((dir === 'down' && diff < 0) || (dir === 'up' && diff > 0)) ? '#2E7D32' : '#C62828'
              }
              const ci = metrics.indexOf(m)
              return (
                <div key={m.id} style={{ background: '#F8FAFC', border: `1px solid #E2E8F0`, borderRadius: 8, padding: '10px 12px', borderTop: `3px solid ${PALETTE[ci % PALETTE.length]}` }}>
                  <p style={{ fontSize: 11, color: '#64748B', lineHeight: 1.3, marginBottom: 6 }}>{m.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#0A2342', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: 2 }}>{val.toLocaleString()}</p>
                  {chgLabel && <p style={{ fontSize: 11, fontWeight: 600, color: chgColor, margin: 0 }}>{chgLabel}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* phone snapshot */}
      {view === 'phone' && latest && advocates.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748B', margin: 0 }}>Phone activity</p>
          {phoneLatest && (
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              — {phoneLatest.week_label || phoneLatest.week_date}
              {phoneLatest.week_date !== latest?.week_date && (
                <span style={{ color: '#E65100', marginLeft: 4 }}>(most recent data available)</span>
              )}
            </span>
          )}
        </div>
          <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F0F6FF', borderBottom: '1.5px solid #E2E8F0' }}>
                  {['Advocate','Outbound','Inbound','Talk time','Tasks open','Page Visits','Notes Created'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: accentColor }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {advocates.filter(a => activeAdv.has(a.name)).map((a, i) => {
                  // For each field, find the most recent entry that has a value for this advocate
                  const getLatestField = (field: string, afterIdx?: number) => {
                    const limit = afterIdx !== undefined ? afterIdx : entries.length
                    for (let ei = limit - 1; ei >= 0; ei--) {
                      const advList = entries[ei].advocates?.[deptKey] || []
                      const adv = advList.find((x: any) => x.name === a.name)
                      const advAny = adv as any
                      if (advAny && advAny[field] !== '' && advAny[field] !== null && advAny[field] !== undefined) {
                        return { value: advAny[field], entryIdx: ei }
                      }
                    }
                    return { value: null, entryIdx: -1 }
                  }

                  const outData  = getLatestField('out')
                  const inData   = getLatestField('in')
                  const talkData = getLatestField('talk')
                  const pvData   = getLatestField('pagevisits')
                  const ncData   = getLatestField('notescreated')

                  const getPrev = (field: string, curIdx: number) => {
                    if (curIdx <= 0) return null
                    return getLatestField(field, curIdx).value
                  }

                  const numDelta = (curVal: any, prvVal: any, higherIsBetter = true) => {
                    const cv = parseFloat(String(curVal).replace(/[^\d.]/g, '')) || 0
                    const pv = parseFloat(String(prvVal).replace(/[^\d.]/g, '')) || 0
                    if (!curVal || !prvVal || pv === 0) return null
                    const diff = cv - pv
                    const pct  = Math.round((diff / pv) * 100)
                    const sign = diff > 0 ? '+' : ''
                    const improving = higherIsBetter ? diff > 0 : diff < 0
                    return {
                      label: `${sign}${pct}%`,
                      color: diff === 0 ? '#94A3B8' : improving ? '#2E7D32' : '#C62828',
                      bg:    diff === 0 ? 'transparent' : improving ? '#F0FDF4' : '#FFF5F5',
                    }
                  }

                  const Cell = ({ val, prev, higherIsBetter = true }: { val: any, prev: any, higherIsBetter?: boolean }) => {
                    const d = numDelta(val, prev, higherIsBetter)
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{ fontWeight: 700, color: val ? '#0A2342' : '#CBD5E1', fontSize: 13 }}>{val || '—'}</span>
                        {d && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: d.color, background: d.bg, padding: '1px 5px', borderRadius: 4 }}>
                            {d.label}
                          </span>
                        )}
                      </div>
                    )
                  }

                  return (
                    <tr key={a.name} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: PALETTE[i % PALETTE.length], color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{a.initials}</div>
                          <span style={{ fontWeight: 600, color: '#334155' }}>{a.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}><Cell val={outData.value} prev={getPrev('out', outData.entryIdx)} /></td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}><Cell val={inData.value} prev={getPrev('in', inData.entryIdx)} /></td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}><Cell val={talkData.value} prev={getPrev('talk', talkData.entryIdx)} higherIsBetter={false} /></td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#CBD5E1', fontSize: 13 }}>—</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}><Cell val={pvData.value} prev={getPrev('pagevisits', pvData.entryIdx)} /></td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}><Cell val={ncData.value} prev={getPrev('notescreated', ncData.entryIdx)} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
