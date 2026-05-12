import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/utils/logistics'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = getSupabase()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let q = sb.from('msm_devices').select('*').order('date', { ascending: false })
  if (status === 'Pending' || status === 'Mailed') {
    q = q.eq('device_status', status)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const sb = getSupabase()
  const body = await req.json()

  if (!body.patient_id || typeof body.patient_id !== 'string' || !body.patient_id.trim()) {
    return NextResponse.json({ error: 'patient_id is required' }, { status: 400 })
  }
  if (!Array.isArray(body.products) || body.products.length === 0) {
    return NextResponse.json({ error: 'At least one product is required' }, { status: 400 })
  }

  const insert = {
    date:          body.date || new Date().toISOString().slice(0, 10),
    patient_id:    body.patient_id.trim(),
    products:      body.products,
    device_status: body.device_status || 'Pending',
    date_mailed:   body.date_mailed || null,
    notes:         body.notes || null,
  }

  const { data, error } = await sb.from('msm_devices').insert(insert).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
