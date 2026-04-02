'use client'
import { useState } from 'react'
import { ADV_DEPTS, FITTER_DEPTS, ADV_DEPT_KEYS, FITTER_DEPT_KEYS } from '@/utils/metrics'

interface Entry {
  week_date: string
  week_label: string
  type: string
  metrics: Record<string, Record<string, number>>
  advocates?: Record<string, { name: string; out: string; in: string; talk: string; tasks: string }[]>
}

interface InsightSection {
  dept: string
  wins: { metric: string; value: number; change: string; context: string }[]
  concerns: { metric: string; value: number; change: string; context: string }[]
  goals: { metric: string; target: number; direction: string; rationale: string }[]
  phoneInsights?: { advocate: string; note: string; flag: 'positive' | 'watch' | 'neutral' }[]
  summary: string
}

interface Report {
  weekLabel: string
  advocate: InsightSection[]
  fitter: InsightSection[]
  executiveSummary: string
  generatedAt: string
}

const DEPT_COLORS: Record<string, string> = {
  cgm: '#1565C0', shoe: '#00695C', chase: '#E65100',
  pfp: '#4527A0', fitter: '#BF360C',
}
const DEPT_BG: Record<string, string> = {
  cgm: '#E3F0FF', shoe: '#E0F2F1', chase: '#FFF3E0',
  pfp: '#EDE7F6', fitter: '#FBE9E7',
}

function shortDate(d: string) {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  catch { return d }
}

function buildPrompt(advEntries: Entry[], fitterEntries: Entry[]): string {
  // Use last 6 weeks
  const advSlice    = advEntries.slice(-6)
  const fitterSlice = fitterEntries.slice(-6)

  const formatMetrics = (entries: Entry[], deptKeys: string[], depts: any) => {
    return deptKeys.map(dk => {
      const deptLabel = depts[dk].label
      const metricDefs = depts[dk].metrics
      const rows = metricDefs.map((m: any) => {
        const vals = entries.map(e => {
          const v = e.metrics?.[dk]?.[m.id]
          return v !== undefined ? v : null
        })
        const weeks = entries.map(e => shortDate(e.week_date))
        const pairs = weeks.map((w, i) => `${w}:${vals[i] ?? '—'}`).join(', ')
        return `  ${m.label}: [${pairs}]`
      }).join('\n')

      // Phone data summary
      const phoneRows = entries.map(e => {
        const advList = e.advocates?.[dk] || []
        if (!advList.length) return null
        return advList.map((a: any) => `${shortDate(e.week_date)} ${a.name}: out=${a.out||0} in=${a.in||0} talk=${a.talk||'—'}`).join(', ')
      }).filter(Boolean)

      return `### ${deptLabel}\n${rows}${phoneRows.length ? `\n\nPhone activity:\n  ${phoneRows.join('\n  ')}` : ''}`
    }).join('\n\n')
  }

  const advText    = advSlice.length    ? formatMetrics(advSlice,    ADV_DEPT_KEYS as unknown as string[],    ADV_DEPTS)    : 'No advocate data available.'
  const fitterText = fitterSlice.length ? formatMetrics(fitterSlice, FITTER_DEPT_KEYS as unknown as string[], FITTER_DEPTS) : 'No fitter data available.'

  const latestWeek = advSlice.at(-1)?.week_label || fitterSlice.at(-1)?.week_label || 'Latest week'

  return `You are an operations analytics assistant for a healthcare supply company (CGM devices, diabetic shoes, compression garments). Analyze the following weekly check-in data and produce a structured JSON intelligence report.

CURRENT WEEK: ${latestWeek}
WEEKS SHOWN: Last ${Math.max(advSlice.length, fitterSlice.length)} weeks (oldest to newest)

## ADVOCATE TEAM DATA
${advText}

## FITTER TEAM DATA
${fitterText}

---

Produce a JSON report with EXACTLY this structure (no markdown, no explanation, only valid JSON):

{
  "weekLabel": "${latestWeek}",
  "executiveSummary": "2-3 sentence overall summary of the week across both teams",
  "advocate": [
    {
      "dept": "CGM Advocates",
      "summary": "1-2 sentence dept summary",
      "wins": [
        { "metric": "metric name", "value": 123, "change": "+12 (-9%)", "context": "why this matters" }
      ],
      "concerns": [
        { "metric": "metric name", "value": 456, "change": "+18 (+4%)", "context": "why this is concerning and what to watch" }
      ],
      "goals": [
        { "metric": "metric name", "target": 110, "direction": "reduce to 110", "rationale": "based on 3-week trend, a 8% reduction is achievable" }
      ],
      "phoneInsights": [
        { "advocate": "Name", "note": "observation about their activity", "flag": "positive" }
      ]
    }
  ],
  "fitter": [
    {
      "dept": "PFP Manager",
      "summary": "1-2 sentence dept summary",
      "wins": [],
      "concerns": [],
      "goals": [],
      "phoneInsights": []
    }
  ],
  "generatedAt": "${new Date().toISOString()}"
}

Rules:
- Include all 3 advocate depts (CGM Advocates, Shoe Tech Advocates, Chase Advocates) and both fitter depts (PFP Manager, Fitter Manager)
- wins: metrics that improved meaningfully (top 2-3 per dept)
- concerns: metrics trending wrong or spiking (top 2-3 per dept)
- goals: specific numeric targets for next week based on trend trajectory (top 3-4 per dept). For "queue" metrics (unfilled, missing, denied etc) lower is better. For "activity" metrics (welcome calls, new patient leads) higher is better.
- phoneInsights: only include if phone data exists, flag = "positive" | "watch" | "neutral"
- Be specific with numbers. Do not invent data. Only reference metrics that appear in the data.
- Return ONLY the JSON object, no markdown fences, no preamble.`
}

export default function InsightsTab() {
  const [loading, setLoading]   = useState(false)
  const [report, setReport]     = useState<Report | null>(null)
  const [error, setError]       = useState('')
  const [activeSection, setActiveSection] = useState<'advocate' | 'fitter'>('advocate')

  async function generate() {
    setLoading(true)
    setError('')
    setReport(null)

    try {
      // Fetch last 6 weeks of both types
      const [advRes, fitRes] = await Promise.all([
        fetch('/api/checkins?type=advocate'),
        fetch('/api/checkins?type=fitter'),
      ])
      const advEntries: Entry[] = await advRes.json()
      const fitEntries: Entry[] = await fitRes.json()

      if (!Array.isArray(advEntries) || !Array.isArray(fitEntries)) {
        throw new Error('Failed to load check-in data.')
      }
      if (advEntries.length === 0 && fitEntries.length === 0) {
        throw new Error('No check-in data found. Upload some data first.')
      }

      const prompt = buildPrompt(advEntries, fitEntries)

      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err?.error || 'API error')
      }

      const data = await response.json()
      const clean = (data.text || '').replace(/```json|```/g, '').trim()
      const parsed: Report = JSON.parse(clean)
      setReport(parsed)
    } catch (e: any) {
      setError(e.message || 'Something went wrong generating the report.')
    } finally {
      setLoading(false)
    }
  }

  const flagStyle = (flag: string) => {
    if (flag === 'positive') return { background: '#E8F5E9', color: '#2E7D32', border: '1px solid #A5D6A7' }
    if (flag === 'watch')    return { background: '#FFF3E0', color: '#E65100', border: '1px solid #FFCC80' }
    return { background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }
  }

  const sections = report ? (activeSection === 'advocate' ? report.advocate : report.fitter) : []

  return (
    <div>
      {/* generate button */}
      {!report && !loading && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '2.5rem', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E3F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
          <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16, fontWeight: 700, color: '#0A2342', marginBottom: 8 }}>
            Weekly intelligence report
          </h3>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 24, maxWidth: 420, margin: '0 auto 24px' }}>
            Analyzes your last 6 weeks of check-in data to surface wins, flag concerns, and set specific targets for next week — for both Advocate and Fitter teams.
          </p>
          <button onClick={generate}
            style={{ background: 'linear-gradient(135deg, #1565C0, #0A2342)', color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Generate report
          </button>
        </div>
      )}

      {/* loading */}
      {loading && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '3rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" style={{ animation: 'spin 1.2s linear infinite' }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0A2342', marginBottom: 4 }}>Analyzing your data…</p>
              <p style={{ fontSize: 12, color: '#64748B' }}>Reviewing trends, identifying patterns, generating targets</p>
            </div>
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* error */}
      {error && (
        <div style={{ background: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#C62828' }}>
          ⚠ {error}
        </div>
      )}

      {/* report */}
      {report && (
        <div>
          {/* header + regenerate */}
          <div style={{ background: 'linear-gradient(135deg, #0A2342, #1565C0)', borderRadius: 14, padding: '20px 24px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Weekly intelligence report</p>
              <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{report.weekLabel}</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, maxWidth: 540 }}>{report.executiveSummary}</p>
            </div>
            <button onClick={generate} disabled={loading}
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 16 }}>
              Regenerate
            </button>
          </div>

          {/* team switcher */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['advocate','fitter'] as const).map(t => (
              <button key={t} onClick={() => setActiveSection(t)}
                style={{
                  padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                  background: activeSection === t ? '#0A2342' : '#fff',
                  color:      activeSection === t ? '#fff'    : '#64748B',
                  borderColor: activeSection === t ? '#0A2342' : '#E2E8F0',
                }}>
                {t === 'advocate' ? 'Advocate teams' : 'Fitter teams'}
              </button>
            ))}
          </div>

          {/* dept sections */}
          {sections.map((section, si) => {
            const deptKey = activeSection === 'advocate'
              ? ADV_DEPT_KEYS[si]
              : FITTER_DEPT_KEYS[si]
            const color = DEPT_COLORS[deptKey] || '#1565C0'
            const bg    = DEPT_BG[deptKey]    || '#E3F0FF'

            return (
              <div key={section.dept} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: 12 }}>
                {/* dept header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{section.dept}</span>
                  <div style={{ flex: 1, height: 1, background: bg }} />
                </div>
                <p style={{ fontSize: 13, color: '#475569', marginBottom: 16, lineHeight: 1.6 }}>{section.summary}</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {/* wins */}
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#2E7D32', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2E7D32', display: 'inline-block' }} />
                      Wins this week
                    </p>
                    {section.wins.length === 0
                      ? <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>No significant wins to report</p>
                      : section.wins.map((w, i) => (
                        <div key={i} style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>{w.metric}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#2E7D32', background: '#DCFCE7', padding: '1px 7px', borderRadius: 20, whiteSpace: 'nowrap', marginLeft: 8 }}>{w.change}</span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0A2342', marginBottom: 3 }}>{w.value?.toLocaleString()}</div>
                          <p style={{ fontSize: 11, color: '#64748B', lineHeight: 1.5, margin: 0 }}>{w.context}</p>
                        </div>
                      ))
                    }
                  </div>

                  {/* concerns */}
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#C62828', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C62828', display: 'inline-block' }} />
                      Watch closely
                    </p>
                    {section.concerns.length === 0
                      ? <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>No major concerns this week</p>
                      : section.concerns.map((c, i) => (
                        <div key={i} style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>{c.metric}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#C62828', background: '#FEE2E2', padding: '1px 7px', borderRadius: 20, whiteSpace: 'nowrap', marginLeft: 8 }}>{c.change}</span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0A2342', marginBottom: 3 }}>{c.value?.toLocaleString()}</div>
                          <p style={{ fontSize: 11, color: '#64748B', lineHeight: 1.5, margin: 0 }}>{c.context}</p>
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* goals */}
                <div style={{ marginBottom: section.phoneInsights?.length ? 16 : 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#1565C0', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1565C0', display: 'inline-block' }} />
                    Targets for next week
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {section.goals.map((g, i) => (
                      <div key={i} style={{ background: '#F0F6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ background: '#1565C0', color: '#fff', borderRadius: 6, padding: '4px 8px', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {g.target?.toLocaleString()}
                        </div>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', marginBottom: 2 }}>{g.metric}</p>
                          <p style={{ fontSize: 11, color: '#1565C0', fontWeight: 600, marginBottom: 2 }}>{g.direction}</p>
                          <p style={{ fontSize: 11, color: '#64748B', margin: 0, lineHeight: 1.4 }}>{g.rationale}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* phone insights */}
                {section.phoneInsights && section.phoneInsights.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748B', marginBottom: 8, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#64748B', display: 'inline-block' }} />
                      Advocate phone activity
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {section.phoneInsights.map((p, i) => (
                        <div key={i} style={{ ...flagStyle(p.flag), borderRadius: 8, padding: '8px 12px', fontSize: 12, flex: '1 1 200px' }}>
                          <span style={{ fontWeight: 700 }}>{p.advocate}:</span> {p.note}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 8 }}>
            Generated {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : ''} · Based on last 6 weeks of check-in data
          </p>
        </div>
      )}
    </div>
  )
}
