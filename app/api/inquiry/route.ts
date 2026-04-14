import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Vercel 서버리스 특성상 메모리 캐시는 재시작 시 초기화됨
// 실 운영에서는 Notion/Supabase 연동 권장
// 여기선 간단한 API 형태만 제공 (프론트에서 localStorage로 관리)

interface Inquiry {
  id: string
  name: string
  contact: string
  category: string
  message: string
  status: 'new' | 'read' | 'replied'
  createdAt: string
  reply?: string
  repliedAt?: string
}

// 인메모리 스토리지 (Vercel 환경에서는 재배포 시 초기화)
const store: Inquiry[] = []

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, contact, category, message } = body

    if (!name?.trim() || !message?.trim()) {
      return NextResponse.json({ error: '이름과 문의 내용은 필수입니다.' }, { status: 400 })
    }

    const inquiry: Inquiry = {
      id: Date.now().toString(),
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

// 관리자 조회 (ADMIN_SECRET 헤더 필요)
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }
  return NextResponse.json({ inquiries: store.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) })
}

// 관리자 답변
export async function PATCH(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }
  const { id, reply, status } = await req.json()
  const item = store.find(i => i.id === id)
  if (!item) return NextResponse.json({ error: '문의를 찾을 수 없습니다' }, { status: 404 })
  if (reply)  { item.reply = reply; item.repliedAt = new Date().toISOString(); item.status = 'replied' }
  if (status) item.status = status
  return NextResponse.json({ success: true })
}
