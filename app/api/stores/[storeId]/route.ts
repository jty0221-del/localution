import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params
    if (!storeId) {
      return NextResponse.json({ ok: false, error: 'storeId 누락' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('stores')
      .select('slug, name, category, location, address, naver_place_id, naver_url, main_keyword, sub_keywords, reward_type, reward_value, updated_at')
      .eq('slug', storeId)
      .maybeSingle()

    if (error) {
      // 테이블이 없거나 RLS 차단일 경우 graceful fallback
      return NextResponse.json({ ok: false, store: null, error: error.message })
    }

    if (!data) {
      return NextResponse.json({ ok: true, store: null })
    }

    return NextResponse.json({ ok: true, store: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, store: null, error: e?.message || 'unknown' })
  }
}
