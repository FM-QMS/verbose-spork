import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/utils/logistics'
import {
  sendEmail,
  buildIntakeNotificationEmail,
  getNotificationRecipients,
  getNotificationFrom,
} from '@/lib/email'

export const dynamic = 'force-dynamic'

const VALID_TYPES = new Set(['return', 'exchange', 'msm'])
const MSM_PRODUCTS = new Set(['Arm', 'Hand', 'Waist', 'Below Knee', 'Foot', 'Full Leg', 'Thigh'])

function buildIntakeNote(submitterName: string, userNotes: string | undefined): string {
  const timestamp = new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
  const body = (userNotes || '').trim() || 'Submitted via field form.'
  return `[${submitterName.trim()} · ${timestamp}]\n${body}`
}

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const type = body.type
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
  }

  const patientId    = (body.patient_id    || '').trim()
  const submitterName = (body.submitter_name || '').trim()

  if (!patientId)     return NextResponse.json({ error: 'Patient ID is required' },     { status: 400 })
  if (!submitterName) return NextResponse.json({ error: 'Your name is required' },     { status: 400 })

  const sb = getSupabase()
  let table: 'returns' | 'msm_devices'
  let prefix: string
  let insert: Record<string, any>

  if (type === 'msm') {
    const products = Array.isArray(body.products) ? body.products.filter((p: any) => MSM_PRODUCTS.has(p)) : []
    if (products.length === 0) {
      return NextResponse.json({ error: 'Select at least one product' }, { status: 400 })
    }
    table = 'msm_devices'
    prefix = 'MS'
    insert = {
      date:          body.date || new Date().toISOString().slice(0, 10),
      patient_id:    patientId,
      products,
      device_status: 'Pending',
      date_mailed:   null,
      notes:         buildIntakeNote(submitterName, body.notes),
      source:        'intake_form',
    }
  } else {
    table = 'returns'
    prefix = type === 'return' ? 'RT' : 'EX'
    insert = {
      type,
      initiated_date:  body.initiated_date || new Date().toISOString().slice(0, 10),
      patient_id:      patientId,
      po_number:       (body.po_number       || '').trim() || null,
      product:         (body.product         || '').trim() || null,
      hcpcs:           (body.hcpcs           || '').trim() || null,
      manufacturer:    (body.manufacturer    || '').trim() || null,
      updated_product: type === 'exchange' ? ((body.updated_product || '').trim() || null) : null,
      shipment_status: 'Return Label Needed',
      advocate:        submitterName,
      notes:           buildIntakeNote(submitterName, body.notes),
      completed:       false,
      source:          'intake_form',
    }
  }

  const { data, error } = await sb.from(table).insert(insert).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reference = `${prefix}-${String(data.id).replace(/-/g, '').slice(0, 8).toUpperCase()}`

  // ── Fire-and-log notification email (does NOT fail the submission) ──
  try {
    const recipients = getNotificationRecipients()
    if (recipients.length > 0) {
      const { subject, html } = buildIntakeNotificationEmail({
        type,
        reference,
        submitterName,
        patientId,
        date: type === 'msm' ? insert.date : insert.initiated_date,
        poNumber:       type !== 'msm' ? insert.po_number       : null,
        product:        type !== 'msm' ? insert.product         : null,
        hcpcs:          type !== 'msm' ? insert.hcpcs           : null,
        manufacturer:   type !== 'msm' ? insert.manufacturer    : null,
        updatedProduct: type === 'exchange' ? insert.updated_product : null,
        products:       type === 'msm' ? insert.products : undefined,
        notes:          body.notes ? String(body.notes).trim() : null,
      })
      const result = await sendEmail({
        to:      recipients,
        from:    getNotificationFrom(),
        subject,
        html,
      })
      if (!result.ok) {
        console.error('[intake] notification email failed:', result.error)
      }
    } else {
      console.warn('[intake] no recipients configured (INTAKE_NOTIFICATION_TO); skipping email')
    }
  } catch (e: any) {
    console.error('[intake] notification email crashed:', e?.message || e)
  }

  return NextResponse.json({ reference, id: data.id }, { status: 201 })
}
