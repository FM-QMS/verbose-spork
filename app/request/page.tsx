'use client'
import { useState } from 'react'

// ── Brand colors (match /logistics) ─────────────────────────
const BLUE = '#6B8CC7'
const PINK = '#E8689A'
const NAVY = '#1C2B4A'

const MSM_PRODUCT_OPTIONS = ['Arm', 'Hand', 'Waist', 'Below Knee', 'Foot', 'Full Leg', 'Thigh'] as const

type RequestType = 'return' | 'exchange' | 'msm'

const TYPE_LABELS: Record<RequestType, string> = {
  return:   'Return',
  exchange: 'Exchange',
  msm:      'MSM Device',
}

const EMPTY_FORM = {
  patient_id: '',
  submitter_name: '',
  notes: '',
  // return / exchange
  po_number: '',
  product: '',
  hcpcs: '',
  manufacturer: '',
  updated_product: '',
  initiated_date: new Date().toISOString().slice(0, 10),
  // msm
  products: [] as string[],
  date: new Date().toISOString().slice(0, 10),
}

export default function RequestForm() {
  const [type, setType] = useState<RequestType>('return')
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ reference: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const toggleProduct = (p: string) => {
    setForm(prev => ({
      ...prev,
      products: prev.products.includes(p)
        ? prev.products.filter(x => x !== p)
        : [...prev.products, p],
    }))
  }

  function canSubmit(): boolean {
    if (!form.patient_id.trim() || !form.submitter_name.trim()) return false
    if (type === 'msm' && form.products.length === 0) return false
    return true
  }

  async function handleSubmit() {
    if (!canSubmit() || submitting) return
    setError(null)
    setSubmitting(true)

    const body: Record<string, any> = {
      type,
      patient_id:     form.patient_id,
      submitter_name: form.submitter_name,
      notes:          form.notes,
    }
    if (type === 'msm') {
      body.date     = form.date
      body.products = form.products
    } else {
      body.initiated_date = form.initiated_date
      body.po_number      = form.po_number
      body.product        = form.product
      body.hcpcs          = form.hcpcs
      body.manufacturer   = form.manufacturer
      if (type === 'exchange') body.updated_product = form.updated_product
    }

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || `Submission failed (HTTP ${res.status})`)
        setSubmitting(false)
        return
      }
      setSuccess({ reference: data.reference })
    } catch (e: any) {
      setError(e?.message || 'Network error — please try again')
    }
    setSubmitting(false)
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setType('return')
    setSuccess(null)
    setError(null)
  }

  // ─── Styles ────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: 8,
    fontSize: 14, color: '#1C2B4A', background: '#fff', boxSizing: 'border-box',
    fontFamily: 'inherit', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 6, display: 'block',
  }

  // ─── Success state ─────────────────────────────────────────
  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #F4F6FB 0%, #EBF0FF 60%, #F8EEF4 100%)', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '44px 32px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 10px 40px rgba(28,43,74,0.1)' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#F0FDF4', margin: '0 auto 22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>Request submitted</h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 26px', lineHeight: 1.5 }}>Your request has been received and will be reviewed by the team. Keep your reference number for follow-up.</p>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 20px', marginBottom: 28 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 5px' }}>Reference Number</p>
            <p style={{ fontSize: 19, fontWeight: 700, color: NAVY, margin: 0, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{success.reference}</p>
          </div>

          <button onClick={resetForm}
            style={{ padding: '11px 28px', borderRadius: 22, fontSize: 14, fontWeight: 700, background: `linear-gradient(135deg, ${BLUE}, ${NAVY})`, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(28,43,74,0.2)' }}>
            Submit another request
          </button>
        </div>
      </div>
    )
  }

  // ─── Main form ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #F4F6FB 0%, #EBF0FF 60%, #F8EEF4 100%)', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", padding: '40px 20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>Request Form</h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>Submit a return, exchange, or MSM device request</p>
        </div>

        {/* Form card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '28px 32px', boxShadow: '0 4px 20px rgba(28,43,74,0.08)', border: '1px solid #E2E8F0' }}>

          {/* Request type selector */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Request Type</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['return', 'exchange', 'msm'] as RequestType[]).map(t => {
                const selected = type === t
                return (
                  <button key={t} type="button" onClick={() => setType(t)}
                    style={{
                      flex: 1, minWidth: 100, padding: '11px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: selected ? `linear-gradient(135deg, ${BLUE}, ${NAVY})` : '#fff',
                      color: selected ? '#fff' : '#64748B',
                      border: `1.5px solid ${selected ? NAVY : '#E2E8F0'}`,
                      transition: 'all 0.15s',
                    }}>
                    {TYPE_LABELS[t]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Your Name *</label>
                <input style={inputStyle} value={form.submitter_name} onChange={e => set('submitter_name', e.target.value)} placeholder="e.g. Jane Smith" />
              </div>
              <div>
                <label style={labelStyle}>Patient ID *</label>
                <input style={inputStyle} value={form.patient_id} onChange={e => set('patient_id', e.target.value)} placeholder="e.g. PT-00123" />
              </div>
            </div>

            {type !== 'msm' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Date</label>
                    <input type="date" style={inputStyle} value={form.initiated_date} onChange={e => set('initiated_date', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>PO Number</label>
                    <input style={inputStyle} value={form.po_number} onChange={e => set('po_number', e.target.value)} placeholder="e.g. PO-456789" />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Product</label>
                  <input style={inputStyle} value={form.product} onChange={e => set('product', e.target.value)} placeholder="e.g. CGM Device, Compression Garment" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>HCPCS Code</label>
                    <input style={inputStyle} value={form.hcpcs} onChange={e => set('hcpcs', e.target.value)} placeholder="e.g. A5500" />
                  </div>
                  <div>
                    <label style={labelStyle}>Manufacturer / Model</label>
                    <input style={inputStyle} value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="e.g. Dexcom G7" />
                  </div>
                </div>

                {type === 'exchange' && (
                  <div>
                    <label style={labelStyle}>Replacement Product</label>
                    <input style={inputStyle} value={form.updated_product} onChange={e => set('updated_product', e.target.value)} placeholder="e.g. Dexcom G7 Gen 2" />
                  </div>
                )}
              </>
            )}

            {type === 'msm' && (
              <>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input type="date" style={inputStyle} value={form.date} onChange={e => set('date', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>
                    Product * <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: '#94A3B8' }}>(select one or more)</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {MSM_PRODUCT_OPTIONS.map(p => {
                      const selected = form.products.includes(p)
                      return (
                        <button key={p} type="button" onClick={() => toggleProduct(p)}
                          style={{
                            padding: '9px 16px', borderRadius: 22, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            background: selected ? PINK : '#fff',
                            color: selected ? '#fff' : '#64748B',
                            border: `1.5px solid ${selected ? PINK : '#E2E8F0'}`,
                            transition: 'all 0.15s',
                          }}>
                          {selected && <span style={{ marginRight: 5 }}>✓</span>}{p}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 90 }}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any additional context or details…"
              />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 18, padding: '11px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, color: '#B91C1C' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <div style={{ marginTop: 24 }}>
            <button onClick={handleSubmit} disabled={submitting || !canSubmit()}
              style={{
                width: '100%', padding: '13px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                background: `linear-gradient(135deg, ${BLUE}, ${NAVY})`, color: '#fff', border: 'none',
                cursor: submitting || !canSubmit() ? 'not-allowed' : 'pointer',
                opacity: submitting || !canSubmit() ? 0.5 : 1,
                transition: 'all 0.15s',
                boxShadow: '0 4px 14px rgba(28,43,74,0.18)',
              }}>
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 18 }}>
          Required fields marked with *
        </p>
      </div>
    </div>
  )
}
