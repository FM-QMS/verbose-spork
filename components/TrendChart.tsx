'use client'
import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { MetricDef } from '@/utils/metrics'

Chart.register(...registerables)

const PALETTE = ['#1565C0','#00838F','#2E7D32','#E65100','#6A1B9A','#AD1457','#0277BD','#558B2F','#F57F17','#4527A0','#00695C','#C62828','#1B5E20','#880E4F']

interface Entry { week_date: string; week_label: string; metrics: Record<string, Record<string, number>> }

interface Props {
  deptKey: string
  metrics: MetricDef[]
  entries: Entry[]
  accentColor: string
}

function shortLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d); mon.setDate(diff)
  return mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function TrendChart({ deptKey, metrics, entries, accentColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<Chart | null>(null)
  const [active, setActive] = useState<Set<string>>(new Set(metrics.slice(0, 4).map(m => m.id)))

  useEffect(() => {
    if (!canvasRef.current || !entries.length) return
    if (chartRef.current) chartRef.current.destroy()
    const labels   = entries.map(e => shortLabel(e.week_date))
    const datasets = metrics
      .filter(m => active.has(m.id))
      .map(m => {
        const ci = metrics.indexOf(m)
        return {
          label: m.label,
          data: entries.map(e => e.metrics?.[deptKey]?.[m.id] ?? null),
          borderColor: PALETTE[ci % PALETTE.length],
          backgroundColor: PALETTE[ci % PALETTE.length] + '18',
          tension: 0.4, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2, spanGaps: true,
        }
      })
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11, family: 'Inter' }, boxWidth: 10, padding: 14, color: '#475569' },
          },
          tooltip: { bodyFont: { size: 11, family: 'Inter' }, titleFont: { size: 11, family: 'Inter' } },
        },
        scales: {
          x: {
            grid: { color: 'rgba(10,35,66,0.05)' },
            ticks: { font: { size: 11, family: 'Inter' }, color: '#64748B' },
          },
          y: {
            grid: { color: 'rgba(10,35,66,0.05)' },
            ticks: { font: { size: 11, family: 'Inter' }, color: '#64748B' },
            beginAtZero: true,
          },
        },
      },
    })
    return () => { chartRef.current?.destroy() }
  }, [entries, active, deptKey, metrics])

  const latest = entries[entries.length - 1]
  const prev   = entries.length > 1 ? entries[entries.length - 2] : null

  return (
    <div>
      {/* toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {metrics.map(m => {
          const on  = active.has(m.id)
          const ci  = metrics.indexOf(m)
          const col = PALETTE[ci % PALETTE.length]
          return (
            <button
              key={m.id}
              onClick={() => setActive(prev => {
                const next = new Set(prev)
                on ? next.delete(m.id) : next.add(m.id)
                return next
              })}
              className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
              style={on
                ? { background: col + '15', color: col, borderColor: col }
                : { background: '#F8FAFC', color: '#94A3B8', borderColor: '#E2E8F0' }
              }
            >
              {m.label}
            </button>
          )
        })}
      </div>

      {entries.length === 0
        ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 rounded-lg" style={{ background: '#F0F6FF', border: '1.5px dashed #BFDBFE' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="1.5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            <p className="text-sm font-medium" style={{ color: '#1565C0' }}>No data yet</p>
            <p className="text-xs" style={{ color: '#64748B' }}>Submit your first check-in to see trends</p>
          </div>
        )
        : <div className="relative h-64"><canvas ref={canvasRef} /></div>
      }

      {/* snapshot */}
      {latest && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#64748B' }}>Latest week snapshot</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {metrics.map(m => {
              const val     = latest.metrics?.[deptKey]?.[m.id]
              const prevVal = prev?.metrics?.[deptKey]?.[m.id]
              if (val === undefined) return null
              let chgLabel = '', chgColor = '#64748B'
              if (prevVal !== undefined && prevVal !== 0) {
                const diff = val - prevVal, pct = Math.round((diff / prevVal) * 100), sign = diff > 0 ? '+' : ''
                chgLabel = `${sign}${diff} (${sign}${pct}%)`
                const dir = m.dir || 'down'
                chgColor = diff === 0 ? '#64748B' : ((dir === 'down' && diff < 0) || (dir === 'up' && diff > 0)) ? '#2E7D32' : '#C62828'
              }
              return (
                <div key={m.id} className="rounded-lg p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <p className="text-xs leading-tight mb-1.5" style={{ color: '#64748B' }}>{m.label}</p>
                  <p className="text-xl font-bold" style={{ color: '#0A2342', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{val.toLocaleString()}</p>
                  {chgLabel && <p className="text-xs font-semibold mt-0.5" style={{ color: chgColor }}>{chgLabel}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
