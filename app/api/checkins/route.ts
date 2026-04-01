import { createClient } from '@/utils/supabase/client'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'advocate' | 'fitter'

  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('type', type || 'advocate')
    .order('week_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const body = await request.json()

  // Upsert by type + week_date so resubmitting same week overwrites
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
}
