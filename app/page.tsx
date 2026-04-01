'use client'
import { useState, useEffect, useCallback } from 'react'
import MetricTable from '@/components/MetricTable'
import TrendChart from '@/components/TrendChart'
import { ADV_DEPTS, FITTER_DEPTS, ADV_DEPT_KEYS, FITTER_DEPT_KEYS } from '@/utils/metrics'

// ── helpers ──────────────────────────────────────────────────────
function getWeekLabel(dateStr: string) {
  const d   = new Date(dateStr + 'T12:00:00')
  const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d); mon.setDate(diff)
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4)
  const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Week of ${fmt(mon)} – ${fmt(fri)}, ${fri.getFullYear()}`
}

type TabId = 'adv-form' | 'fitter-form' | 'adv-trends' | 'fitter-trends' | 'adv-history' | 'fitter-history'

const TABS: { id: TabId; label: string }[] = [
  { id: 'adv-form',       label: 'Advocate check-in' },
  { id: 'fitter-form',    label: 'Fitter check-in' },
  { id: 'adv-trends',     label: 'Advocate trends' },
  { id: 'fitter-trends',  label: 'Fitter trends' },
  { id: 'adv-history',    label: 'Advocate history' },
  { id: 'fitter-history', label: 'Fitter history' },
]

const DEPT_COLORS: Record<string, string> = {
  cgm: '#185FA5', shoe: '#0F6E56', chase: '#854F0B', pfp: '#534AB7', fitter: '#993C1D',
}
const DEPT_BG: Record<string, string> = {
  cgm: '#E6F1FB', shoe: '#E1F5EE', chase: '#FAEEDA', pfp: '#EEEDFE', fitter: '#FAECE7',
}
const AV_BG: Record<string, string> = {
  cgm: '#E6F1FB', shoe: '#E1F5EE', chase: '#FAEEDA',
}

// ── component ────────────────────────────────────────────────────
export default function Home() {
  const today     = new Date().toISOString().slice(0, 10)
  const [tab, setTab]           = useState<TabId>('adv-form')
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState('')
  const [advEntries,    setAdvEntries]    = useState<any[]>([])
  const [fitterEntries, setFitterEntries] = useState<any[]>([])

  // form state — advocate
  const [advDate,      setAdvDate]      = useState(today)
  const [advSubmitter, setAdvSubmitter] = useState('')
  const [advNotes,     setAdvNotes]     = useState('')
  const [advWins,      setAdvWins]      = useState('')
  const [advBlockers,  setAdvBlockers]  = useState('')
  const [advFocus,     setAdvFocus]     = useState('')
  const [advMetrics,   setAdvMetrics]   = useState<Record<string, Record<string, string>>>({})
  const [advPrev,      setAdvPrev]      = useState<Record<string, Record<string, string>>>({})
  const [advAdvocates, setAdvAdvocates] = useState<Record<string, any[]>>({})

  // form state — fitter
  const [fitDate,      setFitDate]      = useState(today)
  const [fitSubmitter, setFitSubmitter] = useState('')
  const [fitNotes,     setFitNotes]     = useState('')
  const [fitWins,      setFitWins]      = useState('')
  const [fitBlockers,  setFitBlockers]  = useState('')
  const [fitFocus,     setFitFocus]     = useState('')
  const [fitMetrics,   setFitMetrics]   = useState<Record<string, Record<string, string>>>({})
  const [fitPrev,      setFitPrev]      = useState<Record<string, Record<string, string>>>({})

  // ── load data ──
  const loadEntries = useCallback(async (type: 'advocate' | 'fitter') => {
    const res  = await fetch(`/api/checkins?type=${type}`)
    const data = await res.json()
    if (Array.isArray(data)) {
      if (type === 'advocate') setAdvEntries(data)
      else setFitterEntries(data)
    }
  }, [])

  useEffect(() => { loadEntries('advocate'); loadEntries('fitter') }, [loadEntries])

  // ── tab switching triggers load ──
  useEffect(() => {
    if (tab === 'adv-trends' || tab === 'adv-history')    loadEntries('advocate')
    if (tab === 'fitter-trends' || tab === 'fitter-history') loadEntries('fitter')
  }, [tab, loadEntries])

  // ── metric change helpers ──
  function setMetricVal(
    setter: typeof setAdvMetrics,
    deptKey: string, id: string, val: string
  ) {
    setter(prev => ({ ...prev, [deptKey]: { ...(prev[deptKey] || {}), [id]: val } }))
  }

  function setAdvocateVal(deptKey: string, idx: number, field: string, val: string) {
    setAdvAdvocates(prev => {
      const dept = [...(prev[deptKey] || ADV_DEPTS[deptKey].advocates.map(a => ({ name: a.name, out: '', in: '', talk: '', tasks: '' })))]
      dept[idx] = { ...dept[idx], [field]: val }
      return { ...prev, [deptKey]: dept }
    })
  }

  // ── submit ──
  async function handleSubmit(type: 'advocate' | 'fitter') {
    setSaving(true)
    const isAdv = type === 'advocate'
    const date  = isAdv ? advDate : fitDate

    // build metrics object — only include fields with values
    const metricsObj: Record<string, Record<string, number>> = {}
    const deptKeys = isAdv ? ADV_DEPT_KEYS : FITTER_DEPT_KEYS
    const depts    = isAdv ? ADV_DEPTS : FITTER_DEPTS
    const mVals    = isAdv ? advMetrics : fitMetrics

    deptKeys.forEach(d => {
      metricsObj[d] = {}
      ;(depts as any)[d].metrics.forEach((m: any) => {
        const v = mVals[d]?.[m.id]
        if (v !== undefined && v !== '') metricsObj[d][m.id] = parseInt(v)
      })
    })

    // advocates
    let advocatesObj: any = null
    if (isAdv) {
      advocatesObj = {}
      ADV_DEPT_KEYS.forEach(d => {
        advocatesObj[d] = (advAdvocates[d] || ADV_DEPTS[d].advocates.map(a => ({
          name: a.name, out: '', in: '', talk: '', tasks: ''
        })))
      })
    }

    const body = {
      type, week_date: date, week_label: getWeekLabel(date),
      submitter:  isAdv ? advSubmitter : fitSubmitter,
      notes_meta: isAdv ? advNotes     : fitNotes,
      metrics:    metricsObj,
      advocates:  advocatesObj,
      wins:       isAdv ? advWins     : fitWins,
      blockers:   isAdv ? advBlockers : fitBlockers,
      focus:      isAdv ? advFocus    : fitFocus,
    }

    const res = await fetch('/api/checkins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) {
      setSaveMsg('Check-in saved!')
      setTimeout(() => setSaveMsg(''), 4000)
      loadEntries(type)
    } else {
      const err = await res.json()
      setSaveMsg('Error: ' + (err.error || 'unknown'))
    }
  }

  // ── clear ──
  function clearForm(type: 'advocate' | 'fitter') {
    if (type === 'advocate') {
      setAdvMetrics({}); setAdvPrev({}); setAdvAdvocates({})
      setAdvSubmitter(''); setAdvNotes(''); setAdvWins(''); setAdvBlockers(''); setAdvFocus('')
    } else {
      setFitMetrics({}); setFitPrev({})
      setFitSubmitter(''); setFitNotes(''); setFitWins(''); setFitBlockers(''); setFitFocus('')
    }
  }

  // ── render helpers ──
  const DeptPill = ({ deptKey }: { deptKey: string }) => {
    const label = (ADV_DEPTS[deptKey] || FITTER_DEPTS[deptKey])?.label || deptKey
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: DEPT_BG[deptKey], color: DEPT_COLORS[deptKey] }}>
        {label}
      </span>
    )
  }

  const Section = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white border border-[#E5E2DC] rounded-xl p-5 mb-4 ${className}`}>{children}</div>
  )

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">{children}</p>
  )

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      {/* header */}
      <div className="border-b border-[#E5E2DC] bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Weekly operations check-in</h1>
        <p className="text-sm text-gray-400 mt-0.5">CGM · Shoe Tech · Chase · PFP · Fitter</p>
      </div>

      {/* tabs */}
      <div className="border-b border-[#E5E2DC] bg-white px-6 overflow-x-auto">
        <div className="flex gap-0 w-max">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                ${tab === t.id ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* ── ADVOCATE CHECK-IN ── */}
        {tab === 'adv-form' && (
          <div>
            <Section>
              <SectionTitle>Submission info</SectionTitle>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Week of</label>
                  <input type="date" value={advDate} onChange={e => setAdvDate(e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">{getWeekLabel(advDate)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Submitted by</label>
                  <input type="text" placeholder="Your name" value={advSubmitter} onChange={e => setAdvSubmitter(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes <span className="text-gray-300">(optional)</span></label>
                <input type="text" placeholder="e.g. Holiday week, short-staffed..." value={advNotes} onChange={e => setAdvNotes(e.target.value)} />
              </div>
            </Section>

            {ADV_DEPT_KEYS.map(d => (
              <Section key={d}>
                <div className="flex items-center gap-2 mb-4">
                  <DeptPill deptKey={d} />
                </div>
                <p className="text-xs text-gray-400 mb-3 font-medium">Report metrics</p>
                <MetricTable
                  metrics={ADV_DEPTS[d].metrics}
                  values={advMetrics[d] || {}}
                  prevValues={advPrev[d] || {}}
                  onChange={(id, val, isPrev) =>
                    isPrev ? setMetricVal(setAdvPrev, d, id, val) : setMetricVal(setAdvMetrics, d, id, val)
                  }
                />
                <div className="border-t border-[#E5E2DC] my-4" />
                <p className="text-xs text-gray-400 mb-3 font-medium">Phone activity — per advocate</p>
                <div className="space-y-3">
                  {ADV_DEPTS[d].advocates.map((a, i) => {
                    const av = (advAdvocates[d] || [])[i] || { name: a.name, out: '', in: '', talk: '', tasks: '' }
                    return (
                      <div key={a.name} className="border border-[#E5E2DC] rounded-lg p-3 bg-[#FAFAF8]">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                            style={{ background: AV_BG[d], color: DEPT_COLORS[d] }}>{a.initials}</div>
                          <span className="text-sm font-medium text-gray-700">{a.name}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {['out','in','talk','tasks'].map((field, fi) => (
                            <div key={field}>
                              <label className="block text-xs text-gray-400 mb-1">
                                {['Outbound','Inbound','Talk time','Tasks open'][fi]}
                              </label>
                              <input
                                type={field === 'talk' ? 'text' : 'number'}
                                min="0"
                                placeholder={field === 'talk' ? '2:45' : '0'}
                                value={av[field] || ''}
                                onChange={e => setAdvocateVal(d, i, field, e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>
            ))}

            <Section>
              <SectionTitle>Weekly narrative</SectionTitle>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Wins &amp; progress</label>
                  <textarea placeholder="e.g. Unfilled orders down across all three teams..." value={advWins} onChange={e => setAdvWins(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Blockers &amp; risks</label>
                  <textarea placeholder="e.g. Prior auth volume still elevated..." value={advBlockers} onChange={e => setAdvBlockers(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Top priorities next week</label>
                  <textarea placeholder="e.g. Push missing info below 200 on CGM side..." value={advFocus} onChange={e => setAdvFocus(e.target.value)} />
                </div>
              </div>
            </Section>

            <div className="flex justify-end gap-3">
              <button onClick={() => clearForm('advocate')} className="px-4 py-2 text-sm font-medium text-gray-500 border border-[#E0DDD6] rounded-lg hover:bg-gray-50 transition-colors">Clear</button>
              <button onClick={() => handleSubmit('advocate')} disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save check-in'}
              </button>
            </div>
            {saveMsg && (
              <div className={`mt-3 px-4 py-3 rounded-lg text-sm font-medium ${saveMsg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-[#EAF3DE] text-[#2E5A0D]'}`}>
                {saveMsg}
              </div>
            )}
          </div>
        )}

        {/* ── FITTER CHECK-IN ── */}
        {tab === 'fitter-form' && (
          <div>
            <Section>
              <SectionTitle>Submission info</SectionTitle>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Week of</label>
                  <input type="date" value={fitDate} onChange={e => setFitDate(e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">{getWeekLabel(fitDate)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Submitted by</label>
                  <input type="text" placeholder="Your name" value={fitSubmitter} onChange={e => setFitSubmitter(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes <span className="text-gray-300">(optional)</span></label>
                <input type="text" placeholder="e.g. Holiday week..." value={fitNotes} onChange={e => setFitNotes(e.target.value)} />
              </div>
            </Section>

            {FITTER_DEPT_KEYS.map(d => (
              <Section key={d}>
                <div className="flex items-center gap-2 mb-4">
                  <DeptPill deptKey={d} />
                </div>
                <MetricTable
                  metrics={FITTER_DEPTS[d].metrics}
                  values={fitMetrics[d] || {}}
                  prevValues={fitPrev[d] || {}}
                  onChange={(id, val, isPrev) =>
                    isPrev ? setMetricVal(setFitPrev, d, id, val) : setMetricVal(setFitMetrics, d, id, val)
                  }
                />
              </Section>
            ))}

            <Section>
              <SectionTitle>Weekly narrative</SectionTitle>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Wins &amp; progress</label>
                  <textarea placeholder="e.g. Fitter declined numbers reduced this week..." value={fitWins} onChange={e => setFitWins(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Blockers &amp; risks</label>
                  <textarea placeholder="e.g. Unassigned patients backlog growing..." value={fitBlockers} onChange={e => setFitBlockers(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Top priorities next week</label>
                  <textarea placeholder="e.g. Clear pending completed RX queue..." value={fitFocus} onChange={e => setFitFocus(e.target.value)} />
                </div>
              </div>
            </Section>

            <div className="flex justify-end gap-3">
              <button onClick={() => clearForm('fitter')} className="px-4 py-2 text-sm font-medium text-gray-500 border border-[#E0DDD6] rounded-lg hover:bg-gray-50 transition-colors">Clear</button>
              <button onClick={() => handleSubmit('fitter')} disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save check-in'}
              </button>
            </div>
            {saveMsg && (
              <div className={`mt-3 px-4 py-3 rounded-lg text-sm font-medium ${saveMsg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-[#EAF3DE] text-[#2E5A0D]'}`}>
                {saveMsg}
              </div>
            )}
          </div>
        )}

        {/* ── ADVOCATE TRENDS ── */}
        {tab === 'adv-trends' && (
          <div>
            {ADV_DEPT_KEYS.map(d => (
              <Section key={d}>
                <div className="flex items-center gap-2 mb-4"><DeptPill deptKey={d} /></div>
                <TrendChart deptKey={d} metrics={ADV_DEPTS[d].metrics} entries={advEntries} accentColor={DEPT_COLORS[d]} />
              </Section>
            ))}
          </div>
        )}

        {/* ── FITTER TRENDS ── */}
        {tab === 'fitter-trends' && (
          <div>
            {FITTER_DEPT_KEYS.map(d => (
              <Section key={d}>
                <div className="flex items-center gap-2 mb-4"><DeptPill deptKey={d} /></div>
                <TrendChart deptKey={d} metrics={FITTER_DEPTS[d].metrics} entries={fitterEntries} accentColor={DEPT_COLORS[d]} />
              </Section>
            ))}
          </div>
        )}

        {/* ── ADVOCATE HISTORY ── */}
        {tab === 'adv-history' && (
          <Section>
            <SectionTitle>Advocate check-in history</SectionTitle>
            {advEntries.length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">No check-ins saved yet.</p>
              : [...advEntries].reverse().map(e => (
                <div key={e.id} className="border border-[#E5E2DC] rounded-lg p-4 mb-3">
                  <p className="text-sm font-semibold text-gray-700">{e.week_label}</p>
                  {e.submitter && <p className="text-xs text-gray-400 mt-0.5">{e.submitter}{e.notes_meta ? ` · ${e.notes_meta}` : ''}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {ADV_DEPT_KEYS.map(d => {
                      const m = e.metrics?.[d] || {}
                      const entries = Object.entries(m).slice(0, 4)
                      if (!entries.length) return null
                      return entries.map(([k, v]) => {
                        const def = ADV_DEPTS[d].metrics.find(x => x.id === k)
                        return (
                          <span key={k} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: DEPT_BG[d], color: DEPT_COLORS[d] }}>
                            {def?.label || k}: <strong>{String(v)}</strong>
                          </span>
                        )
                      })
                    })}
                  </div>
                  {e.wins    && <p className="text-xs text-gray-500 mt-2"><strong className="text-gray-700">Wins:</strong> {e.wins}</p>}
                  {e.blockers && <p className="text-xs text-gray-500 mt-1"><strong className="text-gray-700">Blockers:</strong> {e.blockers}</p>}
                </div>
              ))
            }
          </Section>
        )}

        {/* ── FITTER HISTORY ── */}
        {tab === 'fitter-history' && (
          <Section>
            <SectionTitle>Fitter check-in history</SectionTitle>
            {fitterEntries.length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">No check-ins saved yet.</p>
              : [...fitterEntries].reverse().map(e => (
                <div key={e.id} className="border border-[#E5E2DC] rounded-lg p-4 mb-3">
                  <p className="text-sm font-semibold text-gray-700">{e.week_label}</p>
                  {e.submitter && <p className="text-xs text-gray-400 mt-0.5">{e.submitter}{e.notes_meta ? ` · ${e.notes_meta}` : ''}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {FITTER_DEPT_KEYS.map(d => {
                      const m = e.metrics?.[d] || {}
                      const entries = Object.entries(m).slice(0, 4)
                      if (!entries.length) return null
                      return entries.map(([k, v]) => {
                        const def = FITTER_DEPTS[d].metrics.find(x => x.id === k)
                        return (
                          <span key={k} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: DEPT_BG[d], color: DEPT_COLORS[d] }}>
                            {def?.label || k}: <strong>{String(v)}</strong>
                          </span>
                        )
                      })
                    })}
                  </div>
                  {e.wins     && <p className="text-xs text-gray-500 mt-2"><strong className="text-gray-700">Wins:</strong> {e.wins}</p>}
                  {e.blockers && <p className="text-xs text-gray-500 mt-1"><strong className="text-gray-700">Blockers:</strong> {e.blockers}</p>}
                </div>
              ))
            }
          </Section>
        )}

      </div>
    </div>
  )
}
