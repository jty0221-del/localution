import { NextRequest, NextResponse } from 'next/server'
import { lookupPlace } from '@/app/lib/naver-place'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const hintCategory = req.nextUrl.searchParams.get('category')

  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 })
  }

  const info = await lookupPlace(id, hintCategory)
  if (!info) {
    return NextResponse.json(
      { ok: false, error: 'not_found', message: '네이버 플레이스에서 해당 ID를 찾지 못했습니다. 비공개 업체이거나 ID가 잘못됐을 수 있어요.' },
      { status: 404 },
    )
  }

  return NextResponse.json({ ok: true, info })
}
