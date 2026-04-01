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
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: '#F0F6FF', borderBottom: '1.5px solid #E2E8F0' }}>
            <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#1565C0', width: '42%' }}>
              Metric
            </th>
            <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#1565C0', width: '20%' }}>
              This week
            </th>
            <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#1565C0', width: '20%' }}>
              Last week
            </th>
            <th className="text-center py-2.5 px-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#1565C0', width: '18%' }}>
              vs. last week
            </th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => {
            const delta = calcDelta(values[m.id] || '', prevValues[m.id] || '', m.dir)
            const isEven = i % 2 === 0
            return (
              <tr
                key={m.id}
                style={{ background: isEven ? '#FFFFFF' : '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}
              >
                <td className="py-2 px-4">
                  <span className="font-medium" style={{ color: '#334155', fontSize: '13px' }}>{m.label}</span>
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={values[m.id] || ''}
                    onChange={e => onChange(m.id, e.target.value, false)}
                    style={{ textAlign: 'center' }}
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min="0"
                    placeholder="—"
                    value={prevValues[m.id] || ''}
                    onChange={e => onChange(m.id, e.target.value, true)}
                    style={{ textAlign: 'center', background: '#F8FAFC' }}
                  />
                </td>
                <td className="py-2 px-3 text-center">
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
