'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import {
  Sparkles, Copy, Check, Image as ImageIcon, X, Plus,
  User, Phone, Tag, FileText, MessageCircle, Link as LinkIcon,
  Loader2, AlertCircle, ArrowRight, RefreshCw, Download,
} from 'lucide-react'
import Footer from '../../components/Footer'

type Persona = { name: string; title: string; phone: string }
type CTA = { phone: string; kakao: string; reservation: string }

// localStorage 키
const LS_KEY = 'localution.naver_blog_post_inputs'

// 프리셋: 업종별 템플릿 예시
const INDUSTRY_PRESETS = [
  { id: 'dealer', label: '자동차 딜러', keywords: ['벤츠 딜러', '신차 견적', 'BMW 시승'] },
  { id: 'dental', label: '치과',       keywords: ['임플란트', '교정 상담', '라미네이트'] },
  { id: 'nail',   label: '네일샵',     keywords: ['젤네일', '패디큐어', '네일아트'] },
  { id: 'cafe',   label: '카페/맛집',   keywords: ['브런치 카페', '디저트 맛집', '데이트 장소'] },
  { id: 'hair',   label: '미용실',     keywords: ['펌 추천', '남자컷', '염색 가격'] },
  { id: 'pet',    label: '동물병원',   keywords: ['강아지 건강검진', '고양이 예방접종', '반려동물 치료'] },
] as const

export default function BlogPostGeneratorPage() {
  // 입력 상태
  const [industry, setIndustry] = useState('')
  const [personaName, setPersonaName] = useState('')
  const [personaTitle, setPersonaTitle] = useState('')
  const [personaPhone, setPersonaPhone] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [ctaPhone, setCtaPhone] = useState('')
  const [ctaKakao, setCtaKakao] = useState('')
  const [ctaReservation, setCtaReservation] = useState('')
  const [length, setLength] = useState<1500 | 2000 | 2500 | 3000>(2500)
  const [photoNames, setPhotoNames] = useState<string[]>([])

  // 결과 상태
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [post, setPost] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fileRef = useRef<HTMLInputElement | null>(null)
  const outputRef = useRef<HTMLDivElement | null>(null)

  // localStorage에서 매장 정보 + 이전 입력 불러오기
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('localution.store_info')
      if (raw) {
        const info = JSON.parse(raw)
        if (info?.category && !industry) setIndustry(info.category)
        if (info?.name && !personaTitle) setPersonaTitle(info.name + ' 담당')
      }
    } catch (_) {}
    try {
      const saved = window.localStorage.getItem(LS_KEY)
      if (saved) {
        const s = JSON.parse(saved)
        if (s.industry && !industry) setIndustry(s.industry)
        if (s.personaName) setPersonaName(s.personaName)
        if (s.personaTitle && !personaTitle) setPersonaTitle(s.personaTitle)
        if (s.personaPhone) setPersonaPhone(s.personaPhone)
        if (Array.isArray(s.keywords) && s.keywords.length) setKeywords(s.keywords)
        if (s.ctaPhone) setCtaPhone(s.ctaPhone)
        if (s.ctaKakao) setCtaKakao(s.ctaKakao)
        if (s.ctaReservation) setCtaReservation(s.ctaReservation)
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 입력 변경시 localStorage 저장
  useEffect(() => {
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify({
        industry, personaName, personaTitle, personaPhone,
        keywords, ctaPhone, ctaKakao, ctaReservation,
      }))
    } catch (_) {}
  }, [industry, personaName, personaTitle, personaPhone, keywords, ctaPhone, ctaKakao, ctaReservation])

  const addKeyword = (k?: string) => {
    const target = (k ?? keywordInput).trim()
    if (!target) return
    if (keywords.includes(target)) { setKeywordInput(''); return }
    setKeywords(prev => [...prev, target])
    setKeywordInput('')
  }
  const removeKeyword = (k: string) => setKeywords(prev => prev.filter(x => x !== k))

  const applyPreset = (p: typeof INDUSTRY_PRESETS[number]) => {
    setIndustry(p.label)
    const merged = Array.from(new Set([...keywords, ...p.keywords]))
    setKeywords(merged.slice(0, 5))
  }

  const handleFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const names = Array.from(files).map(f => f.name)
    setPhotoNames(prev => Array.from(new Set([...prev, ...names])))
    if (fileRef.current) fileRef.current.value = ''
  }
  const removePhoto = (name: string) => setPhotoNames(prev => prev.filter(n => n !== name))

  const handleGenerate = async () => {
    if (!industry.trim() && !keywords.length) {
      setError('업종 또는 타겟 키워드 중 하나는 필수입니다')
      return
    }
    setError(null)
    setLoading(true)
    setPost(null)
    setCopied(false)
    try {
      const res = await fetch('/api/naver-blog-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: industry.trim(),
          persona: { name: personaName.trim(), title: personaTitle.trim(), phone: personaPhone.trim() },
          keywords: keywords.filter(Boolean),
          draft: draft.trim(),
          cta: { phone: ctaPhone.trim(), kakao: ctaKakao.trim(), reservation: ctaReservation.trim() },
          length,
          photoNames,
        }),
      })
      const j = await res.json()
      if (!j.ok) { setError(j.error || '생성 실패'); return }
      setPost(j.post)
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    } catch (e: any) {
      setError('네트워크 오류: ' + (e?.message || ''))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!post) return
    try {
      await navigator.clipboard.writeText(post)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = post
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    if (!post) return
    const blob = new Blob([post], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const datePart = new Date().toISOString().slice(0, 10)
    const kwPart = (keywords[0] || industry || 'post').replace(/[^\w가-힣]/g, '_').slice(0, 20)
    a.download = `naver_blog_${kwPart}_${datePart}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const charCount = post ? post.replace(/\s/g, '').length : 0

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] pt-16 md:pt-0 min-w-0">
        <PageHeader
          icon="✍️"
          title="블로그 글 작성"
          subtitle="키워드와 사진만 넣으면 AI가 네이버 SEO 최적화 블로그 원고를 완성해드립니다"
          variant="emerald"
        />
        <div className="max-w-5xl mx-auto pt-6 pb-20 px-4 md:px-8">
          {/* 헤더 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs text-[#8B95A1] mb-2">
              <span>마케팅 관리</span>
              <ArrowRight size={12} />
              <span className="text-[#3182F6] font-medium">블로그 포스팅 생성</span>
            </div>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#191F28] flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#03C75A] to-[#00A645] text-white">
                    <FileText size={18} />
                  </span>
                  네이버 블로그 포스팅 생성
                </h1>
                <p className="text-sm text-[#4E5968] mt-1.5">
                  업종·키워드·페르소나를 입력하면 <b>네이버 SEO 최적화 포스팅</b>이 마크다운으로 자동 생성됩니다
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ECFDF5] border border-[#D1FAE5]">
                <Sparkles size={14} className="text-[#059669]" />
                <span className="text-xs font-semibold text-[#059669]">AI 생성 · 하랑마케팅 프리셋</span>
              </div>
            </div>
          </div>

          {/* 입력 영역 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 업종 + 프리셋 */}
            <section className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={16} className="text-[#3182F6]" />
                <h3 className="font-bold text-[#191F28]">업종 / 주제</h3>
              </div>
              <input
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                placeholder="예: 벤츠 공식딜러, 강남 치과, 분당 네일샵"
                className="w-full h-11 px-3 rounded-lg border border-[#E5E8EB] bg-[#F8F9FB] focus:bg-white focus:border-[#3182F6] outline-none text-sm"
              />
              <div className="mt-3">
                <p className="text-xs text-[#8B95A1] mb-2">빠른 프리셋</p>
                <div className="flex flex-wrap gap-1.5">
                  {INDUSTRY_PRESETS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p)}
                      className="px-2.5 py-1 text-xs rounded-full bg-[#F2F4F6] hover:bg-[#E5E8EB] text-[#4E5968] border border-[#E5E8EB]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* 페르소나 */}
            <section className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
              <div className="flex items-center gap-2 mb-3">
                <User size={16} className="text-[#8B5CF6]" />
                <h3 className="font-bold text-[#191F28]">페르소나 (작성자)</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={personaName}
                  onChange={e => setPersonaName(e.target.value)}
                  placeholder="이름 (예: 신형섭)"
                  className="h-10 px-3 rounded-lg border border-[#E5E8EB] bg-[#F8F9FB] focus:bg-white focus:border-[#3182F6] outline-none text-sm"
                />
                <input
                  value={personaTitle}
                  onChange={e => setPersonaTitle(e.target.value)}
                  placeholder="직함 (예: 부장)"
                  className="h-10 px-3 rounded-lg border border-[#E5E8EB] bg-[#F8F9FB] focus:bg-white focus:border-[#3182F6] outline-none text-sm"
                />
              </div>
              <input
                value={personaPhone}
                onChange={e => setPersonaPhone(e.target.value)}
                placeholder="연락처 (예: 010-7771-1112)"
                className="w-full h-10 px-3 mt-2 rounded-lg border border-[#E5E8EB] bg-[#F8F9FB] focus:bg-white focus:border-[#3182F6] outline-none text-sm"
              />
            </section>

            {/* 타겟 키워드 */}
            <section className="bg-white rounded-2xl border border-[#E5E8EB] p-5 lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-[#F59E0B]" />
                <h3 className="font-bold text-[#191F28]">타겟 키워드</h3>
                <span className="text-xs text-[#8B95A1] ml-1">(첫번째가 메인 키워드)</span>
              </div>
              <div className="flex gap-2">
                <input
                  value={keywordInput}
                  onChange={e => setKeywordInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); addKeyword() }
                  }}
                  placeholder="키워드 입력 후 엔터 (예: 벤츠 E클래스 견적)"
                  className="flex-1 h-11 px-3 rounded-lg border border-[#E5E8EB] bg-[#F8F9FB] focus:bg-white focus:border-[#3182F6] outline-none text-sm"
                />
                <button
                  onClick={() => addKeyword()}
                  className="h-11 px-4 rounded-lg bg-[#191F28] text-white text-sm font-semibold hover:bg-[#0B0E13] inline-flex items-center gap-1"
                >
                  <Plus size={14} /> 추가
                </button>
              </div>
              {keywords.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {keywords.map((k, i) => (
                    <span
                      key={k}
                      className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-semibold ${i === 0 ? 'bg-[#EFF6FF] text-[#3182F6] border border-[#BFDBFE]' : 'bg-[#F2F4F6] text-[#4E5968] border border-[#E5E8EB]'}`}
                    >
                      {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3182F6] text-white">메인</span>}
                      {k}
                      <button onClick={() => removeKeyword(k)} className="w-5 h-5 rounded-full hover:bg-white flex items-center justify-center">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* 초안/메모 */}
            <section className="bg-white rounded-2xl border border-[#E5E8EB] p-5 lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={16} className="text-[#059669]" />
                <h3 className="font-bold text-[#191F28]">초안 / 메모</h3>
                <span className="text-xs text-[#8B95A1] ml-1">(선택 - 강조 포인트, 업체 USP, 후기 등)</span>
              </div>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder={`예시) 20년 경력 공식딜러, 월 평균 30대 인도, 시승 무료, 구매 후 7년 무상수리\n고객 후기: "다른 지점보다 견적이 100만원 쌌어요" (김OO 고객)`}
                rows={5}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5E8EB] bg-[#F8F9FB] focus:bg-white focus:border-[#3182F6] outline-none text-sm resize-none"
              />
            </section>

            {/* CTA */}
            <section className="bg-white rounded-2xl border border-[#E5E8EB] p-5 lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle size={16} className="text-[#EA580C]" />
                <h3 className="font-bold text-[#191F28]">CTA (행동 유도) 정보</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A1]" />
                  <input
                    value={ctaPhone}
                    onChange={e => setCtaPhone(e.target.value)}
                    placeholder="전화번호"
                    className="w-full h-10 pl-8 pr-3 rounded-lg border border-[#E5E8EB] bg-[#F8F9FB] focus:bg-white focus:border-[#3182F6] outline-none text-sm"
                  />
                </div>
                <div className="relative">
                  <MessageCircle size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A1]" />
                  <input
                    value={ctaKakao}
                    onChange={e => setCtaKakao(e.target.value)}
                    placeholder="카카오톡 채널 (@채널명)"
                    className="w-full h-10 pl-8 pr-3 rounded-lg border border-[#E5E8EB] bg-[#F8F9FB] focus:bg-white focus:border-[#3182F6] outline-none text-sm"
                  />
                </div>
                <div className="relative">
                  <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A1]" />
                  <input
                    value={ctaReservation}
                    onChange={e => setCtaReservation(e.target.value)}
                    placeholder="예약/상담 링크"
                    className="w-full h-10 pl-8 pr-3 rounded-lg border border-[#E5E8EB] bg-[#F8F9FB] focus:bg-white focus:border-[#3182F6] outline-none text-sm"
                  />
                </div>
              </div>
            </section>

            {/* 사진 + 글자수 */}
            <section className="bg-white rounded-2xl border border-[#E5E8EB] p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <ImageIcon size={16} className="text-[#3182F6]" />
                  <h3 className="font-bold text-[#191F28]">사진 파일명</h3>
                  <span className="text-xs text-[#8B95A1]">(본문에 자동 분산 배치)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#4E5968]">글자 수 목표</span>
                  <select
                    value={length}
                    onChange={e => setLength(Number(e.target.value) as typeof length)}
                    className="h-8 px-2 rounded-lg border border-[#E5E8EB] bg-white text-xs font-semibold text-[#191F28]"
                  >
                    <option value={1500}>1,500자</option>
                    <option value={2000}>2,000자</option>
                    <option value={2500}>2,500자 (권장)</option>
                    <option value={3000}>3,000자</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-dashed border-[#3182F6] text-[#3182F6] text-xs font-semibold bg-[#F0F7FF] hover:bg-[#E5F0FF]"
                >
                  <Plus size={14} /> 사진 추가 (파일명만)
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFilesPicked}
                  className="hidden"
                />
                {photoNames.map((n, i) => (
                  <span key={n + i} className="inline-flex items-center gap-1.5 h-9 pl-3 pr-1.5 rounded-lg bg-[#F2F4F6] border border-[#E5E8EB] text-xs text-[#4E5968]">
                    <ImageIcon size={12} />
                    <span className="max-w-[180px] truncate">{n}</span>
                    <button onClick={() => removePhoto(n)} className="w-5 h-5 rounded hover:bg-white flex items-center justify-center">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              {photoNames.length === 0 && (
                <p className="text-xs text-[#8B95A1] mt-2">
                  * 실제 파일 업로드는 아직 연동되지 않음 — 파일명만 수집되어 본문에 분산 배치 지시로 사용됩니다
                </p>
              )}
            </section>
          </div>

          {/* 생성 버튼 */}
          <div className="mt-6 flex items-center justify-end gap-3 flex-wrap">
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-[#F04452] bg-[#FEF2F3] px-3 py-2 rounded-lg border border-[#FECDD3]">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-gradient-to-r from-[#3182F6] to-[#1B64DA] text-white text-sm font-bold shadow-[0_6px_20px_-6px_#3182F6] hover:shadow-[0_10px_28px_-6px_#3182F6] transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  생성 중… (15~30초 소요)
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  블로그 포스팅 생성하기
                </>
              )}
            </button>
          </div>

          {/* 결과 출력 */}
          {post && (
            <div ref={outputRef} className="mt-8 bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E8EB] bg-[#F8F9FB] flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#03C75A] flex items-center justify-center text-white">
                    <FileText size={14} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#191F28]">생성된 포스팅</div>
                    <div className="text-xs text-[#8B95A1]">공백 제외 {charCount.toLocaleString()}자 · 마크다운</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerate}
                    className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-white border border-[#E5E8EB] text-xs font-semibold text-[#4E5968] hover:bg-[#F2F4F6]"
                  >
                    <RefreshCw size={12} /> 재생성
                  </button>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-white border border-[#E5E8EB] text-xs font-semibold text-[#4E5968] hover:bg-[#F2F4F6]"
                  >
                    <Download size={12} /> .md 다운로드
                  </button>
                  <button
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-bold ${copied ? 'bg-[#059669] text-white' : 'bg-[#191F28] text-white hover:bg-[#0B0E13]'}`}
                  >
                    {copied ? <><Check size={12} /> 복사 완료</> : <><Copy size={12} /> 전체 복사</>}
                  </button>
                </div>
              </div>
              <pre className="px-5 py-5 text-sm text-[#191F28] whitespace-pre-wrap font-sans leading-relaxed">{post}</pre>
              <div className="px-5 py-3 bg-[#F8F9FB] border-t border-[#E5E8EB] text-xs text-[#4E5968] flex items-start gap-2">
                <AlertCircle size={14} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
                <span>
                  <b className="text-[#191F28]">사용법:</b> 전체 복사 → 네이버 블로그 에디터에서 붙여넣기 → <b>[사진 파일명 자리]</b>에 실제 사진을 드래그 업로드 → 볼드 처리가 해제된 곳은 에디터 내 단축키(Ctrl+B)로 재지정
                </span>
              </div>
            </div>
          )}

          {/* 가이드 */}
          {!post && !loading && (
            <div className="mt-8 bg-white rounded-2xl border border-[#E5E8EB] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-[#3182F6]" />
                <h3 className="font-bold text-[#191F28]">이 도구가 만드는 글의 특징</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {[
                  { title: '네이버 SEO 최적화', desc: '메인 키워드 자연 반복 + 롱테일 해시태그 20~30개' },
                  { title: '체류시간 후킹', desc: '섹션마다 볼드 2~3개로 스크롤 속도 조절' },
                  { title: '사진 분산 배치', desc: '한 곳 몰아넣기 금지 — 본문 전체에 고르게 배치' },
                  { title: 'CTA 구조화', desc: '부담 낮추는 멘트 → 예상 질문 3개 → 희소성 클로징' },
                  { title: '이모티콘 배제', desc: '📷, ✅, 🚗 등 일체 사용 안 함 — 브랜딩 톤 유지' },
                  { title: '페르소나 신뢰감', desc: '담당자 이름·직함·연락처로 1인칭 작성' },
                ].map(f => (
                  <div key={f.title} className="flex items-start gap-2 p-3 rounded-lg bg-[#F8F9FB] border border-[#E5E8EB]">
                    <Check size={14} className="text-[#059669] mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-[#191F28]">{f.title}</div>
                      <div className="text-xs text-[#4E5968] mt-0.5">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <Footer />
      </main>
    </div>
  )
}
