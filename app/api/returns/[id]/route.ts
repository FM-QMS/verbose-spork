import { getSupabase } from '@/utils/logistics'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabase()
    const body = await request.json()

    const updates: any = { ...body, updated_at: new Date().toISOString() }

    // If completing, set completed fields
    if (body.completed === true) {
      updates.completed_at  = new Date().toISOString()
      updates.date_completed = new Date().toISOString().slice(0, 10)
    }

    const { data, error } = await supabase
      .from('returns')
      .update(updates)
      .eq('id', params.id)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data?.[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
