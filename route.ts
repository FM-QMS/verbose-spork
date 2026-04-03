import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
    if (!url || !key) return NextResponse.json({ error: 'Missing env vars' })

    const supabase = createClient(url, key)
    const { data, error } = await supabase
      .from('checkins')
      .select('week_date, type, advocates')
      .eq('type', 'advocate')
      .order('week_date', { ascending: false })
      .limit(3)

    if (error) return NextResponse.json({ error: error.message })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message })
  }
}
