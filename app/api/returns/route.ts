import { getSupabase } from '@/utils/logistics'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(request.url)
    const type      = searchParams.get('type')      // 'return' | 'exchange'
    const completed = searchParams.get('completed') // 'true' | 'false'
    const queue     = searchParams.get('queue')     // 'true' = label queue view

    let query = supabase.from('returns').select('*').order('created_at', { ascending: false })

    if (type)      query = query.eq('type', type)
    if (completed !== null) query = query.eq('completed', completed === 'true')
    const inRefund  = searchParams.get('in_refund')
    if (inRefund !== null) query = query.eq('in_refund', inRefund === 'true')
    if (queue === 'true') {
      query = query
        .eq('completed', false)
        .in('shipment_status', ['Return Label Needed', 'Return Label Mailed'])
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await request.json()

    const { data, error } = await supabase
      .from('returns')
      .insert({
        type:             body.type,
        initiated_date:   body.initiated_date || new Date().toISOString().slice(0, 10),
        patient_id:       body.patient_id,
        po_number:        body.po_number,
        product:          body.product,
        manufacturer:     body.manufacturer,
        shipment_status:  body.shipment_status || 'Return Label Needed',
        refund_status:    body.refund_status   || null,
        exchange_status:  body.exchange_status || null,
        updated_product:  body.updated_product || null,
        advocate:         body.advocate,
        hcpcs:            body.hcpcs || null,
        notes:            body.notes,
        completed:        false,
        updated_at:       new Date().toISOString(),
      })
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data?.[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
