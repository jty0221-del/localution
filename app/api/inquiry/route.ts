import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Vercel 서버리스 특성상 메모리 캐시는 재시작 시 초기화됨
// 실 운영에서는 Supabase/Notion 영속 저장 권장 (15차-17에서는 localStorage + 메모리 폴백)
// 본인 조회(?mine=true&ids=...)는 id 명시 시 인증 없이 허용 (본인이 가진 id만 조회)

interface Inquiry {
  id: string
  name: string
  contact: string
  category: string
  message: string
  status: 'new' | 'replied' | 'completed'
  createdAt: string
  reply?: string
  repliedAt?: string
  completedAt?: string
}

// 인메모리 스토리지 (Vercel 환경에서는 재배포 시 초기화)
const store: Inquiry[] = []

function sanitize(inq: Inquiry) {
  // 본인 조회 시 개인정보 최소화 (name/contact 는 본인이 이미 알고 있으니 그대로)
  return {
    id:          inq.id,
    name:        inq.name,
    contact:     inq.contact,
    category:    inq.category,
    message:     inq.message,
    status:      inq.status,
    createdAt:   inq.createdAt,
    reply:       inq.reply ?? null,
    repliedAt:   inq.repliedAt ?? null,
    completedAt: inq.completedAt ?? null,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, contact, category, message } = body

    if (!name?.trim() || !message?.trim()) {
      return NextResponse.json({ error: '이름과 문의 내용은 필수입니다.' }, { status: 400 })
    }

    const inquiry: Inquiry = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      name: name.trim(),
      contact: contact?.trim() || '',
      category: category || '일반문의',
      message: message.trim(),
      status: 'new',
      createdAt: new Date().toISOString(),
    }

    store.push(inquiry)

    // 환경변수로 Notion 연동 지원 (선택)
    const notionKey = process.env.NOTION_API_KEY
    const notionDb  = process.env.NOTION_INQUIRY_DB
    if (notionKey && notionDb) {
      try {
        await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${notionKey}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
          },
          body: JSON.stringify({
            parent: { database_id: notionDb },
            properties: {
              '이름':     { title: [{ text: { content: inquiry.name } }] },
              '연락처':   { rich_text: [{ text: { content: inquiry.contact } }] },
              '분류':     { select: { name: inquiry.category } },
              '상태':     { select: { name: '신규' } },
              '접수일':   { date: { start: inquiry.createdAt } },
            },
            children: [{
              object: 'block', type: 'paragraph',
              paragraph: { rich_text: [{ text: { content: inquiry.message } }] },
            }],
          }),
        })
      } catch (e) {
        console.error('Notion 저장 실패:', e)
      }
    }

    return NextResponse.json({ success: true, id: inquiry.id })
  } catch (err) {
    console.error('inquiry POST error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// GET: 관리자 조회(전체) OR 본인 조회(?mine=true&ids=id1,id2,...)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mine = searchParams.get('mine') === 'true'
  const idsParam = searchParams.get('ids') || ''

  // 본인 조회 모드: 인증 없이 허용하되 id 목록 명시 필수 (본인이 아는 id만 매칭)
  if (mine) {
    const idSet = new Set(idsParam.split(',').map(s => s.trim()).filter(Boolean))
    if (idSet.size === 0) return NextResponse.json({ inquiries: [] })
    const found = store.filter(i => idSet.has(i.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return NextResponse.json({ inquiries: found.map(sanitize) })
  }

  // 관리자 조회 모드 — 듀얼모드 인증 (NextAuth OAuth 쿠키 OR Supabase 세션)
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ error: admin.message }, { status: admin.status })
  }
  const all = store.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(sanitize)
  const summary = {
    total:     store.length,
    new:       store.filter(i => i.status === 'new').length,
    replied:   store.filter(i => i.status === 'replied').length,
    completed: store.filter(i => i.status === 'completed').length,
  }
  return NextResponse.json({ inquiries: all, summary })
}

// PATCH: 관리자 답변 작성 / 완료 처리
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ error: admin.message }, { status: admin.status })
  }
  const { id, reply, status, markCompleted } = await req.json() as {
    id: string; reply?: string; status?: Inquiry['status']; markCompleted?: boolean
  }
  const item = store.find(i => i.id === id)
  if (!item) return NextResponse.json({ error: '문의를 찾을 수 없습니다' }, { status: 404 })

  if (typeof reply === 'string' && reply.trim().length > 0) {
    item.reply = reply.trim()
    item.repliedAt = new Date().toISOString()
    // 답변이 달리면 기본적으로 'replied' 로 전이 (completed 는 유지)
    if (item.status !== 'completed') item.status = 'replied'
  }
  if (markCompleted === true) {
    item.status = 'completed'
    item.completedAt = new Date().toISOString()
  } else if (status && ['new', 'replied', 'completed'].includes(status)) {
    item.status = status
    if (status === 'completed' && !item.completedAt) item.completedAt = new Date().toISOString()
  }
  return NextResponse.json({ success: true, inquiry: sanitize(item) })
}
