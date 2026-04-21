'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

type Tone = 'info' | 'empathy' | 'warning' | 'action'
type Ratio = '1:1' | '4:5'

interface Slide {
  role: 'cover' | 'body' | 'cta'
  headline: string
  subcopy?: string
  highlight?: string
  bullets?: string[]
}

interface GenerateResponse {
  topic: string
  target: string
  tone: Tone
  slides: Slide[]
  hashtags: {
    instagram: string[]
    blog: string[]
    threads: string[]
  }
  design_critique: string[]
  accessibility: {
    contrast_ratio: string
    min_font_size: string
    passed: boolean
  }
  ux_copy_notes: string[]
}

const TONE_LABEL: Record<Tone, string> = {
  info: '정보형 (지식·팁 전달)',
  empathy: '공감형 (고민·불만 공감)',
  warning: '경고형 (실수·리스크 경고)',
  action: '실행형 (오늘 바로 하기)',
}

const RATIO_LABEL: Record<Ratio, string> = {
  '1:1': '1:1 정사각 (1080×1080) — 피드 기본',
  '4:5': '4:5 세로 (1080×1350) — 피드 점유율↑',
}

const BRAND_NAVY = '#1F2937'
const BRAND_YELLOW = '#FACC15'
const BRAND_INK = '#111827'

export default function CardNewsPage() {
  const [topic, setTopic] = useState('')
  const [target, setTarget] = useState('자영업자·소상공인')
  const [tone, setTone] = useState<Tone>('action')
  const [ratio, setRatio] = useState<Ratio>('1:1')
  const [slideCount, setSlideCount] = useState<8 | 10>(10)
  const [youtubeTitle, setYoutubeTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<GenerateResponse | null>(null)
  const [error, setError] = useState('')
  const slidesRef = useRef<(HTMLDivElement | null)[]>([])

  const runGenerate = async () => {
    if (!topic.trim()) {
      setError('주제를 입력해주세요.')
      return
    }
    setError('')
    setLoading(true)
    setData(null)
    try {
      const res = await fetch('/api/marketing/card-news/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          target: target.trim(),
          tone,
          ratio,
          slide_count: slideCount,
          platform: 'instagram', // 인스타 캐러셀 전용 고정
          format: 'carousel',
          youtube_title: youtubeTitle.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'API 오류')
      setData(json)
    } catch (e: any) {
      setError(e?.message || '생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const downloadPng = async (idx: number) => {
    const node = slidesRef.current[idx]
    if (!node) return
    // @ts-ignore — runtime import
    const mod = await import('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/+esm')
    const dataUrl = await mod.toPng(node, { pixelRatio: 2, backgroundColor: '#fff' })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `insta-carousel-${String(idx + 1).padStart(2, '0')}.png`
    a.click()
  }

  const downloadAll = async () => {
    if (!data) return
    for (let i = 0; i < data.slides.length; i++) {
      await downloadPng(i)
      await new Promise(r => setTimeout(r, 300))
    }
  }

  const copyCaption = () => {
    if (!data) return
    const cover = data.slides[0]
    const bodies = data.slides.filter(s => s.role === 'body').map(s => `• ${s.headline}`)
    const cta = data.slides.find(s => s.role === 'cta')
    const caption =
      `${cover?.headline || data.topic}\n\n` +
      `${bodies.join('\n')}\n\n` +
      `👉 ${cta?.headline || '저장 · 공유로 놓치지 마세요'}\n\n` +
      `${data.hashtags.instagram.map(h => '#' + h).join(' ')}`
    navigator.clipboard.writeText(caption)
    alert('인스타 캡션이 복사되었습니다.')
  }

  const slideSize = ratio === '1:1' ? { w: 540, h: 540 } : { w: 540, h: 675 }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-[#4E5968] mb-2">
              <Link href="/marketing" className="hover:underline">마케팅 관리</Link>
              <span>›</span>
              <span>인스타 캐러셀 카드뉴스</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#111827]">
              📸 인스타 캐러셀 카드뉴스
              <span className="ml-2 text-xs font-semibold text-[#6366F1] bg-[#EEF2FF] px-2 py-1 rounded-full align-middle">NEW</span>
              <span className="ml-2 text-xs font-semibold text-[#EC4899] bg-[#FCE7F3] px-2 py-1 rounded-full align-middle">Carousel</span>
            </h1>
            <p className="text-sm text-[#4E5968] mt-1">
              인스타그램 캐러셀 전용 · 최대 10장 슬라이드 · Claude Design(UX Copy · 접근성 · 비평) 자동 내장 · 스와이프 유도 + 진행도 도트 포함.
            </p>
          </div>
          <Link
            href="/marketing/place"
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-[#4E5968] hover:bg-gray-50"
          >
            ← 마케팅 홈
          </Link>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="주제 (핵심 메시지 1문장)" required>
              <input
                className="form-input"
                placeholder="예) 네이버 플레이스 예약 전환율 올리는 3가지 훅"
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            </Field>
            <Field label="타겟 (업종·상황)">
              <input
                className="form-input"
                placeholder="예) 카페 사장님 / 1인 미용실 원장님"
                value={target}
                onChange={e => setTarget(e.target.value)}
              />
            </Field>

            <Field label="톤">
              <select className="form-input" value={tone} onChange={e => setTone(e.target.value as Tone)}>
                {(Object.keys(TONE_LABEL) as Tone[]).map(k => (
                  <option key={k} value={k}>{TONE_LABEL[k]}</option>
                ))}
              </select>
            </Field>

            <Field label="비율">
              <select className="form-input" value={ratio} onChange={e => setRatio(e.target.value as Ratio)}>
                {(Object.keys(RATIO_LABEL) as Ratio[]).map(k => (
                  <option key={k} value={k}>{RATIO_LABEL[k]}</option>
                ))}
              </select>
            </Field>

            <Field label="슬라이드 수 (인스타 캐러셀 최대 10장)">
              <div className="flex gap-2">
                {[8, 10].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSlideCount(n as 8 | 10)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium ${
                      slideCount === n
                        ? 'bg-[#1F2937] text-white border-[#1F2937]'
                        : 'bg-white text-[#4E5968] border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {n}장
                  </button>
                ))}
              </div>
            </Field>

            <Field label="(선택) 유튜브 제목 연동 — 주제 일치화" hint="youtube-production-team 스킬로 만든 영상 제목 입력 시 CTA에 '영상으로 보기' 자동 삽입.">
              <input
                className="form-input"
                placeholder="예) 플레이스 예약 전환율 3배 올린 실전 3가지"
                value={youtubeTitle}
                onChange={e => setYoutubeTitle(e.target.value)}
              />
            </Field>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={runGenerate}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-[#EC4899] to-[#F97316] hover:opacity-90 disabled:opacity-50 rounded-xl font-bold text-white shadow-sm"
            >
              {loading ? '생성 중… (15~25초)' : '✨ 캐러셀 생성'}
            </button>
            {data && (
              <>
                <button
                  onClick={downloadAll}
                  className="px-5 py-3 bg-[#1F2937] hover:bg-black rounded-xl font-medium text-white"
                >
                  📥 10장 전체 PNG 다운로드
                </button>
                <button
                  onClick={copyCaption}
                  className="px-5 py-3 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl font-medium text-[#4E5968]"
                >
                  📋 인스타 캡션 복사
                </button>
              </>
            )}
          </div>

          <div className="mt-3 text-xs text-[#6B7280] flex flex-wrap gap-x-4 gap-y-1">
            <span>✓ 업로드 채널 고정: <b>인스타그램 캐러셀</b></span>
            <span>✓ 최대 10장 (인스타 정책 준수)</span>
            <span>✓ 슬라이드 하단 진행도 도트 자동</span>
            <span>✓ 첫 장 스와이프 힌트 내장</span>
          </div>
        </div>

        {/* Slides */}
        {data && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#111827]">
                캐러셀 미리보기 · {data.slides.length}장
              </h2>
              <div className="text-xs text-[#4E5968]">
                🎨 대비 {data.accessibility.contrast_ratio} / 최소폰트 {data.accessibility.min_font_size} / {data.accessibility.passed ? '✅ WCAG AA 통과' : '⚠ 재조정 권장'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {data.slides.map((s, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div
                    ref={el => { slidesRef.current[i] = el }}
                    style={{
                      width: slideSize.w,
                      height: slideSize.h,
                      maxWidth: '100%',
                      aspectRatio: ratio === '1:1' ? '1 / 1' : '4 / 5',
                    }}
                    className="relative"
                  >
                    <SlideCard
                      slide={s}
                      index={i}
                      total={data.slides.length}
                      topic={data.topic}
                      youtubeTitle={youtubeTitle}
                    />
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t">
                    <span className="text-xs font-medium text-[#4E5968]">
                      {i + 1}/{data.slides.length} · {s.role === 'cover' ? '표지' : s.role === 'cta' ? 'CTA' : '본문'}
                    </span>
                    <button
                      onClick={() => downloadPng(i)}
                      className="text-xs text-[#3182F6] hover:underline font-medium"
                    >
                      PNG 저장
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Design notes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <InfoCard title="✍️ UX Copy 가이드" items={data.ux_copy_notes} />
              <InfoCard title="🔍 Design Critique" items={data.design_critique} />
            </div>

            {/* Hashtags */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-bold text-[#111827] mb-3">인스타그램 해시태그 (15개)</h3>
              <div className="space-y-3 text-sm">
                <HashtagRow label="인스타그램 메인" tags={data.hashtags.instagram} />
                <HashtagRow label="블로그 크로스포스팅용" tags={data.hashtags.blog} />
                <HashtagRow label="스레드 크로스포스팅용" tags={data.hashtags.threads} />
              </div>
            </div>
          </>
        )}

        {!data && !loading && (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center text-[#4E5968]">
            <div className="text-4xl mb-3">📸</div>
            <div className="font-medium mb-1">주제를 입력하고 캐러셀 생성 버튼을 누르세요</div>
            <div className="text-xs">Claude가 인스타 캐러셀 10장 + 캡션 + 해시태그 + 디자인 비평까지 한 번에 뽑아줍니다.</div>
          </div>
        )}
      </div>

      <style jsx>{`
        .form-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          color: #111827;
          background: #fff;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .form-input:focus {
          border-color: #3182F6;
          box-shadow: 0 0 0 3px rgba(49, 130, 246, 0.12);
        }
      `}</style>
    </div>
  )
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
  hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#111827] mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-[#6B7280]">{hint}</p>}
    </div>
  )
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <h3 className="font-bold text-[#111827] mb-2">{title}</h3>
      <ul className="space-y-1.5 text-sm text-[#4E5968]">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-[#EC4899] mt-0.5">▸</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function HashtagRow({ label, tags }: { label: string; tags: string[] }) {
  const copy = () => {
    navigator.clipboard.writeText(tags.map(t => '#' + t).join(' '))
    alert(`${label} 복사됨`)
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-[#4E5968]">{label}</span>
        <button onClick={copy} className="text-xs text-[#3182F6] hover:underline">복사</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded-md text-[#4E5968]">#{t}</span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Carousel Slide (Instagram 전용)
//   · 표지:  네이비 배경 + 옐로우 포인트 + "→ 스와이프" 힌트
//   · 본문:  흰 배경 + 좌상단 하이라이트 + 하단 진행도 도트 (N/M)
//   · CTA:   옐로우 배경 + 저장·공유·팔로우 유도 + 유튜브 링크(선택)
// ─────────────────────────────────────────────
function SlideCard({
  slide,
  index,
  total,
  topic,
  youtubeTitle,
}: {
  slide: Slide
  index: number
  total: number
  topic: string
  youtubeTitle: string
}) {
  const isCover = slide.role === 'cover'
  const isCta = slide.role === 'cta'
  const bg = isCover ? BRAND_NAVY : isCta ? BRAND_YELLOW : '#ffffff'
  const fg = isCover ? '#ffffff' : isCta ? BRAND_INK : BRAND_INK
  const sub = isCover ? 'rgba(255,255,255,0.75)' : 'rgba(17,24,39,0.6)'

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: bg,
        color: fg,
        padding: '48px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: "'Pretendard', 'Noto Sans KR', -apple-system, sans-serif",
        position: 'relative',
      }}
    >
      {/* Top: brand label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 600, color: sub }}>
        <span>{isCover ? '@harang.marketing' : isCta ? '저장 · 공유 · 팔로우' : `${index}/${total - 1}`}</span>
        {!isCover && !isCta && <span style={{ color: sub }}>{topic.slice(0, 20)}</span>}
      </div>

      {/* Middle: content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {isCover && (
          <>
            <div style={{ fontSize: 18, fontWeight: 600, color: BRAND_YELLOW, marginBottom: 12 }}>
              자영업자 실전 마케팅
            </div>
            <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.2, wordBreak: 'keep-all' }}>
              {slide.headline}
            </div>
            {slide.subcopy && (
              <div style={{ fontSize: 18, fontWeight: 500, color: sub, marginTop: 16, lineHeight: 1.5 }}>
                {slide.subcopy}
              </div>
            )}
          </>
        )}

        {!isCover && !isCta && (
          <>
            {slide.highlight && (
              <div
                style={{
                  display: 'inline-block',
                  background: BRAND_YELLOW,
                  color: BRAND_INK,
                  fontSize: 14,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 6,
                  marginBottom: 20,
                  alignSelf: 'flex-start',
                }}
              >
                {slide.highlight}
              </div>
            )}
            <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.25, wordBreak: 'keep-all', marginBottom: 18 }}>
              {slide.headline}
            </div>
            {slide.subcopy && (
              <div style={{ fontSize: 17, color: sub, lineHeight: 1.6, wordBreak: 'keep-all' }}>
                {slide.subcopy}
              </div>
            )}
            {slide.bullets && slide.bullets.length > 0 && (
              <ul style={{ marginTop: 16, listStyle: 'none', padding: 0 }}>
                {slide.bullets.map((b, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, fontSize: 16, color: fg, marginBottom: 8, lineHeight: 1.5 }}>
                    <span style={{ color: '#EC4899', fontWeight: 900 }}>✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {isCta && (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: BRAND_INK, marginBottom: 14, opacity: 0.7 }}>
              끝까지 봤다면
            </div>
            <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.2, wordBreak: 'keep-all', marginBottom: 16 }}>
              {slide.headline}
            </div>
            {slide.subcopy && (
              <div style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.5, wordBreak: 'keep-all' }}>
                {slide.subcopy}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              <Pill>🔖 저장</Pill>
              <Pill>📤 공유</Pill>
              <Pill>➕ 팔로우</Pill>
            </div>
            {youtubeTitle && (
              <div
                style={{
                  marginTop: 16,
                  padding: '10px 14px',
                  background: BRAND_INK,
                  color: '#fff',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  display: 'inline-block',
                  alignSelf: 'flex-start',
                }}
              >
                ▶ 유튜브: {youtubeTitle}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom: swipe hint (cover) / progress dots (body) / brand (cta) */}
      <div style={{ marginTop: 24 }}>
        {isCover && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: sub }}>
              localution.co.kr
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 700,
                color: BRAND_YELLOW,
                animation: 'pulse 1.8s ease-in-out infinite',
              }}
            >
              <span>→ 스와이프</span>
            </div>
          </div>
        )}

        {!isCover && !isCta && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <ProgressDots current={index} total={total} />
            <span style={{ fontSize: 12, fontWeight: 600, color: sub }}>@harang.marketing</span>
          </div>
        )}

        {isCta && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 600, color: sub }}>
            <span>@harang.marketing</span>
            <span>localution.co.kr</span>
          </div>
        )}
      </div>
    </div>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(17,24,39,0.12)',
        color: BRAND_INK,
        fontSize: 15,
        fontWeight: 700,
        padding: '8px 14px',
        borderRadius: 999,
      }}
    >
      {children}
    </span>
  )
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  // current = index (0-based). 표지는 0이라 진행도 dots은 body 에서만 호출됨.
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            width: i === current ? 22 : 8,
            height: 8,
            borderRadius: 999,
            background: i === current ? BRAND_INK : 'rgba(17,24,39,0.2)',
            transition: 'all 0.2s',
          }}
        />
      ))}
    </div>
  )
}
