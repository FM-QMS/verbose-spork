'use client'
import { useState, useEffect, useCallback } from 'react'
import MetricTable from '@/components/MetricTable'
import TrendChart from '@/components/TrendChart'
import UploadButton from '@/components/UploadButton'
import InsightsTab from '@/components/InsightsTab'
import HistoryTable from '@/components/HistoryTable'
import { ADV_DEPTS, FITTER_DEPTS, ADV_DEPT_KEYS, FITTER_DEPT_KEYS } from '@/utils/metrics'

function getWeekLabel(dateStr: string) {
  const d   = new Date(dateStr + 'T12:00:00')
  const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d); mon.setDate(diff)
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4)
  const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Week of ${fmt(mon)} – ${fmt(fri)}, ${fri.getFullYear()}`
}

type TabId = 'adv-form' | 'fitter-form' | 'adv-trends' | 'fitter-trends' | 'adv-history' | 'fitter-history' | 'insights'

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
  { label: 'Insights', tabs: [
    { id: 'insights' as TabId, label: 'Weekly report' },
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

function dedupeWeeklyEntries(raw: any[]): any[] {
  const byWeek: Record<string, any> = {}
  for (const e of raw) {
    const d = new Date(e.week_date + 'T12:00:00')
    const day = d.getDay()
    const mon = new Date(d)
    mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    const key = mon.toISOString().slice(0, 10)

    if (!byWeek[key]) {
      byWeek[key] = { ...e, week_date: key }
    } else {
      const existing = byWeek[key]

      // Merge metrics — combine all dept metric objects
      const mergedMetrics: any = {}
      for (const dk of Array.from(new Set([...Object.keys(existing.metrics || {}), ...Object.keys(e.metrics || {})]))) {
        mergedMetrics[dk] = { ...(existing.metrics?.[dk] || {}), ...(e.metrics?.[dk] || {}) }
      }

      // Merge advocates — combine per-dept lists field by field per advocate
      const mergedAdvocates: any = {}
      const allDepts = Array.from(new Set([...Object.keys(existing.advocates || {}), ...Object.keys(e.advocates || {})]))
      for (const dk of allDepts) {
        const exList: any[] = existing.advocates?.[dk] || []
        const inList: any[] = e.advocates?.[dk] || []
        const merged = exList.map((ex: any) => {
          const incoming = inList.find((x: any) => x.name?.toLowerCase() === ex.name?.toLowerCase())
          if (!incoming) return ex
          // Merge: non-empty incoming values win
          const result: any = { ...ex }
          for (const [k, v] of Object.entries(incoming)) {
            if (v !== '' && v !== null && v !== undefined) result[k] = v
          }
          return result
        })
        // Add any advocates from inList not already in exList
        for (const inAdv of inList) {
          if (!merged.find((x: any) => x.name?.toLowerCase() === inAdv.name?.toLowerCase())) {
            merged.push(inAdv)
          }
        }
        mergedAdvocates[dk] = merged
      }

      const cleanSub = (s: any) => (s && typeof s === 'string' && !s.startsWith('{') && !s.startsWith('[')) ? s : ''
      byWeek[key] = {
        ...existing,
        metrics:    mergedMetrics,
        advocates:  mergedAdvocates,
        week_label: existing.week_label || e.week_label,
        submitter:  cleanSub(existing.submitter) || cleanSub(e.submitter),
      }
    }
  }
  return Object.values(byWeek).sort((a: any, b: any) => a.week_date.localeCompare(b.week_date))
}


function DownloadTemplateButton() {
  return (
    <a
      href="/api/template"
      download="QMS_Checkin_Template.xlsx"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
        color: '#1565C0', background: '#E3F0FF',
        border: '1.5px solid #BFDBFE',
        textDecoration: 'none', transition: 'all 0.15s',
      }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Download template
    </a>
  )
}

export default function Home() {
  const today = new Date().toISOString().slice(0, 10)
  const [tab, setTab]           = useState<TabId>('adv-form')
  const [activeDept, setActiveDept] = useState<string>('cgm')
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
  const [advDiscussion, setAdvDiscussion] = useState('')
  const [advMetrics, setAdvMetrics]     = useState<Record<string, Record<string, string>>>({})
  const [advPrev, setAdvPrev]           = useState<Record<string, Record<string, string>>>({})
  const [advAdvocates, setAdvAdvocates] = useState<Record<string, any[]>>({})

  const [fitDate, setFitDate]           = useState(today)
  const [fitSubmitter, setFitSubmitter] = useState('')
  const [fitNotes, setFitNotes]         = useState('')
  const [fitWins, setFitWins]           = useState('')
  const [fitDiscussion, setFitDiscussion] = useState('')
  const [fitBlockers, setFitBlockers]   = useState('')
  const [fitFocus, setFitFocus]         = useState('')
  const [fitMetrics, setFitMetrics]     = useState<Record<string, Record<string, string>>>({})
  const [fitPrev, setFitPrev]           = useState<Record<string, Record<string, string>>>({})

  const loadEntries = useCallback(async (type: 'advocate' | 'fitter') => {
    const res  = await fetch(`/api/checkins?type=${type}`)
    const data = await res.json()
    if (Array.isArray(data)) {
      const deduped = dedupeWeeklyEntries(data)
      type === 'advocate' ? setAdvEntries(deduped) : setFitterEntries(deduped)
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
      discussion: isAdv ? advDiscussion : fitDiscussion,
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
      setAdvSubmitter(''); setAdvNotes(''); setAdvWins(''); setAdvBlockers(''); setAdvFocus(''); setAdvDiscussion('')
    } else {
      setFitMetrics({}); setFitPrev({})
      setFitSubmitter(''); setFitNotes(''); setFitWins(''); setFitBlockers(''); setFitFocus(''); setFitDiscussion('')
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

        {/* nav */}
        <div className="max-w-4xl mx-auto px-6">
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', alignItems: 'stretch' }}>
            {TAB_GROUPS.map((group, gi) => {
              const groupActive = group.tabs.some(t => t.id === tab)
              const isSingle    = group.tabs.length === 1
              const isLast      = gi === TAB_GROUPS.length - 1
              return (
                <div key={group.label} style={{ display: 'flex', alignItems: 'stretch' }}>
                  {/* section */}
                  <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: gi === 0 ? 0 : 20, paddingRight: isLast ? 0 : 20 }}>
                    {/* section label */}
                    <div style={{
                      padding: '7px 2px 5px',
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: groupActive ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.38)',
                      textAlign: 'center',
                      borderBottom: `2px solid ${groupActive ? 'rgba(255,255,255,0.6)' : 'transparent'}`,
                      marginBottom: 2,
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}>
                      {group.label}
                    </div>
                    {/* sub-tabs */}
                    <div style={{ display: 'flex', flex: 1, alignItems: 'flex-end' }}>
                      {group.tabs.map(t => {
                        const isActive = tab === t.id
                        return (
                          <button key={t.id} onClick={() => setTab(t.id)}
                            style={{
                              padding: isSingle ? '8px 18px' : '8px 14px',
                              fontSize: 13,
                              fontWeight: isActive ? 700 : 500,
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              border: 'none',
                              outline: 'none',
                              transition: 'all 0.15s',
                              borderRadius: '6px 6px 0 0',
                              background: isActive ? '#EEF2F7' : 'transparent',
                              color: isActive ? '#0A2342' : 'rgba(255,255,255,0.75)',
                            }}>
                            {t.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {/* divider between sections */}
                  {!isLast && (
                    <div style={{
                      width: 1,
                      margin: '8px 0 0',
                      alignSelf: 'stretch',
                      background: 'rgba(255,255,255,0.15)',
                      flexShrink: 0,
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* content */}
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── ADVOCATE FORM ── */}
        {tab === 'adv-form' && (
          <div>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94A3B8', margin: 0 }}>Upload from spreadsheet</p>
                <DownloadTemplateButton />
              </div>
              <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                Fill in the yellow cells in the template and upload here. Data is saved directly to the database and appears in Trends and History.
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

            {/* Dept toggle header */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: '#fff', borderRadius: 10, padding: '10px 14px', border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', alignSelf: 'center', marginRight: 4 }}>Team</span>
              {ADV_DEPT_KEYS.map(d => (
                <button key={d} onClick={() => setActiveDept(d)}
                  style={{
                    padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${activeDept === d ? DEPT_COLORS[d] : '#E2E8F0'}`,
                    background: activeDept === d ? DEPT_BG[d] : '#F8FAFC',
                    color: activeDept === d ? DEPT_COLORS[d] : '#64748B',
                    transition: 'all 0.15s',
                  }}>
                  {ADV_DEPTS[d].label}
                </button>
              ))}
            </div>

            {ADV_DEPT_KEYS.filter(d => d === activeDept).map(d => (
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
                        <div className="grid grid-cols-3 gap-2" style={{ marginBottom: 8 }}>
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
                        <div className="grid grid-cols-2 gap-2">
                          {(['pagevisits','notescreated'] as const).map((field, fi) => (
                            <div key={field}>
                              <FieldLabel>{['# of Page Visits','# of Notes Created'][fi]}</FieldLabel>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
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
                <div>
                  <FieldLabel hint="— items to raise in team meeting">Topics for discussion</FieldLabel>
                  <textarea placeholder="e.g. Review SNF/Hospice follow-up process, discuss outbound call targets for Q2…" value={advDiscussion} onChange={e => setAdvDiscussion(e.target.value)} />
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94A3B8', margin: 0 }}>Upload from spreadsheet</p>
                <DownloadTemplateButton />
              </div>
              <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                Fill in the yellow cells in the template and upload here. Data is saved directly to the database and appears in Trends and History.
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
                <div>
                  <FieldLabel hint="— items to raise in team meeting">Topics for discussion</FieldLabel>
                  <textarea placeholder="e.g. Review pending Rx queue strategy, fitter assignment backlog…" value={fitDiscussion} onChange={e => setFitDiscussion(e.target.value)} />
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
            <HistoryTable entries={advEntries} type="advocate" />
          </Card>
        )}

        {/* ── FITTER HISTORY ── */}
        {tab === 'fitter-history' && (
          <Card>
            <SectionLabel>Fitter check-in history</SectionLabel>
            <HistoryTable entries={fitterEntries} type="fitter" />
          </Card>
        )}

      {/* ── INSIGHTS ── */}
        {tab === 'insights' && (
          <InsightsTab />
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
