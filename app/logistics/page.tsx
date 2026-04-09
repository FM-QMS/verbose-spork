'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  ReturnRecord, ShipmentStatus, RefundStatus, ExchangeStatus,
  SHIPMENT_STATUSES, REFUND_STATUSES, EXCHANGE_STATUSES,
} from '@/utils/logistics'

// ── Brand colors ────────────────────────────────────────────
const BLUE  = '#6B8CC7'
const PINK  = '#E8689A'
const NAVY  = '#1C2B4A'
const LIGHT = '#F4F6FB'

// ── Status colors ────────────────────────────────────────────
const SHIPMENT_COLORS: Record<ShipmentStatus, { bg: string; text: string; dot: string }> = {
  'Return Label Needed':  { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  'Return Label Mailed':  { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  'Return Received':      { bg: '#F0FDF4', text: '#166534', dot: '#22C55E' },
  'Shipped New Garment':  { bg: '#FAF5FF', text: '#6D28D9', dot: '#A855F7' },
}
const REFUND_COLORS: Record<RefundStatus, { bg: string; text: string; dot: string }> = {
  'Missing Products':   { bg: '#FFF1F2', text: '#BE123C', dot: '#F43F5E' },
  'In Transit':         { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  'Return Not Received':{ bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B' },
}
const EXCHANGE_COLORS: Record<ExchangeStatus, { bg: string; text: string; dot: string }> = {
  'Received Return':       { bg: '#F0FDF4', text: '#166534', dot: '#22C55E' },
  'Missing Products':      { bg: '#FFF1F2', text: '#BE123C', dot: '#F43F5E' },
  'Shipped Replacement':   { bg: '#FAF5FF', text: '#6D28D9', dot: '#A855F7' },
  'Need Product Replacement':{ bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B' },
}

type TabId = 'returns' | 'exchanges' | 'queue' | 'history'

function StatusBadge({ status, colors }: { status: string; colors: { bg: string; text: string; dot: string } }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: colors.bg, color: colors.text }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.dot, flexShrink: 0 }} />
      {status}
    </span>
  )
}

function fmt(d?: string) {
  if (!d) return '—'
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

// ── New Record Modal ─────────────────────────────────────────
function NewRecordModal({ type, onClose, onSave }: { type: 'return' | 'exchange'; onClose: () => void; onSave: (data: any) => void }) {
  const [form, setForm] = useState({
    patient_id: '', po_number: '', product: '', manufacturer: '',
    advocate: '', notes: '', hcpcs: '',
    shipment_status: 'Return Label Needed' as ShipmentStatus,
    refund_status: '' as RefundStatus | '',
    exchange_status: '' as ExchangeStatus | '',
    updated_product: '',
    initiated_date: new Date().toISOString().slice(0, 10),
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!form.patient_id.trim()) return
    setSaving(true)
    await onSave({ ...form, type, hcpcs: form.hcpcs || null, refund_status: form.refund_status || null, exchange_status: form.exchange_status || null })
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#1C2B4A', background: '#fff', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,40,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0, fontFamily: 'Georgia, serif' }}>
              New {type === 'return' ? 'Return' : 'Exchange'}
            </h2>
            <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Fill in the details below to initiate</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94A3B8', padding: 4 }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Patient ID *</label>
              <input style={inputStyle} value={form.patient_id} onChange={e => set('patient_id', e.target.value)} placeholder="e.g. PT-00123" />
            </div>
            <div>
              <label style={labelStyle}>PO Number</label>
              <input style={inputStyle} value={form.po_number} onChange={e => set('po_number', e.target.value)} placeholder="e.g. PO-456789" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Product</label>
            <div style={{ position: 'relative' }}>
              <input style={inputStyle} value={form.product} onChange={e => set('product', e.target.value)} placeholder="e.g. CGM Device, Diabetic Shoes, Compression Garment" />
              {form.hcpcs && (
                <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 700, color: '#6B8CC7', background: '#EFF4FF', padding: '2px 8px', borderRadius: 10, pointerEvents: 'none' }}>
                  {form.hcpcs}
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={labelStyle}>HCPCS Code</label>
            <input style={inputStyle} value={form.hcpcs} onChange={e => set('hcpcs', e.target.value)} placeholder="e.g. A5500, K0001" />
          </div>

          <div>
            <label style={labelStyle}>Manufacturer / Model</label>
            <input style={inputStyle} value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="e.g. Dexcom G7" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Initiate Date</label>
              <input type="date" style={inputStyle} value={form.initiated_date} onChange={e => set('initiated_date', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Shipment Status</label>
              <select style={inputStyle} value={form.shipment_status} onChange={e => set('shipment_status', e.target.value as ShipmentStatus)}>
                {SHIPMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {type === 'return' && (
            <div>
              <label style={labelStyle}>Return Status</label>
              <select style={inputStyle} value={form.refund_status} onChange={e => set('refund_status', e.target.value as RefundStatus)}>
                <option value="">— Select —</option>
                {REFUND_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {type === 'exchange' && (
            <>
              <div>
                <label style={labelStyle}>Exchange Status</label>
                <select style={inputStyle} value={form.exchange_status} onChange={e => set('exchange_status', e.target.value as ExchangeStatus)}>
                  <option value="">— Select —</option>
                  {EXCHANGE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Updated / Replacement Product</label>
                <input style={inputStyle} value={form.updated_product} onChange={e => set('updated_product', e.target.value)} placeholder="e.g. Dexcom G7 Gen 2" />
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>Advocate</label>
            <input style={inputStyle} value={form.advocate} onChange={e => set('advocate', e.target.value)} placeholder="Your name" />
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional context…" />
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#F8FAFC', color: '#64748B', border: '1.5px solid #E2E8F0', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.patient_id.trim()}
            style={{ padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg, ${BLUE}, ${NAVY})`, color: '#fff', border: 'none', cursor: 'pointer', opacity: saving || !form.patient_id.trim() ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Create record'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Modal ───────────────────────────────────────────────
function EditModal({ record, onClose, onSave }: { record: ReturnRecord; onClose: () => void; onSave: (id: string, data: any) => void }) {
  const [form, setForm] = useState({
    shipment_status:      record.shipment_status,
    refund_status:        record.refund_status        || '',
    exchange_status:      record.exchange_status      || '',
    updated_product:      record.updated_product      || '',
    date_return_received: record.date_return_received || '',
    date_label_mailed:    record.date_label_mailed    || '',
    shipping_coordinator: record.shipping_coordinator || '',
    notes:                record.notes                || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    setSaving(true)
    await onSave(record.id, {
      ...form,
      refund_status:   form.refund_status   || null,
      exchange_status: form.exchange_status || null,
      date_return_received: form.date_return_received || null,
      date_label_mailed:    form.date_label_mailed    || null,
    })
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#1C2B4A', background: '#fff', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,40,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0, fontFamily: 'Georgia, serif' }}>Update Record</h2>
            <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Patient {record.patient_id} · {record.type === 'return' ? 'Return' : 'Exchange'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94A3B8' }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Shipment Status</label>
            <select style={inputStyle} value={form.shipment_status} onChange={e => set('shipment_status', e.target.value)}>
              {SHIPMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {record.type === 'return' && (
            <div>
              <label style={labelStyle}>Return Status</label>
              <select style={inputStyle} value={form.refund_status} onChange={e => set('refund_status', e.target.value)}>
                <option value="">— Select —</option>
                {REFUND_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {record.type === 'exchange' && (
            <>
              <div>
                <label style={labelStyle}>Exchange Status</label>
                <select style={inputStyle} value={form.exchange_status} onChange={e => set('exchange_status', e.target.value)}>
                  <option value="">— Select —</option>
                  {EXCHANGE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Updated / Replacement Product</label>
                <input style={inputStyle} value={form.updated_product} onChange={e => set('updated_product', e.target.value)} />
              </div>
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Label Mailed Date</label>
              <input type="date" style={inputStyle} value={form.date_label_mailed} onChange={e => set('date_label_mailed', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Return Received Date</label>
              <input type="date" style={inputStyle} value={form.date_return_received} onChange={e => set('date_return_received', e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Shipping Coordinator</label>
            <input style={inputStyle} value={form.shipping_coordinator} onChange={e => set('shipping_coordinator', e.target.value)} placeholder="Coordinator name" />
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#F8FAFC', color: '#64748B', border: '1.5px solid #E2E8F0', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg, ${BLUE}, ${NAVY})`, color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Notes Modal ──────────────────────────────────────────────
function NotesModal({ record, onClose, onSave }: { record: ReturnRecord; onClose: () => void; onSave: (id: string, notes: string) => void }) {
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Parse existing notes into timestamped entries if possible, else show as-is
  const existing = record.notes || ''

  async function handleAdd() {
    if (!newNote.trim()) return
    setSaving(true)
    const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    const appended = existing
      ? `${existing}\n\n[${timestamp}]\n${newNote.trim()}`
      : `[${timestamp}]\n${newNote.trim()}`
    await onSave(record.id, appended)
    setNewNote('')
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,40,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1C2B4A', margin: 0, fontFamily: 'Georgia, serif' }}>Notes</h2>
            <p style={{ fontSize: 12, color: '#64748B', margin: '3px 0 0' }}>
              Patient {record.patient_id} · {record.type === 'return' ? 'Return' : 'Exchange'}{record.po_number ? ` · ${record.po_number}` : ''}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94A3B8', padding: 4, lineHeight: 1 }}>✕</button>
        </div>

        {/* Existing notes */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
          {existing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {existing.split(/\n\n(?=\[)/).map((entry, i) => {
                const tsMatch = entry.match(/^\[(.+?)\]\n?/)
                const ts   = tsMatch ? tsMatch[1] : null
                const text = tsMatch ? entry.slice(tsMatch[0].length) : entry
                return (
                  <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px' }}>
                    {ts && <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px' }}>{ts}</p>}
                    <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{text}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8' }}>
              <p style={{ fontSize: 13, margin: 0 }}>No notes yet</p>
            </div>
          )}
        </div>

        {/* Add note */}
        <div style={{ padding: '14px 22px 18px', borderTop: '1px solid #F1F5F9', flexShrink: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Add note</p>
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Type a note…"
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#334155', resize: 'vertical', minHeight: 72, boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#F8FAFC', color: '#64748B', border: '1.5px solid #E2E8F0', cursor: 'pointer' }}>Close</button>
            <button onClick={handleAdd} disabled={saving || !newNote.trim()}
              style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg, #6B8CC7, #1C2B4A)', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving || !newNote.trim() ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Add note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Records Table ────────────────────────────────────────────
function RecordsTable({
  records, loading, onEdit, onNotes, onComplete, showComplete = false, isQueue = false
}: {
  records: ReturnRecord[]; loading: boolean;
  onEdit: (r: ReturnRecord) => void;
  onNotes?: (r: ReturnRecord) => void;
  onComplete?: (r: ReturnRecord) => void;
  showComplete?: boolean;
  isQueue?: boolean;
}) {
  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
      <div style={{ fontSize: 13 }}>Loading…</div>
    </div>
  )
  if (!records.length) return (
    <div style={{ padding: '3rem', textAlign: 'center' }}>
      <p style={{ fontSize: 14, color: '#94A3B8', margin: 0 }}>No records found</p>
    </div>
  )

  const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', whiteSpace: 'nowrap' }
  const tdStyle: React.CSSProperties = { padding: '12px 14px', fontSize: 13, color: '#334155', borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
        <thead>
          <tr>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Patient ID</th>
            <th style={thStyle}>PO #</th>
            <th style={thStyle}>Product</th>
            {!isQueue && <th style={thStyle}>Manufacturer</th>}
            <th style={thStyle}>Shipment Status</th>
            <th style={thStyle}>{records[0]?.type === 'exchange' ? 'Exchange Status' : 'Return Status'}</th>
            {records[0]?.type === 'exchange' && <th style={thStyle}>Replacement</th>}
            <th style={thStyle}>Advocate</th>
            {isQueue && <th style={thStyle}>Coordinator</th>}
            <th style={thStyle}>Notes</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => {
            const shipColor = SHIPMENT_COLORS[r.shipment_status] || { bg: '#F8FAFC', text: '#64748B', dot: '#CBD5E1' }
            const secStatus = r.type === 'exchange' ? r.exchange_status : r.refund_status
            const secColor  = r.type === 'exchange'
              ? (r.exchange_status ? EXCHANGE_COLORS[r.exchange_status] : null)
              : (r.refund_status   ? REFUND_COLORS[r.refund_status]     : null)

            return (
              <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                <td style={tdStyle}><span style={{ color: '#64748B', fontSize: 12 }}>{fmt(r.initiated_date)}</span></td>
                <td style={tdStyle}><span style={{ fontWeight: 600, color: NAVY }}>{r.patient_id}</span></td>
                <td style={tdStyle}><span style={{ color: '#64748B', fontSize: 12 }}>{r.po_number || '—'}</span></td>
                <td style={{ ...tdStyle, maxWidth: 160 }}>
                  {r.product ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}
                      onMouseEnter={e => {
                        const tip = e.currentTarget.querySelector('.hcpcs-tip') as HTMLElement
                        if (tip) tip.style.display = 'block'
                      }}
                      onMouseLeave={e => {
                        const tip = e.currentTarget.querySelector('.hcpcs-tip') as HTMLElement
                        if (tip) tip.style.display = 'none'
                      }}>
                      <span style={{ fontSize: 12, cursor: (r as any).hcpcs ? 'help' : 'default', borderBottom: (r as any).hcpcs ? '1px dashed #94A3B8' : 'none' }}>{r.product}</span>
                      {(r as any).hcpcs && (
                        <div className="hcpcs-tip" style={{ display: 'none', position: 'absolute', bottom: '100%', left: 0, marginBottom: 5, background: '#1C2B4A', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap', zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                          HCPCS: {(r as any).hcpcs}
                        </div>
                      )}
                    </div>
                  ) : <span style={{ color: '#CBD5E1' }}>—</span>}
                </td>
                {!isQueue && <td style={tdStyle}><span style={{ fontSize: 12, color: '#64748B' }}>{r.manufacturer || '—'}</span></td>}
                <td style={tdStyle}><StatusBadge status={r.shipment_status} colors={shipColor} /></td>
                <td style={tdStyle}>{secStatus && secColor ? <StatusBadge status={secStatus} colors={secColor} /> : <span style={{ color: '#CBD5E1' }}>—</span>}</td>
                {r.type === 'exchange' && <td style={tdStyle}><span style={{ fontSize: 12, color: '#64748B' }}>{r.updated_product || '—'}</span></td>}
                <td style={tdStyle}><span style={{ fontSize: 12 }}>{r.advocate || '—'}</span></td>
                {isQueue && <td style={tdStyle}><span style={{ fontSize: 12 }}>{r.shipping_coordinator || '—'}</span></td>}
                <td style={tdStyle}>
                  <button
                    onClick={() => onNotes?.(r)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, color: r.notes ? '#6B8CC7' : '#94A3B8', fontWeight: r.notes ? 600 : 400, textDecoration: r.notes ? 'underline' : 'none', textDecorationStyle: 'dotted' as any }}>
                    {r.notes ? 'View / add' : '+ Add note'}
                  </button>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => onEdit(r)}
                      style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', cursor: 'pointer' }}>
                      Update
                    </button>
                    {showComplete && onComplete && (
                      <button onClick={() => onComplete(r)}
                        style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', cursor: 'pointer' }}>
                        Complete ✓
                      </button>
                    )}
                    {isQueue && onComplete && (
                      <button onClick={() => onComplete(r)}
                        style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', cursor: 'pointer' }}>
                        Label Sent ✓
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────
export default function LogisticsApp() {
  const [tab, setTab]         = useState<TabId>('returns')
  const [records, setRecords] = useState<ReturnRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [newModal, setNewModal]   = useState<'return' | 'exchange' | null>(null)
  const [editRecord, setEditRecord] = useState<ReturnRecord | null>(null)
  const [notesRecord, setNotesRecord] = useState<ReturnRecord | null>(null)
  const [search, setSearch]   = useState('')
  const [toast, setToast]     = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    let url = '/api/returns?'
    if (tab === 'returns')   url += 'type=return&completed=false'
    if (tab === 'exchanges') url += 'type=exchange&completed=false'
    if (tab === 'queue')     url += 'queue=true'
    if (tab === 'history')   url += 'completed=true'

    const res  = await fetch(url)
    const data = await res.json()
    setRecords(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  async function handleCreate(data: any) {
    const res = await fetch('/api/returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) { showToast('Record created successfully'); setNewModal(null); load() }
    else { const e = await res.json(); showToast('Error: ' + e.error) }
  }

  async function handleUpdate(id: string, data: any) {
    const res = await fetch(`/api/returns/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) { showToast('Record updated'); setEditRecord(null); load() }
    else { const e = await res.json(); showToast('Error: ' + e.error) }
  }

  async function handleNoteSave(id: string, notes: string) {
    await handleUpdate(id, { notes })
    // Update notesRecord in place so modal reflects new note immediately
    setNotesRecord(prev => prev ? { ...prev, notes } : null)
    // Also refresh list
    load()
  }

  async function handleComplete(record: ReturnRecord) {
    if (!confirm(`Mark this ${record.type} for patient ${record.patient_id} as complete and move to history?`)) return
    await handleUpdate(record.id, { completed: true })
  }

  async function handleLabelSent(record: ReturnRecord) {
    await handleUpdate(record.id, {
      shipment_status: 'Return Label Mailed',
      date_label_mailed: new Date().toISOString().slice(0, 10),
    })
    showToast('Label marked as sent')
  }

  const filtered = records.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return r.patient_id.toLowerCase().includes(q) ||
      (r.po_number || '').toLowerCase().includes(q) ||
      (r.product || '').toLowerCase().includes(q) ||
      (r.advocate || '').toLowerCase().includes(q)
  })

  const TABS: { id: TabId; label: string; desc: string }[] = [
    { id: 'returns',   label: 'Returns',       desc: 'Active refund requests' },
    { id: 'exchanges', label: 'Exchanges',      desc: 'Active exchange requests' },
    { id: 'queue',     label: 'Label Queue',    desc: 'Labels needed · daily task' },
    { id: 'history',   label: 'Order History',  desc: 'Completed transactions' },
  ]

  const activeTab = TABS.find(t => t.id === tab)!

  return (
    <div style={{ minHeight: '100vh', background: LIGHT, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #2A3F6B 100%)`, boxShadow: '0 2px 16px rgba(28,43,74,0.3)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: PINK }}>Q</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.2, fontFamily: 'Georgia, serif' }}>Quantum Medical</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Logistics · Returns & Exchanges</div>
              </div>
            </a>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginLeft: 12 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Home
            </a>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', alignSelf: 'center' }}>
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
            {(tab === 'returns' || tab === 'exchanges') && (
              <button onClick={() => setNewModal(tab === 'returns' ? 'return' : 'exchange')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: PINK, color: '#fff', border: 'none', cursor: 'pointer' }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New {tab === 'returns' ? 'Return' : 'Exchange'}
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '10px 20px', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, cursor: 'pointer', border: 'none', outline: 'none', borderRadius: '8px 8px 0 0', transition: 'all 0.15s',
                background: tab === t.id ? LIGHT : 'transparent',
                color: tab === t.id ? NAVY : 'rgba(255,255,255,0.7)',
              }}>
              {t.label}
              {t.id === 'queue' && records.length > 0 && tab !== 'queue' && (
                <span style={{ marginLeft: 6, background: PINK, color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{records.filter(r => r.shipment_status === 'Return Label Needed').length || ''}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>

        {/* Search + summary bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, PO, product…"
              style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#fff', boxSizing: 'border-box' }} />
          </div>
          <div style={{ fontSize: 13, color: '#64748B' }}>
            <strong style={{ color: NAVY }}>{activeTab.label}</strong> — {activeTab.desc}
          </div>
        </div>

        {/* Table card */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <RecordsTable
            records={filtered}
            loading={loading}
            onEdit={setEditRecord}
            onNotes={setNotesRecord}
            onComplete={tab === 'queue' ? handleLabelSent : (tab !== 'history' ? handleComplete : undefined)}
            showComplete={tab === 'returns' || tab === 'exchanges'}
            isQueue={tab === 'queue'}
          />
        </div>

        {/* Queue helper text */}
        {tab === 'queue' && !loading && (
          <div style={{ marginTop: 12, padding: '12px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12, color: '#1D4ED8' }}>
            <strong>Label Queue</strong> — Shows all active returns and exchanges with status "Return Label Needed" or "Return Label Mailed". Click <strong>Label Sent ✓</strong> to mark a label as mailed, which will update the record in both the Returns and Exchanges tabs.
          </div>
        )}
      </div>

      {/* Modals */}
      {notesRecord && <NotesModal record={notesRecord} onClose={() => setNotesRecord(null)} onSave={handleNoteSave} />}
      {newModal && <NewRecordModal type={newModal} onClose={() => setNewModal(null)} onSave={handleCreate} />}
      {editRecord && <EditModal record={editRecord} onClose={() => setEditRecord(null)} onSave={handleUpdate} />}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: NAVY, color: '#fff', padding: '12px 24px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', zIndex: 2000 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
