import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TONE_PROMPTS: Record<string, string> = {
  z:       'Z세대 감성으로 작성하세요. "ㅋㅋ", "레전드", "대박", "진짜" 등 Z세대 어휘를 자연스럽게 사용하세요. 가볍고 트렌디한 말투.',
  mom:     '맘카페 후기 스타일로 작성하세요. "~해요", "~더라고요", "~있어요" 등 따뜻하고 신뢰감 있는 말투. 가족/아이 언급 가능.',
  honest:  '솔직담백하게 장단점을 명확히 씁니다. 과장 없이 있는 그대로. 간결하고 직접적.',
  gourmet: '음식 전문가 · 미식가 관점으로 씁니다. 식재료, 조리법, 플레이팅, 풍미 등 전문 용어 사용. 격조 있는 문어체.',
  friend:  '친한 친구에게 카톡하듯 씁니다. 반말 가능. "야", "진짜", "거기" 등 친근한 표현.',
  insta:   '인스타그램 감성 캡션처럼 씁니다. 이모지 1~2개 사용. 감각적이고 트렌디한 표현. 해시태그 분위기.',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action = 'generate' } = body

    // ── OCR: 영수증 분석 ─────────────────────────────────────
    if (action === 'ocr') {
      const { receiptImage, expectedStoreName = '' } = body
      const apiKey = process.env.ANTHROPIC_API_KEY

      if (!apiKey || !receiptImage) {
        return NextResponse.json({ receiptInfo: { items: [], matched: false } })
      }

      const [header, base64] = receiptImage.split(',')
      const mediaType = header.includes('png') ? 'image/png' : 'image/jpeg'

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              {
                type: 'text',
                text: '이 영수증에서 정보를 추출해 JSON으로 반환하세요. 연동 매장명: "' + expectedStoreName + '"\n형식: {"storeName":"매장명","items":["메뉴1","메뉴2"],"total":"합계금액","date":"날짜","matched":true/false}\nJSON만 반환하세요.',
              },
            ],
          }],
        }),
      })

      if (!resp.ok) return NextResponse.json({ receiptInfo: { items: [], matched: false } })

      const data = await resp.json()
      const text = data.content?.[0]?.text || '{}'
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      try {
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
        return NextResponse.json({ receiptInfo: { items: [], matched: false, ...parsed } })
      } catch {
        return NextResponse.json({ receiptInfo: { items: [], matched: false } })
      }
    }

    // ── GENERATE: 리뷰 생성 ──────────────────────────────────
    const {
      images = [],
      storeName = '이 매장',
      storeType = '',
      mainKeyword = '',
      comment = '',
      tone = 'z',
      rating = 5,
      receiptItems = [],
    } = body

    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      const kw = mainKeyword || storeType || storeName
      const item = receiptItems.length > 0 ? receiptItems.slice(0, 2).join(', ') : ''
      const good = rating >= 4
      const demos: Record<string, string> = {
        z:       storeName + ' 다녀왔는데 ' + (good ? '진짜 레전드야ㅠㅠ ' : '나름 괜찮았어 ') + (comment || (item ? item + ' 먹었는데 맛있더라' : '분위기 음식 다 좋았어')) + (good ? ' 강추!!' : ' 한번 가봐.'),
        mom:     storeName + '에 다녀왔어요~ ' + (comment || (item ? item + '가 정말 맛있더라고요' : '음식도 맛있고 서비스도 친절했어요')) + ' 재방문 의사 있어요!',
        honest:  '[' + storeName + '] ' + (comment || (item ? '주문: ' + item : '전반 평가')) + ' | 맛: ' + (good ? '합격' : '보통') + ' | 재방문: ' + (good ? 'O' : '고려중'),
        gourmet: storeName + '을 방문했습니다. ' + (comment || (item ? item + '의 풍미가 인상적이었으며' : '전반적인 완성도가 높으며')) + ' 추천할 만한 곳입니다.',
        friend:  '야 ' + storeName + ' 거기 진짜야. ' + (comment || (item ? item + ' 먹었는데 ㄹㅇ맛있어' : '한번 가봐 진짜')) + ' 강추ㅋㅋ',
        insta:   '✨ ' + storeName + ' ' + (comment || (item ? item : '오늘의 발견')) + (good ? ' 완전 취향저격🥹' : ' 나쁘지 않았어요') + ' 📍',
      }
      return NextResponse.json({
        review: demos[tone] || demos['z'],
        hashtags: ['#' + (mainKeyword || storeName), '#' + (storeType || '맛집'), good ? '#강추' : '#방문후기'],
      })
    }

    // Claude Vision 호출
    const toneGuide = TONE_PROMPTS[tone] || TONE_PROMPTS['z']
    const itemStr   = receiptItems.length > 0 ? '주문 메뉴: ' + receiptItems.join(', ') : ''
    const ratingStr = rating + '점 (' + ['', '매우불만', '불만', '보통', '만족', '매우만족'][rating] + ')'

    const content: object[] = []

    if (images.length > 0) {
      content.push({ type: 'text', text: '다음 사진들을 분석해서 네이버 플레이스 리뷰를 작성해 주세요.' })
      for (const img of images.slice(0, 3)) {
        if (img && img.includes(',')) {
          const [hdr, b64] = img.split(',')
          content.push({ type: 'image', source: { type: 'base64', media_type: hdr.includes('png') ? 'image/png' : 'image/jpeg', data: b64 } })
        }
      }
    }

    content.push({
      type: 'text',
      text: [
        '매장명: ' + storeName,
        '업종: ' + (storeType || '음식점'),
        '키워드: ' + (mainKeyword || storeName),
        itemStr,
        '고객 별점: ' + ratingStr,
        '고객 코멘트: ' + (comment || '없음'),
        '',
        '[말투 지침] ' + toneGuide,
        '',
        '위 정보로 네이버 플레이스 리뷰를 4~6문장으로 작성하세요.',
        '마지막에 해시태그 3개 추가: 형식 → 해시태그: #태그1 #태그2 #태그3',
      ].filter(Boolean).join('\n'),
    })

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!resp.ok) {
      return NextResponse.json({ error: 'AI 오류' }, { status: 500 })
    }

    const result = await resp.json()
    const fullText: string = result.content?.[0]?.text?.trim() || ''

    const hashMatch = fullText.match(/해시태그[:\s]+(#[^\n]+)/)
    const hashtags  = hashMatch ? hashMatch[1].trim().split(/\s+/).filter((t: string) => t.startsWith('#')).slice(0, 5) : []
    const review    = fullText.replace(/해시태그[:\s]+#[^\n]*/g, '').replace(/\n{3,}/g, '\n\n').trim()

    return NextResponse.json({ review, hashtags })
  } catch (err) {
    console.error('qr-review-generate v2 error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
