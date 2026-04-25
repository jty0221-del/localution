import { NextResponse } from 'next/server'

// 요기요 리뷰 API
// 파트너 채널링 계약 필요
// 실제 연동 시 YOGIYO_OWNER_ID, YOGIYO_OWNER_PW 환경변수 필요

export async function GET() {
  const ownerId = process.env.YOGIYO_OWNER_ID
  const ownerPw = process.env.YOGIYO_OWNER_PW

  if (!ownerId || !ownerPw) {
    return NextResponse.json(
      { error: 'YOGIYO_OWNER_ID 및 YOGIYO_OWNER_PW 환경변수를 설정해 주세요.',
        guide: 'https://ceo.yogiyo.co.kr' },
      { status: 503 }
    )
  }

  // TODO: 요기요 사장님 포털 로그인 → 리뷰 데이터 수집
  // 현재 운영용 수집은 worker(yogiyo 어댑터)가 처리하며, 본 라우트는 레거시/개발용이다.
  return NextResponse.json({
    platform: 'yogiyo',
    status: 'demo',
    isDemo: true,
    message: '요기요 파트너 API 연동을 위해 partner.yogiyo.co.kr에서 신청하세요.',
    reviews: getSampleReviews('yogiyo'),
  })
}

export async function POST(request: Request) {
  const { reviewId, content } = await request.json()

  // TODO: 요기요 답글 등록 API 연동
  return NextResponse.json({ success: true, reviewId, message: '답글이 등록되었습니다.' })
}

function getSampleReviews(platform: string) {
  return [
    { id: '1', rating: 5, content: '항상 맛있게 먹고 있어요! 단골입니다 :)', author: '최*하', orderedMenu: '치킨', createdAt: '2026-04-15', replied: false },
    { id: '2', rating: 2, content: '음식이 식어서 왔어요. 개선 부탁드립니다.', author: '정*호', orderedMenu: '피자', createdAt: '2026-04-14', replied: false },
  ]
}
