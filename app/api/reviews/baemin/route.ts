import { NextResponse } from 'next/server'

// 배달의민족 리뷰 API
// 공식 API 없음 → 사장님 포털 세션 기반
// 실제 연동 시 BAEMIN_OWNER_ID, BAEMIN_OWNER_PW 환경변수 필요

export async function GET() {
 const ownerId = process.env.BAEMIN_OWNER_ID
 const ownerPw = process.env.BAEMIN_OWNER_PW

 if (!ownerId || !ownerPw) {
 return NextResponse.json(
 { error: 'BAEMIN_OWNER_ID 및 BAEMIN_OWNER_PW 환경변수를 설정해 주세요.',
 guide: 'https://self.baemin.com' },
 { status: 503 }
 )
 }

 // TODO: 배민 사장님 포털 로그인 → 세션 토큰 획득 → 리뷰 API 호출
 // 현재는 샘플 데이터 반환
 return NextResponse.json({
 platform: 'baemin',
 status: 'demo',
 message: '배달의민족 공식 API가 없어 파트너 계약이 필요합니다.',
 reviews: getSampleReviews('baemin'),
 })
}

export async function POST(request: Request) {
 const { reviewId, content } = await request.json()

 // TODO: 배민 답글 등록 API 연동
 return NextResponse.json({ success: true, reviewId, message: '답글이 등록되었습니다.' })
}

function getSampleReviews(platform: string) {
 return [
 { id: '1', rating: 5, content: '음식이 정말 맛있어요! 포장도 꼼꼼하게 잘 해주셨고 배달도 빠르게 와서 좋았습니다.', author: '김*영', orderedMenu: '불고기 덮밥', createdAt: '2026-04-15', replied: false },
 { id: '2', rating: 4, content: '맛있었는데 좀 늦게 왔어요. 그래도 음식은 맛있었습니다.', author: '이*수', orderedMenu: '제육볶음', createdAt: '2026-04-14', replied: true, replyContent: '소중한 리뷰 감사합니다. 더 빠른 배달을 위해 노력하겠습니다!' },
 { id: '3', rating: 3, content: '보통이에요. 특별한 것은 없었습니다.', author: '박*민', orderedMenu: '김치찌개', createdAt: '2026-04-13', replied: false },
 ]
}
