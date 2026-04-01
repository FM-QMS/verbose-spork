import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!url || !key) throw new Error('Missing Supabase environment variables')
  return createClient(url, key)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'advocate'

    const { data, error } = await supabase
      .from('checkins')
      .select('*')
      .eq('type', type)
      .order('week_date', { ascending: true })

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
      .from('checkins')
      .upsert(
        {
          type:        body.type,
          week_date:   body.week_date,
          week_label:  body.week_label,
          submitter:   body.submitter,
          notes_meta:  body.notes_meta,
          metrics:     body.metrics,
          advocates:   body.advocates || null,
          wins:        body.wins,
          blockers:    body.blockers,
          focus:       body.focus,
          updated_at:  new Date().toISOString(),
        },
        { onConflict: 'type,week_date' }
      )
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
