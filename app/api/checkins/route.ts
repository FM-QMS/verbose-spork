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

// Deep-merge advocate arrays: combine fields from existing + incoming by advocate name
function mergeAdvocates(
  existing: Record<string, any[]> | null,
  incoming: Record<string, any[]> | null
): Record<string, any[]> | null {
  if (!incoming) return existing
  if (!existing) return incoming

  const merged: Record<string, any[]> = { ...existing }

  for (const [deptKey, incomingList] of Object.entries(incoming)) {
    if (!Array.isArray(incomingList)) continue
    const existingList: any[] = merged[deptKey] || []

    const mergedList = [...existingList]

    for (const incomingAdv of incomingList) {
      const idx = mergedList.findIndex(
        (e: any) => e.name?.toLowerCase() === incomingAdv.name?.toLowerCase()
      )
      if (idx >= 0) {
        // Merge: keep existing values, overwrite only with non-empty incoming values
        mergedList[idx] = {
          ...mergedList[idx],
          ...Object.fromEntries(
            Object.entries(incomingAdv).filter(([, v]) => v !== '' && v !== null && v !== undefined)
          ),
        }
      } else {
        mergedList.push(incomingAdv)
      }
    }

    merged[deptKey] = mergedList
  }

  return merged
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await request.json()

    // Check if a record already exists for this type + week_date
    const { data: existing } = await supabase
      .from('checkins')
      .select('id, advocates, metrics')
      .eq('type', body.type)
      .eq('week_date', body.week_date)
      .maybeSingle()

    // Merge advocates so phone data + pagevisits/notescreated co-exist
    const mergedAdvocates = mergeAdvocates(
      existing?.advocates ?? null,
      body.advocates ?? null
    )

    // Merge metrics too (don't wipe existing metrics if new upload only has partial data)
    const mergedMetrics = body.metrics
      ? { ...(existing?.metrics ?? {}), ...body.metrics }
      : existing?.metrics ?? {}

    const payload = {
      type:       body.type,
      week_date:  body.week_date,
      week_label: body.week_label,
      submitter:  body.submitter  || existing?.submitter || '',
      notes_meta: body.notes_meta,
      metrics:    mergedMetrics,
      advocates:  mergedAdvocates,
      wins:       body.wins,
      blockers:   body.blockers,
      focus:      body.focus,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('checkins')
      .upsert(payload, { onConflict: 'type,week_date' })
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
