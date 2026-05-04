// app/api/threads/upload/route.ts
// Threads 미디어 이미지 업로드 → Supabase Storage
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'threads-media'

export async function POST(request: Request) {
  const svc = createServiceClient()

  // 버킷 없으면 자동 생성 (public)
  await svc.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'file 필드 없음' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: '지원 형식: jpg, png, gif, webp' }, { status: 400 })
  }

  const maxBytes = 8 * 1024 * 1024 // 8MB
  if (file.size > maxBytes) {
    return NextResponse.json({ error: '파일 크기 8MB 이하만 허용됩니다.' }, { status: 400 })
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadErr } = await svc.storage
    .from(BUCKET)
    .upload(fileName, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: { publicUrl } } = svc.storage.from(BUCKET).getPublicUrl(fileName)

  return NextResponse.json({ ok: true, url: publicUrl })
}
