'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import { toast } from '../../lib/toast'

type Scene = {
  order: number
  start_sec: number
  duration: number
  visual_cue: string
  overlay_text: string
  text_position: 'top' | 'center' | 'bottom'
  text_size: 'sm' | 'md' | 'lg' | 'xl'
  transition: 'cut' | 'fade' | 'slide' | 'zoom'
  effect?: string
}

type VideoScript = {
  meta: {
    title: string
    platform: string
    duration_sec: number
    aspect_ratio: string
    mood: string
    language: string
  }
  brand: { store_name: string; category: string; keywords: string[]; usp: string }
  hooks: string[]
  scenes: Scene[]
  audio: { bgm_mood: string; bgm_tempo: string; bgm_keyword_hint: string; voiceover: string }
  cta: { text: string; position: string; duration: number }
  production_notes: string[]
  hashtags: string[]
}

const MOODS = [
  { id: 'upbeat', label: '경쾌', icon: '🎉', color: '#F59E0B' },
  { id: 'premium', label: '고급', icon: '💎', color: '#8B5CF6' },
  { id: 'warm', label: '따뜻', icon: '☕', color: '#EA580C' },
  { id: 'chic', label: '시크', icon: '🖤', color: '#191F28' },
] as const

const DURATIONS = [15, 30, 60] as const
const PLATFORMS = [
  { id: 'reels', label: '인스타 릴스', icon: '📸' },
  { id: 'shorts', label: '유튜브 쇼츠', icon: '▶️' },
  { id: 'tiktok', label: '틱톡', icon: '🎵' },
] as const

const TEXT_SIZE_MAP = { sm: '14px', md: '20px', lg: '30px', xl: '44px' } as const
const TEXT_POS_MAP = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const

export default function ReelsGeneratorPage() {
  const [storeName, setStoreName] = useState('')
  const [category, setCategory] = useState('')
  const [keywords, setKeywords] = useState('')
  const [usp, setUsp] = useState('')
  const [mood, setMood] = useState<typeof MOODS[number]['id']>('warm')
  const [duration, setDuration] = useState<typeof DURATIONS[number]>(30)
  const [platform, setPlatform] = useState<typeof PLATFORMS[number]['id']>('reels')
  const [cta, setCta] = useState('지금 방문하기')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [script, setScript] = useState<VideoScript | null>(null)

  // 시뮬레이션 플레이어
  const [playing, setPlaying] = useState(false)
  const [currentScene, setCurrentScene] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // localStorage에서 매장 정보 자동 로드
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('localution.store_info')
      if (raw) {
        const info = JSON.parse(raw)
        if (info?.name && !storeName) setStoreName(info.name)
        if (info?.category && !category) setCategory(info.category)
      }
      const kw = window.localStorage.getItem('localution.qr_settings')
      if (kw) {
        const k = JSON.parse(kw)
        const all = [k.mainKeyword, ...(k.subKeywords || [])].filter(Boolean)
        if (all.length && !keywords) setKeywords(all.join(', '))
      }
    } catch (_) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGenerate = async () => {
    if (!storeName.trim()) { setError('매장명을 입력해주세요'); return }
    setError(null)
    setLoading(true)
    setScript(null)
    try {
      const res = await fetch('/api/video-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: storeName.trim(),
          category: category.trim() || '매장',
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          usp: usp.trim(),
          mood, duration, platform, cta: cta.trim(),
        }),
      })
      const j = await res.json()
      if (!j.ok) { setError(j.error || '생성 실패'); return }
      setScript(j.script)
    } catch (e: any) {
      setError('네트워크 오류: ' + (e?.message || ''))
    } finally {
      setLoading(false)
    }
  }

  // 시뮬레이션 재생
  useEffect(() => {
    if (!playing || !script) return
    if (currentScene >= script.scenes.length) {
      setPlaying(false)
      setCurrentScene(0)
      setElapsed(0)
      return
    }
    const scene = script.scenes[currentScene]
    const sceneDur = (scene.duration || 3) * 1000
    timerRef.current = setTimeout(() => {
      setCurrentScene(prev => prev + 1)
      setElapsed(prev => prev + (scene.duration || 3))
    }, sceneDur)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, currentScene, script])

  const togglePlay = () => {
    if (!script) return
    if (playing) { setPlaying(false); return }
    setCurrentScene(0); setElapsed(0); setPlaying(true)
  }

  const downloadJson = () => {
    if (!script) return
    const blob = new Blob([JSON.stringify(script, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${script.meta.title.replace(/[^가-힣a-zA-Z0-9]/g, '_')}_${platform}_${duration}s.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyJson = async () => {
    if (!script) return
    await navigator.clipboard.writeText(JSON.stringify(script, null, 2))
    toast.success('JSON이 클립보드에 복사되었어요')
  }

  const activeScene: Scene | null = script && playing && currentScene < script.scenes.length
    ? script.scenes[currentScene]
    : null

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] pt-16 md:pt-0 min-w-0">
        <PageHeader
          icon="🎬"
          title="숏폼 / 릴스"
          subtitle="한 편의 롱폼에서 3개의 숏폼을 — 후킹·자막·썸네일까지 한 번에"
          variant="pink"
        />
        <div className="max-w-6xl mx-auto p-4 md:p-8">

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white text-xs font-bold px-3 py-1.5 rounded-full mb-3">
              ✨ 딸깍 한 번이면 끝 · 광고업계 JSON 기반
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#191F28]">릴스 · 쇼츠 자동 기획</h1>
            <p className="text-sm text-[#4E5968] mt-1">업체 정보를 입력하면 AI가 장면별 촬영 지시서까지 JSON으로 생성해드려요</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-5">

            {/* 좌측 — 입력 폼 */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E8EB] p-5">
              <h2 className="font-black text-[#191F28] text-sm mb-4">1단계 · 정보 입력</h2>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#4E5968] mb-1.5">매장명 *</label>
                  <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)}
                    placeholder="예: 하랑카페 강남점"
                    className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B5CF6]" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4E5968] mb-1.5">업종</label>
                  <input type="text" value={category} onChange={e => setCategory(e.target.value)}
                    placeholder="예: 카페, 미용실, 헬스장"
                    className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B5CF6]" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4E5968] mb-1.5">핵심 키워드 (쉼표 구분)</label>
                  <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)}
                    placeholder="예: 강남 카페, 디저트, 데이트 코스"
                    className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B5CF6]" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4E5968] mb-1.5">차별점 (USP)</label>
                  <textarea value={usp} onChange={e => setUsp(e.target.value)}
                    placeholder="예: 직접 로스팅한 원두, 3대째 이어온 비법 소스, 1:1 맞춤 케어"
                    rows={2}
                    className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B5CF6] resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4E5968] mb-1.5">분위기</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {MOODS.map(m => (
                      <button key={m.id} onClick={() => setMood(m.id)}
                        className={`rounded-xl py-2 text-xs font-bold transition-all border-2 ${
                          mood === m.id ? 'border-[#8B5CF6] bg-[#F5F3FF]' : 'border-transparent bg-[#F2F4F6] hover:bg-[#E5E8EB]'
                        }`}>
                        <div className="text-base">{m.icon}</div>
                        <div className="mt-0.5">{m.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#4E5968] mb-1.5">플랫폼</label>
                    <select value={platform} onChange={e => setPlatform(e.target.value as any)}
                      className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B5CF6] bg-white">
                      {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.icon} {p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4E5968] mb-1.5">길이</label>
                    <select value={duration} onChange={e => setDuration(Number(e.target.value) as any)}
                      className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B5CF6] bg-white">
                      {DURATIONS.map(d => <option key={d} value={d}>{d}초</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4E5968] mb-1.5">CTA 문구</label>
                  <input type="text" value={cta} onChange={e => setCta(e.target.value)}
                    className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B5CF6]" />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">
                    ⚠️ {error}
                  </div>
                )}

                <button onClick={handleGenerate} disabled={loading}
                  className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-black py-3.5 rounded-xl text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60">
                  {loading ? '생성 중… (10~20초)' : '✨ 딸깍 생성'}
                </button>
              </div>
            </div>

            {/* 우측 — 결과 */}
            <div className="lg:col-span-3 space-y-4">

              {/* 시뮬레이션 플레이어 */}
              <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-black text-[#191F28] text-sm">2단계 · 미리보기</h2>
                  {script && (
                    <div className="flex gap-2">
                      <button onClick={togglePlay}
                        className="bg-[#8B5CF6] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#7C3AED]">
                        {playing ? '⏸ 정지' : '▶ 재생'}
                      </button>
                      <button onClick={copyJson}
                        className="bg-[#F2F4F6] text-[#4E5968] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#E5E8EB]">
                        JSON 복사
                      </button>
                      <button onClick={downloadJson}
                        className="bg-[#F2F4F6] text-[#4E5968] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#E5E8EB]">
                        ⬇ 다운로드
                      </button>
                    </div>
                  )}
                </div>

                {/* 9:16 프레임 */}
                <div className="flex justify-center">
                  <div className="relative bg-black rounded-2xl overflow-hidden shadow-xl"
                    style={{ width: 270, height: 480, aspectRatio: '9/16' }}>
                    {!script && (
                      <div className="absolute inset-0 flex items-center justify-center text-white/60 text-xs text-center p-5">
                        좌측 정보를 입력하고 생성해주세요
                      </div>
                    )}
                    {script && !playing && (
                      <div className="absolute inset-0 bg-gradient-to-b from-[#1F1B4D] via-[#8B5CF6] to-[#EC4899] flex flex-col items-center justify-center text-white p-5 text-center">
                        <div className="text-xs opacity-70 mb-1">HOOK</div>
                        <div className="text-xl font-black leading-tight">{script.hooks[0]}</div>
                        <div className="mt-4 text-[10px] opacity-60">▶ 재생 버튼을 눌러 씬을 확인하세요</div>
                      </div>
                    )}
                    {activeScene && (
                      <div className="absolute inset-0 flex flex-col p-4 text-white"
                        style={{
                          background: `linear-gradient(135deg, ${
                            mood === 'upbeat' ? '#F59E0B, #EC4899' :
                            mood === 'premium' ? '#1F1B4D, #8B5CF6' :
                            mood === 'warm' ? '#EA580C, #FDE68A' :
                            '#191F28, #4E5968'
                          })`,
                          justifyContent: TEXT_POS_MAP[activeScene.text_position],
                        }}>
                        <div className="absolute top-3 left-3 text-[10px] bg-black/40 px-2 py-0.5 rounded-full">
                          {activeScene.order}/{script!.scenes.length} · {activeScene.duration}s
                        </div>
                        <div className="absolute top-3 right-3 text-[10px] bg-black/40 px-2 py-0.5 rounded-full">
                          {activeScene.transition}{activeScene.effect ? ' · ' + activeScene.effect : ''}
                        </div>
                        <div className="text-center font-black leading-tight drop-shadow-lg"
                          style={{ fontSize: TEXT_SIZE_MAP[activeScene.text_size] }}>
                          {activeScene.overlay_text}
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 text-[10px] opacity-80 bg-black/30 rounded-lg px-2 py-1 text-center">
                          📷 {activeScene.visual_cue}
                        </div>
                      </div>
                    )}
                    {/* 진행바 */}
                    {script && playing && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-black/30">
                        <div className="h-full bg-white transition-all"
                          style={{ width: `${((elapsed + (activeScene?.duration || 0)) / script.meta.duration_sec) * 100}%` }} />
                      </div>
                    )}
                  </div>
                </div>

                {script && (
                  <div className="mt-3 text-xs text-[#4E5968] text-center">
                    <strong className="text-[#191F28]">{script.meta.title}</strong> · {script.scenes.length}씬 · {script.meta.duration_sec}초
                  </div>
                )}
              </div>

              {/* 씬 리스트 */}
              {script && (
                <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
                  <h2 className="font-black text-[#191F28] text-sm mb-3">3단계 · 장면별 촬영 지시서</h2>
                  <div className="space-y-2">
                    {script.scenes.map(s => (
                      <div key={s.order} className="border border-[#F2F4F6] rounded-xl p-3 hover:bg-[#FAFBFF]">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-[#8B5CF6] text-white text-[10px] font-black px-2 py-0.5 rounded-full">#{s.order}</span>
                            <span className="text-[10px] text-[#8B95A1]">{s.start_sec}s~ · {s.duration}초</span>
                            <span className="text-[10px] text-[#4E5968] bg-[#F2F4F6] px-1.5 py-0.5 rounded">{s.transition}</span>
                            {s.effect && <span className="text-[10px] text-[#EC4899] bg-[#FCE7F3] px-1.5 py-0.5 rounded">{s.effect}</span>}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-[#191F28] mb-1">"{s.overlay_text}"</div>
                        <div className="text-xs text-[#4E5968]">📷 {s.visual_cue}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 훅 / BGM / CTA / 해시태그 */}
              {script && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
                    <h3 className="font-black text-[#191F28] text-xs mb-2">🎯 후킹 문구 3안</h3>
                    <ul className="space-y-1.5">
                      {script.hooks.map((h, i) => (
                        <li key={i} className="text-sm text-[#4E5968]"><strong className="text-[#8B5CF6]">{i+1}.</strong> {h}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
                    <h3 className="font-black text-[#191F28] text-xs mb-2">🎵 BGM 가이드</h3>
                    <div className="text-xs text-[#4E5968] space-y-0.5">
                      <div>분위기: <strong>{script.audio.bgm_mood}</strong></div>
                      <div>템포: <strong>{script.audio.bgm_tempo}</strong></div>
                      <div>검색어: <code className="bg-[#F2F4F6] px-1.5 py-0.5 rounded text-[11px]">{script.audio.bgm_keyword_hint}</code></div>
                      {script.audio.voiceover && <div className="mt-2 pt-2 border-t border-[#F2F4F6]">나레이션: <em>"{script.audio.voiceover}"</em></div>}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
                    <h3 className="font-black text-[#191F28] text-xs mb-2">📢 CTA</h3>
                    <div className="text-lg font-black text-[#8B5CF6]">"{script.cta.text}"</div>
                    <div className="text-[10px] text-[#8B95A1] mt-1">영상 마지막 {script.cta.duration}초</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
                    <h3 className="font-black text-[#191F28] text-xs mb-2"># 해시태그</h3>
                    <div className="flex flex-wrap gap-1">
                      {script.hashtags.map((h, i) => (
                        <span key={i} className="text-[11px] bg-[#F0F9FF] text-[#0369A1] px-2 py-0.5 rounded-full">#{h}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 제작 팁 */}
              {script && script.production_notes.length > 0 && (
                <div className="bg-gradient-to-br from-[#FEF9C3] to-[#FFEDD5] rounded-2xl p-5 border border-[#FCD34D]">
                  <h3 className="font-black text-[#92400E] text-xs mb-2">💡 촬영·편집 꿀팁</h3>
                  <ul className="space-y-1 text-xs text-[#78350F]">
                    {script.production_notes.map((n, i) => <li key={i}>• {n}</li>)}
                  </ul>
                </div>
              )}

              {/* 외부 툴 연결 */}
              {script && (
                <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
                  <h3 className="font-black text-[#191F28] text-xs mb-3">🎬 이 JSON으로 영상 만들기</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <a href="https://www.capcut.com/" target="_blank" rel="noreferrer"
                      className="bg-[#F2F4F6] hover:bg-[#E5E8EB] rounded-xl p-3 text-center transition-colors">
                      <div className="text-2xl mb-1">✂️</div>
                      <div className="text-xs font-bold text-[#191F28]">CapCut</div>
                      <div className="text-[10px] text-[#8B95A1]">무료 편집</div>
                    </a>
                    <a href="https://vrew.voyagerx.com/ko/" target="_blank" rel="noreferrer"
                      className="bg-[#F2F4F6] hover:bg-[#E5E8EB] rounded-xl p-3 text-center transition-colors">
                      <div className="text-2xl mb-1">🎙️</div>
                      <div className="text-xs font-bold text-[#191F28]">VREW</div>
                      <div className="text-[10px] text-[#8B95A1]">AI 자막·더빙</div>
                    </a>
                    <a href="https://www.canva.com/" target="_blank" rel="noreferrer"
                      className="bg-[#F2F4F6] hover:bg-[#E5E8EB] rounded-xl p-3 text-center transition-colors">
                      <div className="text-2xl mb-1">🎨</div>
                      <div className="text-xs font-bold text-[#191F28]">Canva</div>
                      <div className="text-[10px] text-[#8B95A1]">템플릿 편집</div>
                    </a>
                  </div>
                  <p className="text-[11px] text-[#8B95A1] mt-3 leading-relaxed">
                    👉 JSON을 다운받은 후 <strong>CapCut의 Text-to-Video</strong> 기능에 붙여넣거나, VREW의 <strong>대본→영상 자동 변환</strong> 기능에 import하면 바로 편집 가능합니다.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
        <Footer />
      </main>
    </div>
  )
}
