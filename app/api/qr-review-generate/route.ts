import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const {
      images = [],
      storeName = '이 매장',
      storeType = '',
      mainKeyword = '',
      comment = '',
    } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY

    // ── API 키 없으면 데모 리뷰 반환 ──
    if (!apiKey) {
      const kw = mainKeyword || storeType || storeName
      const demo = comment
        ? `${storeName}에 다녀왔어요! ${comment} 음식도 맛있고 분위기도 좋아서 정말 만족스러운 시간이었어요. 서비스도 친절하고 깔끔해서 더욱 좋았습니다. ${kw ? kw + '를 찾으신다면 ' : ''}${storeName}을 강력 추천해요. 주변 지인들에게도 꼭 알려주고 싶은 곳이에요!`
        : `${storeName}에 다녀왔어요! 오늘도 변함없이 맛있는 음식과 따뜻한 서비스에 기분이 좋아졌어요. ${storeType ? storeType + '로서 ' : ''}매번 퀄리티가 일정해서 믿고 올 수 있는 곳이에요. ${kw ? '#' + kw + ' ' : ''}다음에 또 오고 싶어요!`
      return NextResponse.json({
        review: demo,
        hashtags: ['#' + (mainKeyword || storeName), '#맛집', '#추천'],
      })
    }

    // ── 메시지 구성 ──
    const content: any[] = []

    if (images.length > 0) {
      content.push({
        type: 'text',
        text: '다음 사진들을 꼼꼼히 분석해서 네이버 플레이스에 올릴 리뷰를 작성해 주세요.',
      })
      for (const img of images.slice(0, 3)) {
        if (img && img.startsWith('data:')) {
          const [header, base64] = img.split(',')
          const mediaType = header.includes('png') ? 'image/png' : 'image/jpeg'
          content.push({
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          })
        }
      }
    }

    const systemPrompt = [
      '당신은 네이버 플레이스 리뷰 전문 작성 AI입니다.',
      '고객이 올린 사진과 코멘트를 바탕으로 자연스럽고 진정성 있는 한국어 리뷰를 작성합니다.',
      '리뷰는 4~6문장, 150~250자로 작성하며, 실제 방문한 고객이 쓴 것처럼 자연스러워야 합니다.',
      '이모지는 최대 1개만 사용하세요.',
      '마지막에는 관련 해시태그 3개를 제안하세요.',
      '형식: 리뷰 본문\n\n해시태그: #태그1 #태그2 #태그3',
    ].join(' ')

    content.push({
      type: 'text',
      text: [
        `매장명: ${storeName}`,
        `업종: ${storeType || '음식점'}`,
        `핵심 키워드: ${mainKeyword || storeName}`,
        `고객 코멘트: ${comment || '없음'}`,
        '',
        '위 정보와 사진을 바탕으로 네이버 리뷰를 작성해 주세요.',
      ].join('\n'),
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
        max_tokens: 700,
        system: systemPrompt,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!resp.ok) {
      const err = await resp.text()
      console.error('Claude API error:', resp.status, err.slice(0, 200))
      return NextResponse.json({ error: 'AI 서버 오류' }, { status: 500 })
    }

    const result = await resp.json()
    const fullText: string = result.content?.[0]?.text?.trim() || ''

    // ── 해시태그 파싱 ──
    const hashtagMatch = fullText.match(/해시태그[:\s]+(#[^\n]+)/)
    const rawTags = hashtagMatch ? hashtagMatch[1].trim() : ''
    const hashtags = rawTags
      .split(/\s+/)
      .filter((t: string) => t.startsWith('#'))
      .slice(0, 5)

    const review = fullText
      .replace(/해시태그[:\s]+#[^\n]*/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    return NextResponse.json({ review, hashtags })
  } catch (err) {
    console.error('qr-review-generate error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
