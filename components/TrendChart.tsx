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
  advocates?: Record<string, {
    name: string; out: string; in: string; talk: string; tasks: string
  }[]>
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
  // handles "8h 27m", "2:45", "02:55:14"
  const hm = val.match(/(\d+)h\s*(\d+)m/)
  if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2])
  const colon = val.split(':')
  if (colon.length >= 2) return parseInt(colon[0]) * 60 + parseInt(colon[1])
  return 0
}

type ViewMode = 'metrics' | 'phone'

export default function TrendChart({ deptKey, metrics, entries, accentColor, advocates = [] }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const chartRef   = useRef<Chart | null>(null)
  const [view, setView]     = useState<ViewMode>('metrics')
  const [active, setActive] = useState<Set<string>>(
    new Set(metrics.slice(0, 2).map(m => m.id))  // default only 2 — much cleaner
  )
  const [activeAdv, setActiveAdv] = useState<Set<string>>(
    new Set(advocates.map(a => a.name))
  )
  const [phoneMetric, setPhoneMetric] = useState<'out' | 'in' | 'talk'>('out')

  // rebuild chart whenever anything changes
  useEffect(() => {
    if (!canvasRef.current || !entries.length) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

    const labels = entries.map(e => shortLabel(e.week_date))

    let datasets: any[] = []

    if (view === 'metrics') {
      datasets = metrics
        .filter(m => active.has(m.id))
        .map((m, i) => {
          const ci = metrics.indexOf(m)
          return {
            label: m.label,
            data: entries.map(e => e.metrics?.[deptKey]?.[m.id] ?? null),
            borderColor: PALETTE[ci % PALETTE.length],
            backgroundColor: PALETTE[ci % PALETTE.length] + '18',
            tension: 0.3,
            pointRadius: entries.length <= 4 ? 6 : 4,
            pointHoverRadius: 8,
            borderWidth: 2.5,
            spanGaps: true,
            fill: false,
          }
        })
    } else {
      // phone view — one dataset per advocate
      datasets = advocates
        .filter(a => activeAdv.has(a.name))
        .map((a, i) => {
          const color = PALETTE[i % PALETTE.length]
          const data = entries.map(e => {
            const advList = e.advocates?.[deptKey] || []
            const advEntry = advList.find((x: any) => x.name === a.name)
            if (!advEntry) return null
            if (phoneMetric === 'out')  return parseInt(advEntry.out)  || null
            if (phoneMetric === 'in')   return parseInt(advEntry.in)   || null
            if (phoneMetric === 'talk') return parseTalkTime(advEntry.talk) || null
            return null
          })
          return {
            label: a.name,
            data,
            borderColor: color,
            backgroundColor: color + '25',
            tension: 0.3,
            pointRadius: entries.length <= 4 ? 6 : 4,
            pointHoverRadius: 8,
            borderWidth: 2.5,
            spanGaps: true,
            fill: false,
          }
        })
    }

    const yLabel = view === 'phone' && phoneMetric === 'talk' ? 'Minutes' : 'Count'

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 11, family: 'Inter' },
              boxWidth: 10,
              padding: 14,
              color: '#475569',
            },
          },
          tooltip: {
            bodyFont: { size: 11, family: 'Inter' },
            titleFont: { size: 12, family: 'Inter' },
            callbacks: {
              label: (ctx: any) => {
                const v = ctx.parsed.y
                if (v === null) return ''
                if (view === 'phone' && phoneMetric === 'talk') {
                  const h = Math.floor(v / 60), m = v % 60
                  return ` ${ctx.dataset.label}: ${h}h ${m}m`
                }
                return ` ${ctx.dataset.label}: ${v.toLocaleString()}`
              }
            }
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(10,35,66,0.04)' },
            ticks: { font: { size: 11, family: 'Inter' }, color: '#64748B' },
          },
          y: {
            grid: { color: 'rgba(10,35,66,0.04)' },
            ticks: {
              font: { size: 11, family: 'Inter' },
              color: '#64748B',
              callback: (v: any) => {
                if (view === 'phone' && phoneMetric === 'talk') {
                  const h = Math.floor(v / 60), m = v % 60
                  return m === 0 ? `${h}h` : `${h}h${m}m`
                }
                return v >= 1000 ? `${(v/1000).toFixed(1)}k` : v
              }
            },
            beginAtZero: true,
            title: {
              display: true,
              text: yLabel,
              font: { size: 10, family: 'Inter' },
              color: '#94A3B8',
            }
          },
        },
      },
    })
    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [entries, active, activeAdv, deptKey, metrics, view, phoneMetric, advocates])

  const latest = entries[entries.length - 1]
  const prev   = entries.length > 1 ? entries[entries.length - 2] : null

  return (
    <div>
      {/* view switcher */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
          {(['metrics', 'phone'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-3 py-1.5 text-xs font-semibold transition-all"
              style={view === v
                ? { background: accentColor, color: '#fff' }
                : { background: '#F8FAFC', color: '#64748B' }
              }>
              {v === 'metrics' ? 'Report metrics' : 'Phone activity'}
            </button>
          ))}
        </div>

        {view === 'phone' && (
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
            {([['out','Outbound'],['in','Inbound'],['talk','Talk time']] as [string,string][]).map(([k,label]) => (
              <button key={k} onClick={() => setPhoneMetric(k as any)}
                className="px-3 py-1.5 text-xs font-semibold transition-all"
                style={phoneMetric === k
                  ? { background: '#334155', color: '#fff' }
                  : { background: '#F8FAFC', color: '#64748B' }
                }>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* metric toggles */}
      {view === 'metrics' && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {metrics.map(m => {
            const on  = active.has(m.id)
            const col = PALETTE[metrics.indexOf(m) % PALETTE.length]
            return (
              <button key={m.id} onClick={() => setActive(prev => {
                const next = new Set(prev); on ? next.delete(m.id) : next.add(m.id); return next
              })}
                className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                style={on
                  ? { background: col + '18', color: col, borderColor: col }
                  : { background: '#F8FAFC', color: '#94A3B8', borderColor: '#E2E8F0' }
                }>
                {m.label}
              </button>
            )
          })}
        </div>
      )}

      {/* advocate toggles */}
      {view === 'phone' && advocates.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {advocates.map((a, i) => {
            const on  = activeAdv.has(a.name)
            const col = PALETTE[i % PALETTE.length]
            return (
              <button key={a.name} onClick={() => setActiveAdv(prev => {
                const next = new Set(prev); on ? next.delete(a.name) : next.add(a.name); return next
              })}
                className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                style={on
                  ? { background: col + '18', color: col, borderColor: col }
                  : { background: '#F8FAFC', color: '#94A3B8', borderColor: '#E2E8F0' }
                }>
                {a.name}
              </button>
            )
          })}
        </div>
      )}

      {/* chart */}
      {entries.length === 0
        ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 rounded-lg"
            style={{ background: '#F0F6FF', border: '1.5px dashed #BFDBFE' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="1.5">
              <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
            </svg>
            <p className="text-sm font-medium" style={{ color: '#1565C0' }}>No data yet</p>
            <p className="text-xs" style={{ color: '#64748B' }}>Upload or submit a check-in to see trends</p>
          </div>
        )
        : <div className="relative h-64"><canvas ref={canvasRef} /></div>
      }

      {/* snapshot — metrics view */}
      {view === 'metrics' && latest && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#64748B' }}>
            Latest week snapshot
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {metrics.map(m => {
              const val     = latest.metrics?.[deptKey]?.[m.id]
              const prevVal = prev?.metrics?.[deptKey]?.[m.id]
              if (val === undefined) return null
              let chgLabel = '', chgColor = '#64748B'
              if (prevVal !== undefined && prevVal !== null) {
                const diff = val - prevVal
                if (prevVal !== 0) {
                  const pct = Math.round((diff / prevVal) * 100), sign = diff > 0 ? '+' : ''
                  chgLabel = `${sign}${diff} (${sign}${pct}%)`
                } else {
                  chgLabel = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '—'
                }
                const dir = m.dir || 'down'
                chgColor = diff === 0 ? '#64748B'
                  : ((dir === 'down' && diff < 0) || (dir === 'up' && diff > 0))
                    ? '#2E7D32' : '#C62828'
              }
              return (
                <div key={m.id} className="rounded-lg p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <p className="text-xs leading-tight mb-1.5" style={{ color: '#64748B' }}>{m.label}</p>
                  <p className="text-xl font-bold" style={{ color: '#0A2342', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {val.toLocaleString()}
                  </p>
                  {chgLabel && <p className="text-xs font-semibold mt-0.5" style={{ color: chgColor }}>{chgLabel}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* snapshot — phone view */}
      {view === 'phone' && latest && advocates.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#64748B' }}>
            Latest week — phone activity
          </p>
          <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #E2E8F0' }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: '#F0F6FF', borderBottom: '1.5px solid #E2E8F0' }}>
                  {['Advocate','Outbound','Inbound','Talk time','Tasks open'].map(h => (
                    <th key={h} className="py-2 px-3 text-xs font-semibold text-left"
                      style={{ color: accentColor }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {advocates.map((a, i) => {
                  const advList = latest.advocates?.[deptKey] || []
                  const cur  = advList.find((x: any) => x.name === a.name)
                  const prevList = prev?.advocates?.[deptKey] || []
                  const prv  = prevList.find((x: any) => x.name === a.name)

                  const delta = (field: 'out' | 'in') => {
                    if (!cur || !prv) return null
                    const c = parseInt((cur as any)[field]) || 0
                    const p = parseInt((prv as any)[field]) || 0
                    if (p === 0) return null
                    const diff = c - p, sign = diff > 0 ? '+' : ''
                    return { label: `${sign}${diff}`, color: diff > 0 ? '#2E7D32' : diff < 0 ? '#C62828' : '#64748B' }
                  }

                  return (
                    <tr key={a.name} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: PALETTE[i % PALETTE.length], fontSize: 9 }}>{a.initials}</div>
                          <span className="font-medium text-xs" style={{ color: '#334155' }}>{a.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-xs font-semibold" style={{ color: '#0A2342' }}>{cur?.out || '—'}</span>
                        {delta('out') && <span className="text-xs ml-1.5 font-medium" style={{ color: delta('out')!.color }}>{delta('out')!.label}</span>}
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-xs font-semibold" style={{ color: '#0A2342' }}>{cur?.in || '—'}</span>
                        {delta('in') && <span className="text-xs ml-1.5 font-medium" style={{ color: delta('in')!.color }}>{delta('in')!.label}</span>}
                      </td>
                      <td className="py-2 px-3 text-xs font-semibold" style={{ color: '#0A2342' }}>{cur?.talk || '—'}</td>
                      <td className="py-2 px-3 text-xs font-semibold" style={{ color: '#0A2342' }}>{cur?.tasks || '—'}</td>
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
