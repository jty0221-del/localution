'use client';

import { useState } from 'react';
import {
  Star, MessageSquare, TrendingUp, Zap, Copy, Check,
  Filter, Search, RefreshCw, ThumbsUp, Clock,
  BarChart2, Share2, Youtube, Loader2, Sparkles,
  Camera, FileText, Hash
} from 'lucide-react';

const reviews = [
  { id: 1, platform: '네이버', name: '김지수', rating: 5, text: '부천 맛집 찾다가 여기 발견했는데 진짜 맛있어요! 자몽에이드도 맛있고 분위기도 너무 좋아요.', time: '10분 전', replied: false, photo: true, keywords: ['부천 맛집', '가성비'] },
  { id: 2, platform: '배민', name: '박민준', rating: 4, text: '배달도 빠르고 양도 많아요. 신중동 근처에서 시켰는데 따뜻하게 도착했어요.', time: '1시간 전', replied: true, photo: false, keywords: ['신중동카페'] },
  { id: 3, platform: '네이버', name: '이서연', rating: 5, text: '회식장소로 딱이에요! 단체석도 있고 음식도 맛있어서 다들 좋아했어요.', time: '3시간 전', replied: false, photo: true, keywords: ['회식장소', '단체모임'] },
  { id: 4, platform: '구글', name: 'Sarah K.', rating: 5, text: 'Amazing cafe! Great coffee and cozy atmosphere. Definitely coming back!', time: '5시간 전', replied: false, photo: false, keywords: ['부천 맛집'] },
  { id: 5, platform: '네이버', name: '최동현', rating: 3, text: '음식은 맛있었는데 대기가 좀 길었어요. 그래도 맛은 인정!', time: '어제', replied: true, photo: false, keywords: [] },
];

const toneOptions = [
  { id: 'warm', emoji: '🤗', label: '따뜻한 사장님', desc: '친근하고 감사한 말투' },
  { id: 'pro', emoji: '💼', label: '전문 비즈니스', desc: '격식 있는 말투' },
  { id: 'fun', emoji: '😄', label: '유쾌한 캐릭터', desc: '재미있는 말투' },
  { id: 'simple', emoji: '✨', label: '심플 & 깔끔', desc: '짧고 명확한 말투' },
];

const seoKeywords = [
  { keyword: '부천 맛집', volume: '12,400', competition: '높음' },
  { keyword: '신중동 카페', volume: '3,200', competition: '중간' },
  { keyword: '부천 카페', volume: '8,900', competition: '높음' },
  { keyword: '소사구 맛집', volume: '1,100', competition: '낮음' },
  { keyword: '부천 회식', volume: '2,300', competition: '중간' },
];

const shortformPlatforms = [
  { id: 'tiktok', name: '틱톡', icon: '🎵', size: '9:16 · 60초' },
  { id: 'shorts', name: '유튜브 쇼츠', icon: '▶️', size: '9:16 · 60초' },
  { id: 'reels', name: '인스타 릴스', icon: '📸', size: '9:16 · 90초' },
  { id: 'clip', name: '네이버 클립', icon: '🟢', size: '9:16 · 60초' },
];

export default function ReviewAdminPage() {
  const [activeTab, setActiveTab] = useState<'reviews' | 'seo' | 'shortform' | 'menu'>('reviews');
  const [selectedReview, setSelectedReview] = useState<typeof reviews[0] | null>(null);
  const [selectedTone, setSelectedTone] = useState('warm');
  const [generatedReply, setGeneratedReply] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState('전체');
  const [searchText, setSearchText] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['tiktok', 'shorts', 'reels', 'clip']);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishDone, setPublishDone] = useState(false);

  const filteredReviews = reviews.filter(r => {
    const matchPlatform = filterPlatform === '전체' || r.platform === filterPlatform;
    const matchSearch = r.text.includes(searchText) || r.name.includes(searchText);
    return matchPlatform && matchSearch;
  });

  const unrepliedCount = reviews.filter(r => !r.replied).length;

  const generateReply = async () => {
    if (!selectedReview) return;
    setIsGenerating(true);
    setGeneratedReply('');
    const toneGuide: Record<string, string> = {
      warm: '따뜻하고 친근한 사장님 말투',
      pro: '격식 있고 신뢰감 있는 비즈니스 말투',
      fun: '유쾌하고 재미있는 말투, 이모지 활용',
      simple: '짧고 명확한 심플한 말투',
    };
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `소상공인 카페 사장님으로서 아래 리뷰에 ${toneGuide[selectedTone]}로 답글을 작성해주세요.
플랫폼: ${selectedReview.platform} / 고객: ${selectedReview.name} / 별점: ${selectedReview.rating}점
리뷰: ${selectedReview.text}
규칙: 2~3문장, 고객 이름 언급, 재방문 유도, 답글만 출력`
          }]
        })
      });
      const data = await response.json();
      setGeneratedReply(data.content?.[0]?.text || '답글 생성 실패');
    } catch {
      setGeneratedReply('API 연결 오류. API 키를 확인해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyReply = () => {
    navigator.clipboard.writeText(generatedReply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    await new Promise(r => setTimeout(r, 2500));
    setIsPublishing(false);
    setPublishDone(true);
    setTimeout(() => setPublishDone(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">

      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-[#0f0f13]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg leading-none">AI 리뷰 · 마케팅</h1>
            <p className="text-gray-500 text-xs mt-1">통합 리뷰 관리 & SEO 자동화</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/15 border border-pink-500/20 rounded-xl">
            <span className="text-pink-400 text-xs font-bold">미답변 {unrepliedCount}개</span>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mt-4 bg-white/5 rounded-xl p-1">
          {[
            { id: 'reviews', label: '리뷰 관리', icon: MessageSquare },
            { id: 'seo', label: 'SEO 키워드', icon: TrendingUp },
            { id: 'shortform', label: '숏폼 발행', icon: Share2 },
            { id: 'menu', label: '메뉴 업스케일', icon: Camera },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id ? 'bg-violet-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}>
                <Icon size={13} />
                <span className="hidden sm:block">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5 space-y-5 max-w-4xl mx-auto">

        {/* ── 리뷰 관리 탭 ── */}
        {activeTab === 'reviews' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '전체 리뷰', value: '284', change: '+12', icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { label: '평균 별점', value: '4.8', change: '↑0.2', icon: ThumbsUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: '답글률', value: '94%', change: '+3%', icon: MessageSquare, color: 'text-violet-400', bg: 'bg-violet-500/10' },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className={`${stat.bg} rounded-2xl p-3.5 border border-white/5`}>
                    <Icon size={16} className={`${stat.color} mb-2`} />
                    <p className="text-white font-bold text-xl leading-none">{stat.value}</p>
                    <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
                    <p className={`text-xs font-medium mt-1 ${stat.color}`}>{stat.change}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input value={searchText} onChange={e => setSearchText(e.target.value)}
                  placeholder="리뷰 검색..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all" />
              </div>
              <div className="flex gap-1">
                {['전체', '네이버', '배민', '구글'].map(p => (
                  <button key={p} onClick={() => setFilterPlatform(p)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${filterPlatform === p ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredReviews.map(review => (
                <div key={review.id}
                  className={`rounded-2xl border p-4 transition-all cursor-pointer ${selectedReview?.id === review.id ? 'border-violet-500 bg-violet-500/5' : 'border-white/5 bg-[#13131f] hover:border-white/10'}`}
                  onClick={() => { setSelectedReview(review); setGeneratedReply(''); }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          review.platform === '네이버' ? 'bg-emerald-500/20 text-emerald-400' :
                          review.platform === '배민' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>{review.platform}</span>
                        <span className="text-white text-sm font-medium">{review.name}</span>
                        <span className="text-amber-400 text-xs">{'★'.repeat(review.rating)}</span>
                        {review.photo && <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full">📸 사진</span>}
                        <span className="text-gray-600 text-xs ml-auto flex items-center gap-1"><Clock size={10} />{review.time}</span>
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">{review.text}</p>
                      {review.keywords.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {review.keywords.map(kw => (
                            <span key={kw} className="text-xs px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20">#{kw}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {review.replied
                        ? <span className="text-xs text-gray-600 bg-white/5 px-2.5 py-1.5 rounded-xl">답글완료</span>
                        : <span className="text-xs bg-pink-500/20 text-pink-400 px-2.5 py-1.5 rounded-xl font-medium">미답변</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedReview && (
              <div className="rounded-2xl bg-[#13131f] border border-violet-500/20 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={15} className="text-violet-400" />
                  <h3 className="text-white font-bold text-sm">AI 답글 생성 — {selectedReview.name}님 리뷰</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {toneOptions.map(t => (
                    <button key={t.id} onClick={() => setSelectedTone(t.id)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${selectedTone === t.id ? 'border-violet-500 bg-violet-500/10' : 'border-white/5 hover:bg-white/5'}`}>
                      <span className="text-lg">{t.emoji}</span>
                      <div>
                        <p className={`text-xs font-bold ${selectedTone === t.id ? 'text-violet-300' : 'text-white'}`}>{t.label}</p>
                        <p className="text-gray-500 text-xs">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={generateReply} disabled={isGenerating}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
                  {isGenerating ? <><Loader2 size={15} className="animate-spin" />생성 중...</> : <><Sparkles size={15} />AI 답글 생성하기</>}
                </button>
                {generatedReply && (
                  <div className="mt-4 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-violet-400 text-xs font-medium">✨ 생성된 답글</span>
                      <button onClick={copyReply} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                        {copied ? <><Check size={11} className="text-emerald-400" />복사됨!</> : <><Copy size={11} />복사</>}
                      </button>
                    </div>
                    <p className="text-white text-sm leading-relaxed">{generatedReply}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={generateReply} className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white text-xs transition-all">
                        <RefreshCw size={11} className="inline mr-1" />다시 생성
                      </button>
                      <button onClick={copyReply} className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all">
                        복사 후 등록하기 ✓
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── SEO 키워드 탭 ── */}
        {activeTab === 'seo' && (
          <>
            <div className="rounded-2xl bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/20 p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-violet-400" />
                <h3 className="text-white font-bold text-sm">파워링크 키워드 스캐너</h3>
              </div>
              <p className="text-gray-400 text-xs">네이버 플레이스 상위 노출을 위한 실시간 키워드 분석</p>
            </div>

            <div className="rounded-2xl bg-[#13131f] border border-white/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                <p className="text-white font-bold text-sm">추천 키워드</p>
                <button className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                  <RefreshCw size={12} />새로고침
                </button>
              </div>
              <div className="divide-y divide-white/5">
                {seoKeywords.map((kw, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/3 transition-all">
                    <span className="text-gray-600 text-xs w-4">{i + 1}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <Hash size={12} className="text-gray-500" />
                      <span className="text-white text-sm font-medium">{kw.keyword}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-bold">{kw.volume}</p>
                      <p className="text-gray-500 text-xs">월 검색량</p>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-lg ${
                      kw.competition === '높음' ? 'bg-red-500/15 text-red-400' :
                      kw.competition === '중간' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-emerald-500/15 text-emerald-400'
                    }`}>{kw.competition}</div>
                    <button className="text-xs bg-violet-600/20 hover:bg-violet-600/40 text-violet-400 px-2.5 py-1.5 rounded-lg transition-all">적용</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-[#13131f] border border-white/5 p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={15} className="text-emerald-400" />
                <h3 className="text-white font-bold text-sm">AI SEO 인사이트</h3>
              </div>
              <div className="space-y-3">
                {[
                  { icon: '🏆', title: '상위 노출 핵심', desc: '"부천 맛집" + "신중동" 조합이 이번 달 검색량 23% 상승했어요.' },
                  { icon: '📝', title: '리뷰 키워드 주입', desc: '최근 생성된 리뷰 중 "가성비" 포함 비율이 68%로 목표치 달성!' },
                  { icon: '⚡', title: '경쟁 분석', desc: '"소사구 맛집" 키워드는 경쟁이 낮아 빠른 상위 노출이 가능해요.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 p-3.5 rounded-xl bg-white/3 border border-white/5">
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-white text-sm font-bold">{item.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── 숏폼 발행 탭 ── */}
        {activeTab === 'shortform' && (
          <>
            <div className="rounded-2xl bg-gradient-to-r from-pink-600/20 to-rose-600/20 border border-pink-500/20 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Share2 size={16} className="text-pink-400" />
                <h3 className="text-white font-bold text-sm">OSMU 숏폼 퍼블리셔</h3>
              </div>
              <p className="text-gray-400 text-xs">영상 1개 업로드 → 틱톡·쇼츠·릴스·클립 동시 발행</p>
            </div>

            <div className="rounded-2xl bg-[#13131f] border border-white/5 p-5">
              <p className="text-white font-bold text-sm mb-3">영상 업로드</p>
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-violet-500/30 transition-all cursor-pointer">
                <Youtube size={28} className="text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm font-medium">영상 파일 드래그 or 클릭</p>
                <p className="text-gray-600 text-xs mt-1">MP4, MOV 지원 · 최대 500MB</p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#13131f] border border-white/5 p-5">
              <p className="text-white font-bold text-sm mb-3">발행 플랫폼 선택</p>
              <div className="grid grid-cols-2 gap-2">
                {shortformPlatforms.map(p => (
                  <button key={p.id}
                    onClick={() => setSelectedPlatforms(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${selectedPlatforms.includes(p.id) ? 'border-violet-500 bg-violet-500/10' : 'border-white/5 bg-white/3'}`}>
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <p className="text-white text-sm font-bold">{p.name}</p>
                      <p className="text-gray-500 text-xs">{p.size}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ml-auto flex-shrink-0 transition-all ${selectedPlatforms.includes(p.id) ? 'border-violet-500 bg-violet-500' : 'border-gray-600'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-[#13131f] border border-white/5 p-5">
              <p className="text-white font-bold text-sm mb-3">발행 일정</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">발행 날짜</label>
                  <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">발행 시간</label>
                  <input type="time" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50" />
                </div>
              </div>
            </div>

            <button onClick={handlePublish} disabled={isPublishing || selectedPlatforms.length === 0}
              className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                publishDone ? 'bg-emerald-600 text-white' : 'bg-gradient-to-r from-pink-600 to-rose-600 disabled:opacity-50 text-white shadow-lg shadow-pink-500/20'
              }`}>
              {isPublishing ? <><Loader2 size={16} className="animate-spin" />{selectedPlatforms.length}개 플랫폼 발행 중...</> :
               publishDone ? <><Check size={16} />발행 완료!</> :
               <><Share2 size={16} />{selectedPlatforms.length}개 플랫폼 동시 발행하기</>}
            </button>
          </>
        )}

        {/* ── 메뉴 업스케일 탭 ── */}
        {activeTab === 'menu' && (
          <>
            <div className="rounded-2xl bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/20 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Camera size={16} className="text-amber-400" />
                <h3 className="text-white font-bold text-sm">메뉴 사진 업스케일링</h3>
              </div>
              <p className="text-gray-400 text-xs">일반 사진 → 상업용 고퀄리티 + SEO 메뉴 설명 자동 생성</p>
            </div>

            <div className="rounded-2xl bg-[#13131f] border border-white/5 p-5">
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-amber-500/30 transition-all cursor-pointer">
                <Camera size={28} className="text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm font-medium">메뉴 사진 업로드</p>
                <p className="text-gray-600 text-xs mt-1">JPG, PNG · 최대 10MB</p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#13131f] border border-white/5 p-5">
              <p className="text-white font-bold text-sm mb-4">🎨 업스케일 결과 예시</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl bg-white/5 aspect-square flex items-center justify-center border border-white/5">
                  <div className="text-center">
                    <p className="text-gray-600 text-xs">원본</p>
                    <Camera size={24} className="text-gray-700 mx-auto mt-2" />
                  </div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 aspect-square flex items-center justify-center border border-amber-500/20">
                  <div className="text-center">
                    <p className="text-amber-400 text-xs font-medium">업스케일 ✨</p>
                    <Sparkles size={24} className="text-amber-400 mx-auto mt-2" />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={13} className="text-amber-400" />
                  <p className="text-amber-400 text-xs font-bold">AI 생성 SEO 메뉴 설명</p>
                </div>
                <p className="text-white text-sm leading-relaxed">
                  신선한 자몽을 직접 착즙해 만든 <span className="text-amber-300 font-medium">부천 카페</span> 대표 음료.
                  상큼한 시트러스향과 적절한 당도가 조화롭게 어우러져
                  <span className="text-amber-300 font-medium"> 가성비</span> 좋은 한 잔으로 많은 사랑을 받고 있습니다.
                </p>
                <button className="mt-3 flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                  <Copy size={11} />설명 복사하기
                </button>
              </div>
            </div>

            <button className="w-full py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2">
              <Sparkles size={16} />메뉴 사진 업스케일 시작
            </button>
          </>
        )}

      </div>
    </div>
  );
}
