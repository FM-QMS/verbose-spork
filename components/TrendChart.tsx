'use client'
import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { MetricDef } from '@/utils/metrics'

Chart.register(...registerables)

const PALETTE = ['#378ADD','#BA7517','#639922','#E24B4A','#7F77DD','#1D9E75','#D85A30','#5DCAA5','#EF9F27','#97C459','#AFA9EC','#F0997B','#9FE1CB','#B5D4F4']

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
      .map((m, i) => ({
        label: m.label,
        data: entries.map(e => e.metrics?.[deptKey]?.[m.id] ?? null),
        borderColor: PALETTE[metrics.indexOf(m) % PALETTE.length],
        backgroundColor: PALETTE[metrics.indexOf(m) % PALETTE.length] + '22',
        tension: 0.35, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2, spanGaps: true,
      }))

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11, family: 'DM Sans' }, boxWidth: 10, padding: 14 } },
          tooltip: { bodyFont: { size: 11 }, titleFont: { size: 11 } },
        },
        scales: {
          x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10, family: 'DM Sans' } } },
          y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10, family: 'DM Sans' } }, beginAtZero: true },
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
      <div className="flex flex-wrap gap-1.5 mb-3">
        {metrics.map(m => {
          const on = active.has(m.id)
          return (
            <button
              key={m.id}
              onClick={() => setActive(prev => {
                const next = new Set(prev)
                on ? next.delete(m.id) : next.add(m.id)
                return next
              })}
              className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
              style={on
                ? { background: accentColor + '18', color: accentColor, borderColor: accentColor }
                : { background: '#F0EDE8', color: '#888', borderColor: '#E0DDD6' }
              }
            >
              {m.label}
            </button>
          )
        })}
      </div>

      {/* chart */}
      {entries.length === 0
        ? <div className="h-48 flex items-center justify-center text-sm text-gray-400">No data yet — submit your first check-in.</div>
        : <div className="relative h-64"><canvas ref={canvasRef} /></div>
      }

      {/* snapshot cards */}
      {latest && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Latest week snapshot</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {metrics.map(m => {
              const val     = latest.metrics?.[deptKey]?.[m.id]
              const prevVal = prev?.metrics?.[deptKey]?.[m.id]
              if (val === undefined) return null
              let chgLabel = '', chgColor = '#888'
              if (prevVal !== undefined && prevVal !== 0) {
                const diff = val - prevVal, pct = Math.round((diff / prevVal) * 100), sign = diff > 0 ? '+' : ''
                chgLabel = `${sign}${diff} (${sign}${pct}%)`
                const dir = m.dir || 'down'
                chgColor = diff === 0 ? '#888' : ((dir === 'down' && diff < 0) || (dir === 'up' && diff > 0)) ? '#2E5A0D' : '#8B1F1F'
              }
              return (
                <div key={m.id} className="bg-[#F0EDE8] rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-gray-500 leading-tight mb-1">{m.label}</p>
                  <p className="text-lg font-semibold text-gray-800">{val.toLocaleString()}</p>
                  {chgLabel && <p className="text-[10px] font-medium mt-0.5" style={{ color: chgColor }}>{chgLabel}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
