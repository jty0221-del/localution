// app/api/naver-blog-post/route.ts
// ============================================================
// 네이버 블로그 포스팅 자동 생성 (2026 AI 검색 최적화 v2)
//   · 글 트랙 3종 (A 순위용 / B 신뢰용 / C 관심사형)
//   · 페르소나: 이름·연령대·성별·말투 5종
//   · 검색 의도 키워드 + 리뷰 연동 키워드 + 핵심 타겟
//   · 제목 25자 이내, 특수문자/이모지 금지
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { rateLimit, getClientIp } from '@/app/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Track = 'A' | 'B' | 'C'
type Tone = 'professional' | 'friendly' | 'expert' | 'storyteller' | 'witty'
type Gender = 'any' | 'male' | 'female'

const TRACK_GUIDE: Record<Track, string> = {
  A: `
[글 유형: A 순위용 — 정보·리스트형]
목적: 플레이스 연동 + 키워드 상위 노출
권장 길이: 800~1,500자
구조:
  1) 제목 — 검색 의도 키워드 + 숫자/결과 포함 (25자 이내)
  2) [AI 요약용 핵심 한 줄] — 첫 문장. 이 문장이 네이버 AI 요약 블록에 뽑힘
  3) 소제목 1 — 핵심 정보 (불릿 3개 이내, 한 문장 = 한 메시지) → [사진] → 한 줄 요약
  4) 소제목 2 — 핵심 정보 → [사진] → 한 줄 요약
  5) 소제목 3 — 핵심 정보 → [사진] → 한 줄 요약
  6) 정리 + 플레이스 링크 유도
  7) 해시태그
중점: 정보 밀도 높게, 검색 키워드 자연스럽게 분포, 리스트/표 적극 활용 (AI가 구조화 정보 추출하기 쉬움)`,
  B: `
[글 유형: B 신뢰용 — 사례·스토리형]
목적: 문의·예약·방문 유도, 브랜딩 강화
권장 길이: 1,500~2,500자
구조:
  1) 제목 — 결과 증거 + 타겟 공감 (25자 이내, 예: "광고비 안 쓰고 1위 탈환한 전략")
  2) [AI 요약용 핵심 한 줄]
  3) ① 고객 고민 공감 — 타겟의 언어로 상황 묘사 → [사진]
  4) ② 일반적 해결책의 한계 — "그래서 다들 이렇게 하는데, 사실..." → [사진]
  5) ③ 이 업체만의 접근 방식 — 차별화 포인트 → [사진]
  6) ④ 실제 결과·사례 — 수치, 기간, 변화 → [사진]
  7) ⑤ CTA — 부담 없는 첫 걸음 (4단계 구조)
  8) 해시태그
중점: 진정성, 구체적 수치/기간, 광고 냄새 제거, 사례 중심`,
  C: `
[글 유형: C 관심사형 — 타겟 공감·생활형]
목적: 특정 타겟 공감, 재방문·팬 확보
권장 길이: 1,000~2,000자
구조:
  1) 제목 — 타겟 일상/고민 정확히 짚기 (25자 이내, 예: "퇴근 후 어깨 무거운 직장인이라면")
  2) [AI 요약용 핵심 한 줄]
  3) 공감 인트로 — 타겟 상황 묘사, 광고 냄새 없이 (2~3문장) → [사진]
  4) 관심사 연결 정보 — 타겟이 진짜 궁금한 내용 → [사진]
  5) 생활 밀착 팁 + 업체 자연스럽게 연결 → [사진]
  6) 소프트 CTA + 재방문 유도
  7) 해시태그
중점: 공감, 광고 톤 X, 생활 밀착, 자연스러운 업체 연결`,
}

const TONE_GUIDE: Record<Tone, string> = {
  professional: '말투: 격식 있는 합쇼체 (~합니다, ~겠습니다). 신뢰감·전문성 강조. 의료/법무/세무 등 전문 분야 적합.',
  friendly:     '말투: 편안한 해요체 (~해요, ~이에요). 동네 친구처럼 친근. 카페/미용실/식당 등 적합.',
  expert:       '말투: 데이터·근거 중심. "솔직히 말씀드리면", "많은 분들이 놓치는 부분은..." 같은 진정성 표현. 권위 있는 진단형.',
  storyteller:  '말투: 경험과 사례를 풀어쓰는 스토리텔링. "어느 날 한 손님이 오셨는데..." 같은 흐름. 진정성·감동.',
  witty:        '말투: 가볍고 트렌디. MZ 친화적 어휘 자연스럽게 (단, 과한 신조어 X). 재미·트렌드.',
}

const GENDER_GUIDE: Record<Gender, string> = {
  any:    '',
  male:   '\n페르소나 성별: 남성. 어조에 살짝 단단함과 직설적 표현 가미.',
  female: '\n페르소나 성별: 여성. 어조에 세심함과 공감적 표현 가미.',
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser()
    const limitId = auth.ok ? auth.userId : `ip:${getClientIp(req)}`
    const rl = await rateLimit({ bucket: 'naver-blog-post', id: limitId, limit: 10, windowSec: 60 })
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', retryAfter: rl.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
      )
    }

    const body = await req.json()
    const {
      industry = '',
      track = 'A' as Track,
      persona = { name: '', age: '', gender: 'any' as Gender, tone: 'friendly' as Tone },
      coreTarget = '',
      keywords = [] as string[],
      reviewKeywords = [] as string[],
      draft = '',
      cta = { phone: '', kakao: '', reservation: '' },
      length = 2000,
      photoNames = [] as string[],
    } = body || {}

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY 미설정 — Vercel 환경변수 확인 필요' }, { status: 500 })
    }

    if (!industry.trim() && !keywords.length) {
      return NextResponse.json({ ok: false, error: '업종 또는 검색 의도 키워드를 입력해주세요' }, { status: 400 })
    }

    const validTrack: Track = (['A', 'B', 'C'].includes(track) ? track : 'A') as Track
    const validTone: Tone = (['professional', 'friendly', 'expert', 'storyteller', 'witty'].includes(persona.tone) ? persona.tone : 'friendly') as Tone
    const validGender: Gender = (['any', 'male', 'female'].includes(persona.gender) ? persona.gender : 'any') as Gender

    const mainKeyword = keywords[0] || industry || ''
    const subKeywords = keywords.slice(1)

    const systemPrompt = `당신은 네이버 블로그 관리대행 10년차 전문가입니다. 2026년 네이버 AI 검색 최적화에 능숙한 작가입니다.

[극복하는 과거 로직 — 더 이상 통하지 않음]
- 키워드 반복 삽입(스터핑) → 저품질 분류
- 3000자 채우기용 padding → 체류시간 감소 → 페널티
- "누구나 오세요" 광범위 타겟 → 개인화 시대엔 노출 안 됨
- 동일 템플릿 반복 구조 → 네이버 AI가 복붙으로 인식
- 볼드 남발 → 후킹 효과 소멸
- 인트로에서 자기 자랑 시작 → 독자 이탈

[새로운 3가지 핵심 원칙]
원칙 1. AI 친화 구조
- 첫 문장에 핵심 압축 (네이버 AI 요약 블록이 이 문장을 뽑음)
- 한 단락 = 한 메시지 (3~5문장 이내)
- 소제목은 질문형 또는 결론형
- 각 섹션 끝에 한 줄 요약문 ("즉, OO하면 OO이 됩니다")
- 리스트/표 적극 활용 (AI가 구조화 정보 추출 잘함)

원칙 2. 초개인화 타겟
- "누구나 오세요" 금지
- [상태] + [고민/욕구] + [라이프스타일] 형태로 뾰족하게
- 타겟이 뾰족할수록 공감도↑ 체류시간↑ 알고리즘 플러스↑

원칙 3. 전환율 설계
글의 흐름은 항상 이 순서:
고객 고민 공감 → 일반적 해결책 한계 → 이 업체만의 접근 → 결과/증거 → 부담 없는 첫 걸음 CTA

${TRACK_GUIDE[validTrack]}

[페르소나 톤]
${TONE_GUIDE[validTone]}${GENDER_GUIDE[validGender]}

[제목 작성 규칙]
- 25자 이내 (절대 초과 금지)
- 검색 의도 키워드(메인)를 자연스럽게 포함
- 특수문자 금지: |, ★, ♥, /, ::, !, ?, ※, ▶, ◆ 등 전부
- 이모지 금지
- 패턴 (택1):
  · [타겟 호명] + [고민] + [해결]
  · [기간] + [결과]
  · [손실 회피] (예: "안 하면 OO 못 씁니다")
  · [뾰족한 타겟 직접 호명]
- SEO + AEO 혼합: 검색량 있는 단어 + 첫 문장에서 답이 되는 형식

[CTA 4단계 구조]
1. 부담 없는 첫 제안 ("견적만 먼저 확인해 보셔도 됩니다")
2. 예상 질문 선제 해결 (Q→A 형식 3개)
3. 연락 수단 명확히 (전화 + 카카오 채널 등)
4. 클로징 (긴급성·희소성 한 줄, 과장 X)

[플레이스 리뷰 키워드 연동]
- 본문에서 굵게(Bold)할 단어 = 리뷰 키워드와 일치
- 리뷰 키워드는 본문에 자연스럽게 2회 이상 등장
- CTA 근처에 리뷰 유도 멘트 1줄 가능

[절대 금지]
- 이모티콘 일체 금지 (📷, ✅, ★, 🚗, ⭐ 등)
- 같은 키워드 3회 이상 반복 (저품질 판정)
- 제목 특수 구분자 금지
- 사진 몰아 배치 금지 (분산 필수)
- 제공된 사진 누락 금지 (전부 사용)
- 인트로에서 자기 자랑 시작 금지 (반드시 타겟 고민으로 시작)
- 과도한 불릿/번호 나열 금지 (AI가 복붙으로 인식)

[사진 배치]
- 오프닝 1~2장
- 각 소제목 섹션마다 1~2장 분산
- CTA 직전 또는 직후 1장
- 파일명 그대로 한 줄 표기 (예: KakaoTalk_20260408_151254383.jpg)
- 사진 위치는 본문 흐름에 자연스럽게

[해시태그 5~10개]
- 핵심 의도 키워드
- 업종 관련
- 지역명 + 업종 조합
- 타겟 공감형 롱테일
- 트렌드 반영

[출력 형식]
마크다운으로 작성:
- 제목: 첫 줄에 그냥 텍스트 (heading 기호 # 사용 금지)
- 인용문: > 기호
- 볼드: **텍스트**
- 소제목: **볼드**로 표기 (# 헤딩 금지)
- 사진: 파일명만 한 줄 표기
- 해시태그: 본문 끝 --- 구분선 후

JSON이나 코드블록 없이, 완성된 블로그 포스팅 본문만 출력하세요.

[자가 점검 — 출력 전 확인]
□ 제목 25자 이내
□ 첫 문장이 글 핵심 담음 (AI 요약 블록 대응)
□ 타겟이 [상태+고민+라이프스타일] 뾰족하게 정의됨
□ 같은 키워드 3회 이상 반복 없음
□ 한 단락 5문장 초과 없음
□ 각 섹션 끝 한 줄 요약 있음
□ 사진 분산 배치
□ CTA 4단계 구조
□ 이모티콘·특수문자 없음
□ 리뷰 키워드 본문 2회 이상 자연스럽게 등장
□ 인트로가 자기 자랑 아닌 타겟 고민으로 시작`

    const photoBlock = photoNames.length > 0
      ? `\n\n[제공된 사진 파일명 — 전부 본문에 분산 배치]\n${photoNames.map((n: string, i: number) => `${i + 1}. ${n}`).join('\n')}`
      : '\n\n[사진 없음 — 본문 흐름에 맞춰 "[사진]" 자리 표시만 삽입]'

    const personaBlock = `[페르소나 — 글 발행 주체]
- 이름/닉네임: ${persona.name || '(담당자)'}
- 연령대: ${persona.age || '(미지정)'}
- 성별: ${validGender === 'any' ? '무관' : validGender === 'male' ? '남성' : '여성'}
- 말투 타입: ${validTone}`

    const userMsg = `[업종/주제]
${industry || '(미지정)'}

${personaBlock}

[핵심 타겟 — 뾰족하게]
${coreTarget || '(미지정 — 업종과 키워드 기반으로 추론하여 [상태+고민+라이프스타일] 형태로 작성)'}

[검색 의도 키워드]
- 메인: ${mainKeyword}
- 서브: ${subKeywords.join(', ') || '(없음)'}

[플레이스 리뷰 연동 키워드]
${reviewKeywords.length > 0 ? reviewKeywords.map((k: string) => `- ${k}`).join('\n') : '(없음)'}
${reviewKeywords.length > 0 ? '→ 위 키워드를 본문에서 굵게 처리하고 자연스럽게 2회 이상 등장시키세요' : ''}

[초안·메모·방향성]
${draft || '(없음 — 업종/키워드/타겟 기반으로 작성)'}

[CTA 정보]
- 전화: ${cta.phone || ''}
- 카카오 채널: ${cta.kakao || ''}
- 예약/상담 링크: ${cta.reservation || ''}
${photoBlock}

[글자 수 목표]
${length}자 내외

위 정보로 글 유형 ${validTrack} 트랙에 맞는 네이버 블로그 포스팅을 마크다운으로 완성하세요.
출력 전 [자가 점검] 11개 항목을 모두 통과해야 합니다.`

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 6000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }],
      }),
      signal: AbortSignal.timeout(55000),
    })

    if (!apiRes.ok) {
      const txt = await apiRes.text()
      return NextResponse.json({ ok: false, error: 'Anthropic API 오류: ' + txt.slice(0, 300) }, { status: 500 })
    }

    const data = await apiRes.json()
    const text = data?.content?.[0]?.text || ''

    if (!text) {
      return NextResponse.json({ ok: false, error: '응답이 비어있습니다' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, post: text, track: validTrack })
  } catch (e: any) {
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
      return NextResponse.json({ ok: false, error: 'AI 응답 시간이 초과됐어요. 다시 시도해 주세요.' }, { status: 504 })
    }
    return NextResponse.json({ ok: false, error: e?.message || '알 수 없는 오류' }, { status: 500 })
  }
}
