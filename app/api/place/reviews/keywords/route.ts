// app/api/place/reviews/keywords/route.ts
// ============================================================
// 사용자 리뷰의 키워드 분석
//   · 등장 빈도 + 평균 별점 + 긍정/부정 비율 + 샘플 리뷰
//   · Korean text 기반 — 간단한 토큰화 + 불용어 제거 (외부 라이브러리 X)
//
// GET ?platform=naver_place&min_count=2&limit=30
//   - platform: 단일 플랫폼 (없으면 전체)
//   - min_count: 최소 등장 횟수 (기본 2)
//   - limit: 상위 N개 (기본 30)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 한국어 불용어 (조사, 어미, 일반 단어)
const STOPWORDS = new Set([
  // 조사·어미
  '이다', '하다', '되다', '있다', '없다', '같다', '많다', '없이', '에서', '에는', '에서도',
  '으로', '에게', '한테', '에서는', '에서도', '에서만', '인데', '인지',
  // 일반 명사 (의미 약함)
  '오늘', '어제', '지금', '여기', '저기', '거기', '경우', '정도', '느낌', '편', '쪽',
  '점', '게', '거', '것', '수', '때', '곳', '데', '뭐', '이런', '저런', '그런', '어떤',
  '제가', '저는', '저희', '우리', '너무', '정말', '진짜', '엄청', '완전', '아주', '매우',
  '조금', '약간', '거의', '하지만', '근데', '그래서', '그리고', '그런데', '그래도',
  '다른', '같은', '어떻게', '어디', '언제', '왜', '무엇', '누구', '어느',
  '먹고', '먹어', '먹은', '먹는', '먹기', '드시', '드세', '드시고', '드세요',
  '하고', '하는', '한번', '하면', '해서', '해주', '해줘', '하시', '하지',
  '있어', '있고', '있는', '있어서', '있어요', '있었', '있었어', '있었어요',
  '같이', '같아', '같은데', '같았', '같아서', '같습니다',
  '되고', '되는', '되니', '됐어요', '됐고', '되면', '되니까',
  '제일', '가장', '특히', '특별', '아니', '아니라', '하나', '두번', '세번',
  '받아', '받았', '받았어요', '받아서', '받았는데',
  '왔어', '왔어요', '왔고', '왔는데', '왔습니다', '왔다',
  '갔어', '갔어요', '갔고', '갔는데', '갔다', '갈게요', '갈때', '갈때마다',
  '올게', '올게요', '올께', '올께요', '올때', '올때마다', '올거에요', '올겁니다',
  '주문', '배달', '리뷰', '평점', '별점', '시키',
  '음식', '메뉴', '식당', '가게', '매장',
  // 대명사·연결어
  '이거', '저거', '그거', '여긴', '저긴', '거긴', '저게', '그게',
  '뭐가', '뭐든', '얼마나', '어찌나',
])

// 한국어 동사·형용사 활용 어미 패턴 — 이걸로 끝나는 단어는 동사/문장 조각 → 키워드 제외
//   예: "올게요", "갔어요", "다녀왔어요", "맛있더라고요", "올때마다"
const VERB_ENDING_REGEX = new RegExp([
  // 종결 어미 (-요/-습니다)
  '(?:게요|까요|어요|아요|에요|예요|네요|지요|죠|이지요|이지)$',
  // 과거형 (-았/었/였)
  '(?:았어요?|었어요?|였어요?|했어요?|됐어요?|갔어요?|왔어요?|봤어요?|샀어요?|줬어요?|썼어요?|얹어요?)$',
  // 미래/추측 (-겠/-까)
  '(?:겠어요?|일까요?|일거에요|거에요|거예요|거든요|이거든요)$',
  // 보고/회상 어미
  '(?:더라고요?|더군요?|던데요?|던가요?|네그려|구나|구만|는구나)$',
  // 연결 어미
  '(?:면|면서|면서도|니까|지만|어서|아서|어도|아도|러|려고|도록|자마자|는데도)$',
  // 시간/조건 결합 (-때, -때마다, -하면)
  '(?:때마다|때면|때까지|을때|를때)$',
  // 보조 / 인용
  '(?:다는|라는|자는|하는|되는|이라는|이라서|이라며)$',
].join('|'))

// 동사 어간 시작 패턴 — 명사가 아닌 동사형 단어 시작
//   예: 다녀, 들어, 나와, 받았, 보고, 했었
const VERB_STEM_PREFIX_REGEX = /^(?:다녀|들어|나와|나갔|받았|받고|받은|보고|봤|봤었|했었|했지|들어와|올라|내려|모이|모여|찾아)/

// 음식점에 흔한 의미 있는 키워드 패턴 (긍정·부정 분류용)
const POSITIVE_WORDS = ['맛있', '맛나', '좋', '훌륭', '최고', '대박', '깔끔', '친절', '신선', '깨끗', '편안', '만족', '추천', '재방문', '인생']
const NEGATIVE_WORDS = ['별로', '실망', '아쉬', '비싸', '느려', '느리', '식어', '딱딱', '짜', '시', '비위', '불편', '더러']

// 형용사/동사 어간 추출 — "맛있고/맛있는/맛있게" → "맛있"
//   적용 순서: 긴 어미 → 짧은 어미 (greedy)
const STEM_SUFFIXES = [
  '하셨어요', '하셨네요', '하시던데요', '하던데요', '하더라고요', '하더군요',
  '했더라고요', '했더군요', '했어요', '하더라', '하더군', '하더니',
  '합니다', '하셨다', '하시고', '하셨고', '하시면', '하시는', '하시네',
  '이에요', '예요', '입니다', '이고요', '이거든요',
  '하지만', '하다가', '하면서', '하지요', '하잖아', '하잖아요',
  '하고', '하게', '하는', '하던', '한데', '한다', '하면', '해서', '해주', '해줘', '해도', '해야',
  '있어요', '있네요', '있더라', '있고요', '있는데', '있어서', '있다', '있고', '있는', '있게', '있던', '있는데도',
  '었어요', '았어요', '였어요', '었네요', '았네요', '었지만', '았지만', '었고', '았고', '었던', '았던',
  '더라고요', '더군요', '더라구요', '더라', '던데', '던가요', '구나', '구만',
  '하네요', '되네요', '되었어요', '됐어요', '됐고', '됐지만', '되고', '되는', '되면',
  '거든요', '거예요', '거에요', '거든', '걸요', '데요',
  '네요', '어요', '아요', '게요', '까요', '죠', '지요',
  '으면', '으니까', '으면서', '으로', '에서', '에는',
  '도록', '러서', '려고', '려면',
  '면서', '니까', '지만', '어서', '아서',
  '습니다', '습니까',
]

function extractStem(w: string): string {
  let stem = w
  // 긴 어미 우선
  for (const suffix of STEM_SUFFIXES) {
    if (stem.endsWith(suffix) && stem.length > suffix.length + 1) {
      stem = stem.slice(0, -suffix.length)
      break
    }
  }
  return stem
}

function tokenize(text: string): string[] {
  if (!text) return []
  const cleaned = text
    .replace(/[^가-힯ㄱ-ㆎa-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const words = cleaned.split(' ').filter(Boolean)

  const tokens: string[] = []
  for (const w of words) {
    if (w.length < 2) continue
    if (w.length > 10) continue
    if (STOPWORDS.has(w)) continue
    if (/^\d+$/.test(w)) continue

    // 동사 활용형 차단
    if (VERB_ENDING_REGEX.test(w)) continue
    if (VERB_STEM_PREFIX_REGEX.test(w)) continue

    // 어간 추출
    const stem = extractStem(w)
    if (stem.length < 2) continue
    if (STOPWORDS.has(stem)) continue
    if (VERB_ENDING_REGEX.test(stem)) continue
    if (/^[ㄱ-ㆎ]+$/.test(stem)) continue

    tokens.push(stem)
  }
  return tokens
}

// ── 카테고리 분류 사전 — 네이버 플레이스 분류 체계 차용 ──
//   메뉴 / 특징(목적/예약/청결도/가격/위치/음식량/분위기/서비스/만족도/맛)
const CATEGORY_DICT: Record<string, string[]> = {
  '맛': ['맛있', '맛없', '맛깔', '풍미', '향', '진한', '담백', '시원', '쫄깃', '바삭', '신선', '고소', '달콤', '얼큰', '매콤', '구수', '깊', '진하', '뛰어'],
  '서비스': ['친절', '서비스', '응대', '직원', '사장님', '점원', '배려', '세심', '미소', '따뜻', '정성', '다정', '인사', '응'],
  '청결도': ['깨끗', '청결', '위생', '깔끔', '단정', '정돈', '먼지', '더러', '냄새'],
  '가격': ['가격', '저렴', '비싸', '합리', '가성', '값', '저비용', '고가'],
  '분위기': ['분위기', '인테리어', '조명', '음악', '아늑', '편안', '조용', '시끄러', '쾌적', '오픈', '감성', '레트로', '모던', '깔끔'],
  '위치': ['위치', '접근', '주차', '교통', '찾기', '인근', '근처', '가까', '멀'],
  '음식량': ['양', '푸짐', '넉넉', '많', '적', '부족', '실속'],
  '만족도': ['만족', '추천', '재방문', '인생', '최고', '최악', '대박', '강추', '비추', '실망', '훌륭'],
  '목적': ['데이트', '가족', '회식', '친구', '혼밥', '모임', '단체', '소개팅', '약속', '아이', '연인'],
  '예약': ['예약', '웨이팅', '대기', '줄'],
}

function classifyCategory(keyword: string): string {
  for (const [cat, patterns] of Object.entries(CATEGORY_DICT)) {
    for (const p of patterns) {
      if (keyword.includes(p) || p.includes(keyword)) return cat
    }
  }
  return '기타'
}

function classifySentiment(rating: number | null, content: string): 'positive' | 'negative' | 'neutral' {
  if (rating !== null) {
    if (rating >= 4) return 'positive'
    if (rating <= 2) return 'negative'
  }
  // rating 없으면 키워드 기반
  if (POSITIVE_WORDS.some(w => content.includes(w))) return 'positive'
  if (NEGATIVE_WORDS.some(w => content.includes(w))) return 'negative'
  return 'neutral'
}

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform') || ''
  const minCount = Math.max(1, parseInt(searchParams.get('min_count') || '2', 10))
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '30', 10))

  const svc = createServiceClient()
  let q = svc
    .from('platform_reviews')
    .select('id, platform, content, rating, posted_at')
    .eq('user_id', auth.userId)
    .order('posted_at', { ascending: false })
    .limit(2000)
  if (platform) q = q.eq('platform', platform)
  const { data: reviews, error } = await q

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!reviews || reviews.length === 0) {
    return NextResponse.json({ ok: true, total_reviews: 0, keywords: [], message: '리뷰가 없어요' })
  }

  // 키워드 빈도 + 별점 합산
  type KStat = {
    keyword: string
    count: number
    rating_sum: number
    rating_count: number
    positive: number
    negative: number
    neutral: number
    sample_review_id: string | null
  }
  const map = new Map<string, KStat>()

  for (const r of reviews) {
    const tokens = tokenize(r.content || '')
    const sentiment = classifySentiment(r.rating, r.content || '')
    const seen = new Set<string>()
    for (const t of tokens) {
      if (seen.has(t)) continue  // 같은 리뷰 안 중복 카운트 X
      seen.add(t)
      const cur = map.get(t) || {
        keyword: t,
        count: 0,
        rating_sum: 0,
        rating_count: 0,
        positive: 0,
        negative: 0,
        neutral: 0,
        sample_review_id: null,
      }
      cur.count++
      if (typeof r.rating === 'number') {
        cur.rating_sum += r.rating
        cur.rating_count++
      }
      cur[sentiment]++
      if (!cur.sample_review_id) cur.sample_review_id = r.id
      map.set(t, cur)
    }
  }

  // 카테고리 분류 + 마케팅 액션 추천
  type Category = 'signature' | 'marketing_pick' | 'blog_topic' | 'improvement' | 'neutral'
  function classifyKeyword(k: KStat): { category: Category; recommendation: string; suggested_use: string[] } {
    const ratio = k.count > 0 ? (k.positive / k.count) * 100 : 0
    const avgRating = k.rating_count > 0 ? k.rating_sum / k.rating_count : 0

    // signature — 매장 시그니처 (자주 나오면서 긍정 압도적)
    if (k.count >= 10 && ratio >= 80) {
      return {
        category: 'signature',
        recommendation: `매장 시그니처 — ${k.count}건 중 ${Math.round(ratio)}% 긍정`,
        suggested_use: ['인스타 캡션 헤드라인', '블로그 제목', '네이버 플레이스 소개글', '메뉴판 특별 강조'],
      }
    }
    // marketing_pick — 마케팅에 활용할 강점
    if (k.count >= 5 && ratio >= 75) {
      return {
        category: 'marketing_pick',
        recommendation: `마케팅 활용 강점 — 긍정 ${Math.round(ratio)}%`,
        suggested_use: ['SNS 해시태그', '리뷰 답글 키워드', '광고 카피'],
      }
    }
    // improvement — 개선 필요
    if ((ratio <= 40 && k.count >= 3) || (avgRating > 0 && avgRating <= 2.8 && k.count >= 3)) {
      return {
        category: 'improvement',
        recommendation: `개선 필요 — 긍정 ${Math.round(ratio)}%${avgRating > 0 ? ' / 평균 ' + avgRating.toFixed(1) + '점' : ''}`,
        suggested_use: ['현장 점검 우선순위', '직원 교육 포인트', '서비스 개선 회의 안건'],
      }
    }
    // blog_topic — 블루오션 (긍정 high, 빈도 적음 → 더 부각할 가치)
    if (k.keyword.length >= 3 && k.count >= 3 && k.count < 8 && ratio >= 60) {
      return {
        category: 'blog_topic',
        recommendation: `블로그 글 후보 — 차별화 가능 (긍정 ${Math.round(ratio)}%)`,
        suggested_use: ['블로그 글 주제', '롱테일 SEO 키워드', '리뷰 이벤트 주제'],
      }
    }
    return {
      category: 'neutral',
      recommendation: '관찰 키워드',
      suggested_use: [],
    }
  }

  // 마케팅 점수 (0~100): positive_ratio × log(count) 가중치
  function marketingScore(count: number, ratio: number): number {
    const freqBonus = Math.min(40, Math.log2(count + 1) * 8)  // 빈도 가산 (max 40)
    const ratioPart = ratio * 0.6  // 긍정 비율 (max 60)
    return Math.round(freqBonus + ratioPart)
  }

  // 매장 등록 메뉴 목록 (메뉴 카테고리 분류용)
  let menuNames: string[] = []
  try {
    const { data: storeRow } = await svc
      .from('stores')
      .select('id, slug')
      .eq('user_id', auth.userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (storeRow?.id) {
      const { data: items } = await svc
        .from('menu_items')
        .select('name_ko')
        .eq('store_id', storeRow.id)
        .eq('active', true)
      menuNames = (items || []).map((x: any) => String(x.name_ko || '').trim()).filter(Boolean)
    }
  } catch {}

  const enriched = Array.from(map.values())
    .filter(k => k.count >= minCount)
    .map(k => {
      const ratio = k.count > 0 ? Math.round((k.positive / k.count) * 100) : 0
      const cls = classifyKeyword(k)
      // 카테고리 — 매장 메뉴와 매칭되면 '메뉴', 아니면 dict 분류
      const isMenu = menuNames.some(m => k.keyword.includes(m) || m.includes(k.keyword))
      const featureCategory = isMenu ? '메뉴' : classifyCategory(k.keyword)
      return {
        keyword: k.keyword,
        count: k.count,
        avg_rating: k.rating_count > 0 ? Math.round((k.rating_sum / k.rating_count) * 10) / 10 : null,
        positive: k.positive,
        negative: k.negative,
        neutral: k.neutral,
        positive_ratio: ratio,
        marketing_score: marketingScore(k.count, ratio),
        category: cls.category,
        feature_category: featureCategory,
        recommendation: cls.recommendation,
        suggested_use: cls.suggested_use,
        sample_review_id: k.sample_review_id,
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  // 네이버 플레이스 스타일 분류: 메뉴 / 특징(11개 세부 카테고리)
  const FEATURE_ORDER = ['메뉴', '맛', '서비스', '청결도', '가격', '분위기', '위치', '음식량', '만족도', '목적', '예약', '기타']
  const by_feature_category: Record<string, typeof enriched> = {}
  for (const cat of FEATURE_ORDER) by_feature_category[cat] = []
  for (const k of enriched) {
    const cat = k.feature_category || '기타'
    if (by_feature_category[cat]) by_feature_category[cat].push(k)
    else by_feature_category['기타'].push(k)
  }

  // 카테고리별 상위 추천
  const byCategory = {
    signature: enriched.filter(k => k.category === 'signature').slice(0, 5),
    marketing_pick: enriched.filter(k => k.category === 'marketing_pick').slice(0, 5),
    blog_topic: enriched.filter(k => k.category === 'blog_topic').slice(0, 8),
    improvement: enriched.filter(k => k.category === 'improvement').slice(0, 5),
  }

  // 종합 마케팅 추천 (마케팅 점수 top 10)
  const top_marketing = [...enriched]
    .sort((a, b) => b.marketing_score - a.marketing_score)
    .slice(0, 10)

  return NextResponse.json({
    ok: true,
    total_reviews: reviews.length,
    platform: platform || 'all',
    keywords: enriched,
    by_category: byCategory,
    by_feature_category,
    feature_order: FEATURE_ORDER,
    top_marketing,
    summary: {
      avg_rating: reviews.filter(r => typeof r.rating === 'number').length > 0
        ? Math.round((reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.filter(r => typeof r.rating === 'number').length) * 10) / 10
        : null,
      total: reviews.length,
      with_keyword_analysis: enriched.length,
      signature_count: byCategory.signature.length,
      marketing_pick_count: byCategory.marketing_pick.length,
      blog_topic_count: byCategory.blog_topic.length,
      improvement_count: byCategory.improvement.length,
    },
  })
}
