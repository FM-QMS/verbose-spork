'use client'
import { MetricDef } from '@/utils/metrics'

interface Props {
  metrics: MetricDef[]
  values: Record<string, string>
  prevValues: Record<string, string>
  onChange: (id: string, val: string, isPrev: boolean) => void
}

function calcDelta(curr: string, prev: string, dir: 'up' | 'down' = 'down') {
  const c = parseFloat(curr), p = parseFloat(prev)
  if (isNaN(c) || isNaN(p) || p === 0) return null
  const diff = c - p
  const pct  = Math.round((diff / p) * 100)
  const sign = diff > 0 ? '+' : ''
  const label = `${sign}${diff} (${sign}${pct}%)`
  const improving = (dir === 'down' && diff < 0) || (dir === 'up' && diff > 0)
  const cls = diff === 0 ? 'delta-flat' : improving ? 'delta-down' : 'delta-up'
  return { label, cls }
}

export default function MetricTable({ metrics, values, prevValues, onChange }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[#E0DDD6]">
            <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-3" style={{ width: '42%' }}>Metric</th>
            <th className="text-center text-xs font-medium text-gray-400 pb-2 px-2" style={{ width: '20%' }}>This week</th>
            <th className="text-center text-xs font-medium text-gray-400 pb-2 px-2" style={{ width: '20%' }}>Last week</th>
            <th className="text-center text-xs font-medium text-gray-400 pb-2" style={{ width: '18%' }}>vs. last week</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => {
            const delta = calcDelta(values[m.id] || '', prevValues[m.id] || '', m.dir)
            return (
              <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'}>
                <td className="py-1.5 pr-3">
                  <span className="text-[13px] font-medium text-gray-700">{m.label}</span>
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={values[m.id] || ''}
                    onChange={e => onChange(m.id, e.target.value, false)}
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="prev."
                    value={prevValues[m.id] || ''}
                    onChange={e => onChange(m.id, e.target.value, true)}
                  />
                </td>
                <td className="py-1.5 text-center">
                  {delta
                    ? <span className={delta.cls}>{delta.label}</span>
                    : <span className="delta-flat">—</span>
                  }
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
