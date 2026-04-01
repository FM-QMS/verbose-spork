'use client'
import { useState, useRef } from 'react'

interface UploadResult {
  success: boolean
  message: string
  weeks?: number
}

interface Props {
  onUploaded?: () => void
}

export default function UploadButton({ onUploaded }: Props) {
  const [status, setStatus]   = useState<'idle' | 'parsing' | 'saving' | 'done' | 'error'>('idle')
  const [result, setResult]   = useState<UploadResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function processFile(file: File) {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'xlsx' && ext !== 'xls') {
      setResult({ success: false, message: 'Please upload an .xlsx file.' })
      setStatus('error')
      return
    }

    setStatus('parsing')
    setResult(null)

    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb     = XLSX.read(buffer, { type: 'array' })

      const entries: any[] = []

      for (const sheetName of wb.SheetNames) {
        if (sheetName.toLowerCase().includes('instruction')) continue
        const lc = sheetName.toLowerCase()
        const isDateSheet    = /^\d{2}-\d{2}-\d{4}$/.test(sheetName)
        const isNamedAdv     = lc.includes('advocate')
        const isNamedFitter  = lc.includes('fitter')
        if (!isDateSheet && !isNamedAdv && !isNamedFitter) continue
        const ws   = wb.Sheets[sheetName]
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        // Determine type: from sheet name or from "Type: advocate/fitter" row in content
        let isAdv    = isNamedAdv
        let isFitter = isNamedFitter
        if (isDateSheet) {
          const typeRow = rows.find((r: any[]) => String(r?.[0] || '').includes('Type:'))
          if (typeRow) {
            const ts = String(typeRow[0]).toLowerCase()
            isAdv    = ts.includes('advocate')
            isFitter = ts.includes('fitter')
          } else {
            isAdv = true
          }
        }

        // ── parse submission info ──
        let weekDate  = ''
        let submitter = ''
        let notesMeta = ''

        for (let r = 0; r < rows.length; r++) {
          const a = String(rows[r]?.[0] || '').trim()
          const b = String(rows[r]?.[1] || '').trim()
          if (a.toLowerCase().includes('week date'))  weekDate  = b
          if (a.toLowerCase().includes('submitted'))  submitter = b
          if (a.toLowerCase().includes('notes'))      notesMeta = b
        }

        // Accept MM/DD/YYYY and convert to YYYY-MM-DD
        if (weekDate && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(weekDate)) {
          const [mm, dd, yyyy] = weekDate.split('/')
          weekDate = `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`
        }

        if (!weekDate || !/^\d{4}-\d{2}-\d{2}$/.test(weekDate)) {
          setResult({ success: false, message: `Sheet "${sheetName}": Week Date is missing or not in MM/DD/YYYY format (e.g. 04/07/2026).` })
          setStatus('error')
          return
        }

        // ── parse metrics ──
        // Column A = label, B = metric_id, C = this week, D = last week
        // dept key is derived from metric_id prefix (cgm_, shoe_, chase_, pfp_, fit_)
        const metrics: Record<string, Record<string, number>> = {}
        const prevMetrics: Record<string, Record<string, number>> = {}

        // ── parse advocates ──
        // Rows where col A is an advocate name (no metric_id in col B)
        // after a "Phone Activity" row
        let currentDept = ''
        let inAdvocates = false
        const advocates: Record<string, any[]> = {}

        const DEPT_MAP: Record<string, string> = {
          cgm_: 'cgm', shoe_: 'shoe', chase_: 'chase', pfp_: 'pfp', fit_: 'fitter',
        }

        for (let r = 0; r < rows.length; r++) {
          const colA = String(rows[r]?.[0] || '').trim()
          const colB = String(rows[r]?.[1] || '').trim()
          const colC = rows[r]?.[2]
          const colD = rows[r]?.[3]

          // detect dept from header rows (no metric id, all caps or dept name)
          const upperA = colA.toUpperCase()
          if (upperA.includes('CGM'))   { currentDept = 'cgm';    inAdvocates = false }
          if (upperA.includes('SHOE'))  { currentDept = 'shoe';   inAdvocates = false }
          if (upperA.includes('CHASE')) { currentDept = 'chase';  inAdvocates = false }
          if (upperA.includes('PFP'))   { currentDept = 'pfp';    inAdvocates = false }
          if (upperA.includes('FITTER MANAGER')) { currentDept = 'fitter'; inAdvocates = false }

          // detect phone activity section
          if (colA.toLowerCase().includes('phone activity')) {
            inAdvocates = true
            continue
          }

          // metric row: col B has a metric id
          if (colB && colB.includes('_') && !inAdvocates) {
            // derive dept from metric id prefix
            let dKey = ''
            for (const prefix of Object.keys(DEPT_MAP)) {
              if (colB.startsWith(prefix)) { dKey = DEPT_MAP[prefix]; break }
            }
            if (!dKey) dKey = currentDept
            if (!dKey) continue

            if (!metrics[dKey])     metrics[dKey]     = {}
            if (!prevMetrics[dKey]) prevMetrics[dKey] = {}

            const thisVal = colC !== '' && colC !== null ? parseInt(String(colC)) : null
            const prevVal = colD !== '' && colD !== null ? parseInt(String(colD)) : null
            if (thisVal !== null && !isNaN(thisVal)) metrics[dKey][colB]     = thisVal
            if (prevVal !== null && !isNaN(prevVal)) prevMetrics[dKey][colB] = prevVal
          }

          // advocate row: in phone section, col A is name, B/C/D/E are stats
          if (inAdvocates && colA && colA !== 'Advocate' && !colA.toLowerCase().includes('phone')) {
            const dKey = currentDept
            if (!dKey) continue
            if (!advocates[dKey]) advocates[dKey] = []
            advocates[dKey].push({
              name:  colA,
              out:   String(rows[r]?.[1] || ''),
              in:    String(rows[r]?.[2] || ''),
              talk:  String(rows[r]?.[3] || ''),
              tasks: String(rows[r]?.[4] || ''),
            })
          }
        }

        // ── week label ──
        const d   = new Date(weekDate + 'T12:00:00')
        const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1)
        const mon = new Date(d); mon.setDate(diff)
        const fri = new Date(mon); fri.setDate(mon.getDate() + 4)
        const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const weekLabel = `Week of ${fmt(mon)} – ${fmt(fri)}, ${fri.getFullYear()}`

        entries.push({
          type:        isAdv ? 'advocate' : 'fitter',
          week_date:   weekDate,
          week_label:  weekLabel,
          submitter,
          notes_meta:  notesMeta,
          metrics,
          advocates:   isAdv ? advocates : null,
          wins:        '',
          blockers:    '',
          focus:       '',
        })
      }

      if (entries.length === 0) {
        setResult({ success: false, message: 'No valid check-in sheets found. Make sure your file uses the QMS template.' })
        setStatus('error')
        return
      }

      // ── save to Supabase ──
      setStatus('saving')
      let saved = 0
      for (const entry of entries) {
        const res = await fetch('/api/checkins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        })
        if (res.ok) saved++
      }

      setResult({ success: true, message: `${saved} check-in${saved !== 1 ? 's' : ''} uploaded successfully.`, weeks: saved })
      setStatus('done')
      onUploaded?.()

    } catch (err: any) {
      setResult({ success: false, message: 'Failed to parse file: ' + (err.message || 'unknown error') })
      setStatus('error')
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const isLoading = status === 'parsing' || status === 'saving'

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isLoading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#1565C0' : '#CBD5E1'}`,
          borderRadius: '10px',
          padding: '20px 24px',
          textAlign: 'center',
          cursor: isLoading ? 'default' : 'pointer',
          background: dragging ? '#EFF6FF' : '#F8FAFC',
          transition: 'all 0.15s',
        }}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />

        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1565C0' }}>
              {status === 'parsing' ? 'Reading file…' : 'Saving to database…'}
            </span>
          </div>
        ) : (
          <div>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block' }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 3 }}>
              Upload check-in spreadsheet
            </p>
            <p style={{ fontSize: 11, color: '#94A3B8' }}>
              Drag and drop or click to browse · .xlsx files only
            </p>
          </div>
        )}
      </div>

      {result && (
        <div style={{
          marginTop: 10,
          padding: '10px 14px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: result.success ? '#E8F5E9' : '#FFEBEE',
          color:      result.success ? '#2E7D32'  : '#C62828',
          border:     `1px solid ${result.success ? '#A5D6A7' : '#FFCDD2'}`,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {result.success
              ? <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              : <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            }
          </svg>
          {result.message}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
