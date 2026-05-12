import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/utils/logistics'

export const dynamic = 'force-dynamic'

const ALLOWED_FIELDS = new Set([
  'date',
  'patient_id',
  'products',
  'device_status',
  'date_mailed',
  'notes',
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = getSupabase()
  const body = await req.json()

  const update: Record<string, any> = {}
  for (const k of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(k)) update[k] = body[k]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('msm_devices')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = getSupabase()
  const { error } = await sb.from('msm_devices').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
