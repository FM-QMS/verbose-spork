'use client'
import { useState, useEffect, useCallback } from 'react'
import MetricTable from '@/components/MetricTable'
import TrendChart from '@/components/TrendChart'
import UploadButton from '@/components/UploadButton'
import { ADV_DEPTS, FITTER_DEPTS, ADV_DEPT_KEYS, FITTER_DEPT_KEYS } from '@/utils/metrics'

function getWeekLabel(dateStr: string) {
  const d   = new Date(dateStr + 'T12:00:00')
  const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d); mon.setDate(diff)
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4)
  const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Week of ${fmt(mon)} – ${fmt(fri)}, ${fri.getFullYear()}`
}

type TabId = 'adv-form' | 'fitter-form' | 'adv-trends' | 'fitter-trends' | 'adv-history' | 'fitter-history'

const TAB_GROUPS = [
  { label: 'Check-in', tabs: [
    { id: 'adv-form'    as TabId, label: 'Advocate' },
    { id: 'fitter-form' as TabId, label: 'Fitter' },
  ]},
  { label: 'Trends', tabs: [
    { id: 'adv-trends'    as TabId, label: 'Advocate' },
    { id: 'fitter-trends' as TabId, label: 'Fitter' },
  ]},
  { label: 'History', tabs: [
    { id: 'adv-history'    as TabId, label: 'Advocate' },
    { id: 'fitter-history' as TabId, label: 'Fitter' },
  ]},
]

const DEPT_COLORS: Record<string, string> = {
  cgm: '#1565C0', shoe: '#00695C', chase: '#E65100', pfp: '#4527A0', fitter: '#BF360C',
}
const DEPT_BG: Record<string, string> = {
  cgm: '#E3F0FF', shoe: '#E0F2F1', chase: '#FFF3E0', pfp: '#EDE7F6', fitter: '#FBE9E7',
}
const DEPT_BORDER: Record<string, string> = {
  cgm: '#BFDBFE', shoe: '#99F6E4', chase: '#FED7AA', pfp: '#DDD6FE', fitter: '#FECACA',
}

function DeptPill({ deptKey }: { deptKey: string }) {
  const label = (ADV_DEPTS[deptKey] || FITTER_DEPTS[deptKey])?.label || deptKey
  return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full"
      style={{ background: DEPT_BG[deptKey], color: DEPT_COLORS[deptKey] }}>
      {label}
    </span>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-5 mb-4 ${className}`}
      style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(10,35,66,0.06)' }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#94A3B8' }}>{children}</p>
  )
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#475569' }}>
      {children}
      {hint && <span className="font-normal ml-1" style={{ color: '#94A3B8' }}>{hint}</span>}
    </label>
  )
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button onClick={onClick} disabled={saving}
      className="px-6 py-2.5 text-sm font-semibold rounded-lg text-white disabled:opacity-50 transition-all"
      style={{ background: 'linear-gradient(135deg, #1565C0, #0A2342)', boxShadow: '0 2px 8px rgba(21,101,192,0.35)' }}>
      {saving ? 'Saving…' : 'Save check-in'}
    </button>
  )
}

export default function Home() {
  const today = new Date().toISOString().slice(0, 10)
  const [tab, setTab]           = useState<TabId>('adv-form')
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState('')
  const [advEntries,    setAdvEntries]    = useState<any[]>([])
  const [fitterEntries, setFitterEntries] = useState<any[]>([])

  const [advDate, setAdvDate]           = useState(today)
  const [advSubmitter, setAdvSubmitter] = useState('')
  const [advNotes, setAdvNotes]         = useState('')
  const [advWins, setAdvWins]           = useState('')
  const [advBlockers, setAdvBlockers]   = useState('')
  const [advFocus, setAdvFocus]         = useState('')
  const [advMetrics, setAdvMetrics]     = useState<Record<string, Record<string, string>>>({})
  const [advPrev, setAdvPrev]           = useState<Record<string, Record<string, string>>>({})
  const [advAdvocates, setAdvAdvocates] = useState<Record<string, any[]>>({})

  const [fitDate, setFitDate]           = useState(today)
  const [fitSubmitter, setFitSubmitter] = useState('')
  const [fitNotes, setFitNotes]         = useState('')
  const [fitWins, setFitWins]           = useState('')
  const [fitBlockers, setFitBlockers]   = useState('')
  const [fitFocus, setFitFocus]         = useState('')
  const [fitMetrics, setFitMetrics]     = useState<Record<string, Record<string, string>>>({})
  const [fitPrev, setFitPrev]           = useState<Record<string, Record<string, string>>>({})

  const loadEntries = useCallback(async (type: 'advocate' | 'fitter') => {
    const res  = await fetch(`/api/checkins?type=${type}`)
    const data = await res.json()
    if (Array.isArray(data)) {
      type === 'advocate' ? setAdvEntries(data) : setFitterEntries(data)
    }
  }, [])

  useEffect(() => { loadEntries('advocate'); loadEntries('fitter') }, [loadEntries])
  useEffect(() => {
    if (tab === 'adv-trends'    || tab === 'adv-history')    loadEntries('advocate')
    if (tab === 'fitter-trends' || tab === 'fitter-history') loadEntries('fitter')
  }, [tab, loadEntries])

  function setMetricVal(setter: typeof setAdvMetrics, deptKey: string, id: string, val: string) {
    setter(prev => ({ ...prev, [deptKey]: { ...(prev[deptKey] || {}), [id]: val } }))
  }

  function setAdvocateVal(deptKey: string, idx: number, field: string, val: string) {
    setAdvAdvocates(prev => {
      const dept = [...(prev[deptKey] || ADV_DEPTS[deptKey].advocates.map(a => ({ name: a.name, out: '', in: '', talk: '', tasks: '' })))]
      dept[idx] = { ...dept[idx], [field]: val }
      return { ...prev, [deptKey]: dept }
    })
  }

  async function handleSubmit(type: 'advocate' | 'fitter') {
    setSaving(true)
    const isAdv   = type === 'advocate'
    const date    = isAdv ? advDate : fitDate
    const deptKeys = isAdv ? ADV_DEPT_KEYS : FITTER_DEPT_KEYS
    const depts    = isAdv ? ADV_DEPTS : FITTER_DEPTS
    const mVals    = isAdv ? advMetrics : fitMetrics

    const metricsObj: Record<string, Record<string, number>> = {}
    deptKeys.forEach(d => {
      metricsObj[d] = {}
      ;(depts as any)[d].metrics.forEach((m: any) => {
        const v = mVals[d]?.[m.id]
        if (v !== undefined && v !== '') metricsObj[d][m.id] = parseInt(v)
      })
    })

    let advocatesObj: any = null
    if (isAdv) {
      advocatesObj = {}
      ADV_DEPT_KEYS.forEach(d => {
        advocatesObj[d] = (advAdvocates[d] || ADV_DEPTS[d].advocates.map(a => ({ name: a.name, out: '', in: '', talk: '', tasks: '' })))
      })
    }

    const body = {
      type, week_date: date, week_label: getWeekLabel(date),
      submitter: isAdv ? advSubmitter : fitSubmitter,
      notes_meta: isAdv ? advNotes : fitNotes,
      metrics: metricsObj, advocates: advocatesObj,
      wins: isAdv ? advWins : fitWins,
      blockers: isAdv ? advBlockers : fitBlockers,
      focus: isAdv ? advFocus : fitFocus,
    }

    const res = await fetch('/api/checkins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) {
      setSaveMsg('Check-in saved successfully.')
      setTimeout(() => setSaveMsg(''), 5000)
      loadEntries(type)
    } else {
      const err = await res.json()
      setSaveMsg('Error: ' + (err.error || 'unknown error'))
    }
  }

  function clearForm(type: 'advocate' | 'fitter') {
    if (type === 'advocate') {
      setAdvMetrics({}); setAdvPrev({}); setAdvAdvocates({})
      setAdvSubmitter(''); setAdvNotes(''); setAdvWins(''); setAdvBlockers(''); setAdvFocus('')
    } else {
      setFitMetrics({}); setFitPrev({})
      setFitSubmitter(''); setFitNotes(''); setFitWins(''); setFitBlockers(''); setFitFocus('')
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#EEF2F7' }}>

      {/* top bar */}
      <div style={{ background: 'linear-gradient(135deg, #0A2342 0%, #1565C0 100%)', boxShadow: '0 2px 12px rgba(10,35,66,0.25)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Weekly Check-in
              </h1>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>Operations · Internal</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* tabs */}
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto pb-0">
            {TAB_GROUPS.map(group => (
              <div key={group.label} className="flex items-center gap-0.5 mr-4">
                <span className="text-xs mr-2" style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{group.label}</span>
                {group.tabs.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className="px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-all rounded-t-lg"
                    style={tab === t.id
                      ? { background: '#EEF2F7', color: '#0A2342', fontWeight: 600 }
                      : { color: 'rgba(255,255,255,0.7)', background: 'transparent' }
                    }>
                    {t.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* content */}
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── ADVOCATE FORM ── */}
        {tab === 'adv-form' && (
          <div>
            <Card>
              <SectionLabel>Upload from spreadsheet</SectionLabel>
              <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                Use the QMS template to fill in data offline, then upload here. Uploaded data is saved directly to the database and will appear in Trends and History.
              </p>
              <UploadButton onUploaded={() => loadEntries('advocate')} />
            </Card>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 16px' }}>
              <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>or fill in manually below</span>
              <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            </div>
            <Card>
              <SectionLabel>Submission info</SectionLabel>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <FieldLabel>Week of</FieldLabel>
                  <input type="date" value={advDate} onChange={e => setAdvDate(e.target.value)} />
                  <p className="text-xs mt-1.5 font-medium" style={{ color: '#1565C0' }}>{getWeekLabel(advDate)}</p>
                </div>
                <div>
                  <FieldLabel>Submitted by</FieldLabel>
                  <input type="text" placeholder="Manager name" value={advSubmitter} onChange={e => setAdvSubmitter(e.target.value)} />
                </div>
              </div>
              <FieldLabel hint="(optional)">Notes</FieldLabel>
              <input type="text" placeholder="e.g. Holiday week, team short-staffed…" value={advNotes} onChange={e => setAdvNotes(e.target.value)} />
            </Card>

            {ADV_DEPT_KEYS.map(d => (
              <Card key={d}>
                <div className="flex items-center gap-2 mb-5">
                  <DeptPill deptKey={d} />
                  <div className="flex-1 h-px" style={{ background: DEPT_BORDER[d] }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#64748B' }}>Report metrics</p>
                <MetricTable
                  metrics={ADV_DEPTS[d].metrics}
                  values={advMetrics[d] || {}}
                  prevValues={advPrev[d] || {}}
                  onChange={(id, val, isPrev) =>
                    isPrev ? setMetricVal(setAdvPrev, d, id, val) : setMetricVal(setAdvMetrics, d, id, val)
                  }
                />
                <div className="my-5" style={{ borderTop: '1px solid #F1F5F9' }} />
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#64748B' }}>Phone activity — per advocate</p>
                <div className="space-y-3">
                  {ADV_DEPTS[d].advocates.map((a, i) => {
                    const av = (advAdvocates[d] || [])[i] || { name: a.name, out: '', in: '', talk: '', tasks: '' }
                    return (
                      <div key={a.name} className="rounded-lg p-3.5" style={{ background: DEPT_BG[d] + '60', border: `1px solid ${DEPT_BORDER[d]}` }}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: DEPT_COLORS[d], color: 'white' }}>{a.initials}</div>
                          <span className="text-sm font-semibold" style={{ color: '#1E293B' }}>{a.name}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {(['out','in','talk','tasks'] as const).map((field, fi) => (
                            <div key={field}>
                              <FieldLabel>{['Outbound','Inbound','Talk time','Tasks open'][fi]}</FieldLabel>
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
              </Card>
            ))}

            <Card>
              <SectionLabel>Weekly narrative</SectionLabel>
              <div className="space-y-4">
                <div>
                  <FieldLabel hint="— what moved the needle?">Wins &amp; progress</FieldLabel>
                  <textarea placeholder="e.g. Unfilled orders down across all three teams, prior auth volume stabilizing…" value={advWins} onChange={e => setAdvWins(e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Blockers &amp; risks</FieldLabel>
                  <textarea placeholder="e.g. Prior auth volume still elevated, awaiting SNF/Hospice coding resolution…" value={advBlockers} onChange={e => setAdvBlockers(e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Top priorities next week</FieldLabel>
                  <textarea placeholder="e.g. Push missing info below 200 on CGM side, reduce missed shipments…" value={advFocus} onChange={e => setAdvFocus(e.target.value)} />
                </div>
              </div>
            </Card>

            <div className="flex justify-end items-center gap-3 mt-2">
              <button onClick={() => clearForm('advocate')}
                className="px-4 py-2.5 text-sm font-medium rounded-lg transition-colors"
                style={{ color: '#64748B', border: '1.5px solid #E2E8F0', background: 'white' }}>
                Clear form
              </button>
              <SaveButton onClick={() => handleSubmit('advocate')} saving={saving} />
            </div>
            {saveMsg && (
              <div className={`mt-3 px-4 py-3 rounded-lg text-sm font-medium ${saveMsg.startsWith('Error') ? 'text-red-700 bg-red-50 border border-red-200' : 'border'}`}
                style={!saveMsg.startsWith('Error') ? { background: '#E8F5E9', color: '#2E7D32', borderColor: '#A5D6A7' } : {}}>
                {saveMsg.startsWith('Error') ? '⚠ ' : '✓ '}{saveMsg}
              </div>
            )}
          </div>
        )}

        {/* ── FITTER FORM ── */}
        {tab === 'fitter-form' && (
          <div>
            <Card>
              <SectionLabel>Upload from spreadsheet</SectionLabel>
              <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                Use the QMS template to fill in data offline, then upload here. Uploaded data is saved directly to the database and will appear in Trends and History.
              </p>
              <UploadButton onUploaded={() => loadEntries('fitter')} />
            </Card>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 16px' }}>
              <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>or fill in manually below</span>
              <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            </div>
            <Card>
              <SectionLabel>Submission info</SectionLabel>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <FieldLabel>Week of</FieldLabel>
                  <input type="date" value={fitDate} onChange={e => setFitDate(e.target.value)} />
                  <p className="text-xs mt-1.5 font-medium" style={{ color: '#1565C0' }}>{getWeekLabel(fitDate)}</p>
                </div>
                <div>
                  <FieldLabel>Submitted by</FieldLabel>
                  <input type="text" placeholder="Manager name" value={fitSubmitter} onChange={e => setFitSubmitter(e.target.value)} />
                </div>
              </div>
              <FieldLabel hint="(optional)">Notes</FieldLabel>
              <input type="text" placeholder="e.g. Holiday week…" value={fitNotes} onChange={e => setFitNotes(e.target.value)} />
            </Card>

            {FITTER_DEPT_KEYS.map(d => (
              <Card key={d}>
                <div className="flex items-center gap-2 mb-5">
                  <DeptPill deptKey={d} />
                  <div className="flex-1 h-px" style={{ background: DEPT_BORDER[d] }} />
                </div>
                <MetricTable
                  metrics={FITTER_DEPTS[d].metrics}
                  values={fitMetrics[d] || {}}
                  prevValues={fitPrev[d] || {}}
                  onChange={(id, val, isPrev) =>
                    isPrev ? setMetricVal(setFitPrev, d, id, val) : setMetricVal(setFitMetrics, d, id, val)
                  }
                />
              </Card>
            ))}

            <Card>
              <SectionLabel>Weekly narrative</SectionLabel>
              <div className="space-y-4">
                <div>
                  <FieldLabel hint="— what moved the needle?">Wins &amp; progress</FieldLabel>
                  <textarea placeholder="e.g. Fitter declined numbers reduced this week…" value={fitWins} onChange={e => setFitWins(e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Blockers &amp; risks</FieldLabel>
                  <textarea placeholder="e.g. Unassigned patients backlog growing…" value={fitBlockers} onChange={e => setFitBlockers(e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Top priorities next week</FieldLabel>
                  <textarea placeholder="e.g. Clear pending completed RX queue…" value={fitFocus} onChange={e => setFitFocus(e.target.value)} />
                </div>
              </div>
            </Card>

            <div className="flex justify-end items-center gap-3 mt-2">
              <button onClick={() => clearForm('fitter')}
                className="px-4 py-2.5 text-sm font-medium rounded-lg transition-colors"
                style={{ color: '#64748B', border: '1.5px solid #E2E8F0', background: 'white' }}>
                Clear form
              </button>
              <SaveButton onClick={() => handleSubmit('fitter')} saving={saving} />
            </div>
            {saveMsg && (
              <div className={`mt-3 px-4 py-3 rounded-lg text-sm font-medium border`}
                style={saveMsg.startsWith('Error')
                  ? { background: '#FFEBEE', color: '#C62828', borderColor: '#FFCDD2' }
                  : { background: '#E8F5E9', color: '#2E7D32', borderColor: '#A5D6A7' }
                }>
                {saveMsg.startsWith('Error') ? '⚠ ' : '✓ '}{saveMsg}
              </div>
            )}
          </div>
        )}

        {/* ── ADVOCATE TRENDS ── */}
        {tab === 'adv-trends' && (
          <div>
            {ADV_DEPT_KEYS.map(d => (
              <Card key={d}>
                <div className="flex items-center gap-2 mb-5">
                  <DeptPill deptKey={d} />
                  <div className="flex-1 h-px" style={{ background: DEPT_BORDER[d] }} />
                </div>
                <TrendChart
                  deptKey={d}
                  metrics={ADV_DEPTS[d].metrics}
                  entries={advEntries}
                  accentColor={DEPT_COLORS[d]}
                  advocates={ADV_DEPTS[d].advocates}
                />
              </Card>
            ))}
          </div>
        )}

        {/* ── FITTER TRENDS ── */}
        {tab === 'fitter-trends' && (
          <div>
            {FITTER_DEPT_KEYS.map(d => (
              <Card key={d}>
                <div className="flex items-center gap-2 mb-5">
                  <DeptPill deptKey={d} />
                  <div className="flex-1 h-px" style={{ background: DEPT_BORDER[d] }} />
                </div>
                <TrendChart deptKey={d} metrics={FITTER_DEPTS[d].metrics} entries={fitterEntries} accentColor={DEPT_COLORS[d]} />
              </Card>
            ))}
          </div>
        )}

        {/* ── ADVOCATE HISTORY ── */}
        {tab === 'adv-history' && (
          <Card>
            <SectionLabel>Advocate check-in history</SectionLabel>
            {advEntries.length === 0
              ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  <p className="text-sm font-medium" style={{ color: '#94A3B8' }}>No check-ins saved yet</p>
                </div>
              )
              : [...advEntries].reverse().map(e => (
                <div key={e.id} className="rounded-lg p-4 mb-3" style={{ border: '1px solid #E2E8F0', background: '#FAFBFC' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold" style={{ color: '#0A2342', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{e.week_label}</p>
                      {e.submitter && <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{e.submitter}{e.notes_meta ? ` · ${e.notes_meta}` : ''}</p>}
                    </div>
                  </div>
                  {ADV_DEPT_KEYS.map(d => {
                    const m = e.metrics?.[d] || {}
                    const entries = Object.entries(m)
                    const advList = e.advocates?.[d] || []
                    if (!entries.length && !advList.length) return null
                    return (
                      <div key={d} className="mb-3">
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: DEPT_COLORS[d] }}>
                          {ADV_DEPTS[d].label}
                        </p>
                        {entries.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {entries.slice(0, 5).map(([k, v]) => {
                              const def = ADV_DEPTS[d].metrics.find(x => x.id === k)
                              return (
                                <span key={k} className="text-xs px-2.5 py-1 rounded-full font-medium"
                                  style={{ background: DEPT_BG[d], color: DEPT_COLORS[d] }}>
                                  {def?.label || k}: <strong>{String(v)}</strong>
                                </span>
                              )
                            })}
                            {entries.length > 5 && (
                              <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#F1F5F9', color: '#64748B' }}>
                                +{entries.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                        {advList.length > 0 && (
                          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${DEPT_BORDER[d]}` }}>
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr style={{ background: DEPT_BG[d] }}>
                                  {['Advocate','Out','In','Talk time','Tasks'].map(h => (
                                    <th key={h} className="py-1.5 px-2 text-left font-semibold" style={{ color: DEPT_COLORS[d] }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {advList.map((a: any, i: number) => (
                                  <tr key={a.name} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderTop: `1px solid ${DEPT_BORDER[d]}` }}>
                                    <td className="py-1.5 px-2 font-semibold" style={{ color: '#334155' }}>{a.name}</td>
                                    <td className="py-1.5 px-2" style={{ color: '#475569' }}>{a.out || '—'}</td>
                                    <td className="py-1.5 px-2" style={{ color: '#475569' }}>{a.in || '—'}</td>
                                    <td className="py-1.5 px-2" style={{ color: '#475569' }}>{a.talk || '—'}</td>
                                    <td className="py-1.5 px-2" style={{ color: '#475569' }}>{a.tasks || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {e.wins    && <p className="text-xs mt-2" style={{ color: '#475569' }}><strong style={{ color: '#1E293B' }}>Wins:</strong> {e.wins}</p>}
                  {e.blockers && <p className="text-xs mt-1" style={{ color: '#475569' }}><strong style={{ color: '#1E293B' }}>Blockers:</strong> {e.blockers}</p>}
                </div>
              ))
            }
          </Card>
        )}

        {/* ── FITTER HISTORY ── */}
        {tab === 'fitter-history' && (
          <Card>
            <SectionLabel>Fitter check-in history</SectionLabel>
            {fitterEntries.length === 0
              ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  <p className="text-sm font-medium" style={{ color: '#94A3B8' }}>No check-ins saved yet</p>
                </div>
              )
              : [...fitterEntries].reverse().map(e => (
                <div key={e.id} className="rounded-lg p-4 mb-3" style={{ border: '1px solid #E2E8F0', background: '#FAFBFC' }}>
                  <p className="text-sm font-bold mb-0.5" style={{ color: '#0A2342', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{e.week_label}</p>
                  {e.submitter && <p className="text-xs mb-2" style={{ color: '#64748B' }}>{e.submitter}{e.notes_meta ? ` · ${e.notes_meta}` : ''}</p>}
                  {FITTER_DEPT_KEYS.map(d => {
                    const m = e.metrics?.[d] || {}
                    const entries = Object.entries(m)
                    if (!entries.length) return null
                    return (
                      <div key={d} className="mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: DEPT_COLORS[d] }}>
                          {FITTER_DEPTS[d].label}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {entries.slice(0, 5).map(([k, v]) => {
                            const def = FITTER_DEPTS[d].metrics.find(x => x.id === k)
                            return (
                              <span key={k} className="text-xs px-2.5 py-1 rounded-full font-medium"
                                style={{ background: DEPT_BG[d], color: DEPT_COLORS[d] }}>
                                {def?.label || k}: <strong>{String(v)}</strong>
                              </span>
                            )
                          })}
                          {entries.length > 5 && (
                            <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#F1F5F9', color: '#64748B' }}>
                              +{entries.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {e.wins     && <p className="text-xs mt-2" style={{ color: '#475569' }}><strong style={{ color: '#1E293B' }}>Wins:</strong> {e.wins}</p>}
                  {e.blockers && <p className="text-xs mt-1" style={{ color: '#475569' }}><strong style={{ color: '#1E293B' }}>Blockers:</strong> {e.blockers}</p>}
                </div>
              ))
            }
          </Card>
        )}

      </div>

      {/* footer */}
      <div className="max-w-4xl mx-auto px-6 py-6 text-center">
        <p className="text-xs" style={{ color: '#94A3B8' }}>
          © {new Date().getFullYear()} QMS Weekly Check-in · Internal use only
        </p>
      </div>
    </div>
  )
}
