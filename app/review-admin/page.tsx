'use client';

import { useState, useRef } from 'react';
import {
  Star, MessageSquare, TrendingUp, Zap, Copy, Check,
  Search, RefreshCw, ThumbsUp, Clock, BarChart2,
  Share2, Loader2, Sparkles, Camera, FileText,
  Hash, Video, Image, Upload, X, Eye
} from 'lucide-react';

const reviews = [
  { id: 1, platform: '네이버', name: '김지수', rating: 5, text: '부천 맛집 찾다가 여기 발견했는데 진짜 맛있어요! 자몽에이드도 맛있고 분위기도 너무 좋아요.', time: '10분 전', replied: false, photo: true, keywords: ['부천 맛집', '가성비'], photoUrl: '' },
  { id: 2, platform: '배민', name: '박민준', rating: 4, text: '배달도 빠르고 양도 많아요. 신중동 근처에서 시켰는데 따뜻하게 도착했어요.', time: '1시간 전', replied: true, photo: false, keywords: ['신중동카페'], photoUrl: '' },
  { id: 3, platform: '네이버', name: '이서연', rating: 5, text: '회식장소로 딱이에요! 단체석도 있고 음식도 맛있어서 다들 좋아했어요.', time: '3시간 전', replied: false, photo: true, keywords: ['회식장소', '단체모임'], photoUrl: '' },
  { id: 4, platform: '구글', name: 'Sarah K.', rating: 5, text: 'Amazing cafe! Great coffee and cozy atmosphere. Definitely coming back!', time: '5시간 전', replied: false, photo: false, keywords: ['부천 맛집'], photoUrl: '' },
  { id: 5, platform: '네이버', name: '최동현', rating: 3, text: '음식은 맛있었는데 대기가 좀 길었어요. 그래도 맛은 인정!', time: '어제', replied: true, photo: false, keywords: [], photoUrl: '' },
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

  // Vision AI 관련
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [photoAnalysis, setPhotoAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // 메뉴 업스케일 관련
  const [menuPhoto, setMenuPhoto] = useState<string | null>(null);
  const [menuDesc, setMenuDesc] = useState('');
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const menuInputRef = useRef<HTMLInputElement>(null);

  const filteredReviews = reviews.filter(r => {
    const matchPlatform = filterPlatform === '전체' || r.platform === filterPlatform;
    const matchSearch = r.text.includes(searchText) || r.name.includes(searchText);
    return matchPlatform && matchSearch;
  });

  const unrepliedCount = reviews.filter(r => !r.replied).length;

  // ✅ 이미지 → base64 변환
  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    });
  };

  // ✅ Vision AI - 고객 사진 분석 + 답글 생성
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedReview) return;

    const url = URL.createObjectURL(file);
    setUploadedPhoto(url);
    setIsAnalyzing(true);
    setGeneratedReply('');

    const toneGuide: Record<string, string> = {
      warm: '따뜻하고 친근한 사장님 말투',
      pro: '격식 있고 신뢰감 있는 비즈니스 말투',
      fun: '유쾌하고 재미있는 말투, 이모지 활용',
      simple: '짧고 명확한 심플한 말투',
    };

    try {
      const base64 = await toBase64(file);
      const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp';

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
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 }
              },
              {
                type: 'text',
                text: `당신은 소상공인 카페 사장님입니다.

고객이 올린 사진을 분석해서 사진에 보이는 음식/음료/공간의 특징을 파악하고,
아래 리뷰에 ${toneGuide[selectedTone]}로 답글을 작성해주세요.

사진 속 내용을 구체적으로 언급하면서 답글을 작성해주세요.

플랫폼: ${selectedReview.platform}
고객명: ${selectedReview.name}
별점: ${selectedReview.rating}점
리뷰: ${selectedReview.text}

규칙:
- 사진에서 보이는 것을 구체적으로 언급
- 2~3문장으로 간결하게
- 고객 이름 언급
- 재방문 유도로 마무리
- 답글만 출력`
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || '답글 생성 실패';
      setGeneratedReply(reply);
      setPhotoAnalysis('사진 분석 완료 ✅');
    } catch {
      setGeneratedReply('API 연결 오류. API 키를 확인해주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ✅ 텍스트만으로 AI 답글 생성
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
      setGeneratedReply('API 연결 오류.');
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

  // ✅ 메뉴 사진 → SEO 설명 생성
  const handleMenuPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setMenuPhoto(url);
    setIsGeneratingDesc(true);
    setMenuDesc('');

    try {
      const base64 = await toBase64(file);
      const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp';

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
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 }
              },
              {
                type: 'text',
                text: `이 메뉴 사진을 분석해서 네이버 플레이스 상위 노출에 최적화된 메뉴 설명을 작성해주세요.

조건:
- 음식/음료의 특징, 맛, 재료를 구체적으로 설명
- "부천 카페", "신중동 카페", "가성비" 등 SEO 키워드 자연스럽게 포함
- 3~4문장으로 작성
- 고객이 먹고 싶어지게 하는 감성적인 표현 사용
- 메뉴 설명만 출력`
              }
            ]
          }]
        })
      });

      const data = await response.json();
      setMenuDesc(data.content?.[0]?.text || '설명 생성 실패');
    } catch {
      setMenuDesc('API 연결 오류.');
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">

      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-[#0f0f13]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg leading-none">AI 리뷰 · 마케팅</h1>
            <p className="text-gray-500 text-xs mt-1">Vision AI 사진 분석 · SEO 자동화</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/15 border border-pink-500/20 rounded-xl">
            <span className="text-pink-400 text-xs font-bold">미답변 {unrepliedCount}개</span>
          </div>
        </div>
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
                <Icon size={13} /><span className="hidden sm:block">{tab.label}</span>
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
                  onClick={() => { setSelectedReview(review); setGeneratedReply(''); setUploadedPhoto(null); setPhotoAnalysis(''); }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          review.platform === '네이버' ? 'bg-emerald-500/20 text-emerald-400' :
                          review.platform === '배민' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>{review.platform}</span>
                        <span className="text-white text-sm font-medium">{review.name}</span>
                        <span className="text-amber-400 text-xs">{'★'.repeat(review.rating)}</span>
                        {review.photo && <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full">📸 사진있음</span>}
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

            {/* ✅ AI 답글 생성 패널 */}
            {selectedReview && (
              <div className="rounded-2xl bg-[#13131f] border border-violet-500/20 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={15} className="text-violet-400" />
                  <h3 className="text-white font-bold text-sm">AI 답글 생성 — {selectedReview.name}님</h3>
                </div>

                {/* 말투 선택 */}
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

                {/* ✅ Vision AI 사진 업로드 */}
                <div className="mb-4 p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye size={14} className="text-pink-400" />
                    <p className="text-pink-400 text-xs font-bold">Vision AI — 고객 사진 분석 답글</p>
                  </div>
                  <p className="text-gray-500 text-xs mb-3">고객이 올린 사진을 업로드하면 AI가 사진을 분석해서 더 구체적인 답글을 생성해요!</p>

                  {uploadedPhoto ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <img src={uploadedPhoto} alt="업로드된 사진" className="w-full h-32 object-cover rounded-xl" />
                        <button
                          onClick={() => { setUploadedPhoto(null); setPhotoAnalysis(''); }}
                          className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                          <X size={12} className="text-white" />
                        </button>
                        {photoAnalysis && (
                          <div className="absolute bottom-2 left-2 bg-emerald-500/80 text-white text-xs px-2 py-1 rounded-lg">
                            {photoAnalysis}
                          </div>
                        )}
                      </div>
                      {isAnalyzing && (
                        <div className="flex items-center gap-2 text-pink-400 text-xs">
                          <Loader2 size={12} className="animate-spin" />
                          사진 분석 중...
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-pink-500/30 hover:border-pink-500/60 text-pink-400 text-xs font-medium flex items-center justify-center gap-2 transition-all">
                      <Upload size={14} />고객 사진 업로드
                    </button>
                  )}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>

                {/* 텍스트 답글 생성 버튼 */}
                <button onClick={generateReply} disabled={isGenerating || isAnalyzing}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
                  {isGenerating ? <><Loader2 size={15} className="animate-spin" />생성 중...</> :
                   isAnalyzing ? <><Loader2 size={15} className="animate-spin" />사진 분석 중...</> :
                   <><Sparkles size={15} />{uploadedPhoto ? 'Vision AI 답글 재생성' : 'AI 답글 생성하기'}</>}
                </button>

                {generatedReply && (
                  <div className="mt-4 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-violet-400 text-xs font-medium">
                        {uploadedPhoto ? '✨ Vision AI 생성 답글' : '✨ AI 생성 답글'}
                      </span>
                      <button onClick={copyReply} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white">
                        {copied ? <><Check size={11} className="text-emerald-400" />복사됨!</> : <><Copy size={11} />복사</>}
                      </button>
                    </div>
                    <p className="text-white text-sm leading-relaxed">{generatedReply}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={generateReply} className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white text-xs">
                        <RefreshCw size={11} className="inline mr-1" />다시 생성
                      </button>
                      <button onClick={copyReply} className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium">
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
                <button className="flex items-center gap-1.5 text-xs text-violet-400"><RefreshCw size={12} />새로고침</button>
              </div>
              <div className="divide-y divide-white/5">
                {seoKeywords.map((kw, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/3">
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
                    <button className="text-xs bg-violet-600/20 text-violet-400 px-2.5 py-1.5 rounded-lg">적용</button>
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
                <Video size={28} className="text-gray-600 mx-auto mb-2" />
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
                    <div className={`w-4 h-4 rounded-full border-2 ml-auto flex-shrink-0 ${selectedPlatforms.includes(p.id) ? 'border-violet-500 bg-violet-500' : 'border-gray-600'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-[#13131f] border border-white/5 p-5">
              <p className="text-white font-bold text-sm mb-3">발행 일정</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">발행 날짜</label>
                  <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">발행 시간</label>
                  <input type="time" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
                </div>
              </div>
            </div>

            <button onClick={handlePublish} disabled={isPublishing || selectedPlatforms.length === 0}
              className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                publishDone ? 'bg-emerald-600 text-white' : 'bg-gradient-to-r from-pink-600 to-rose-600 disabled:opacity-50 text-white shadow-lg'
              }`}>
              {isPublishing ? <><Loader2 size={16} className="animate-spin" />{selectedPlatforms.length}개 발행 중...</> :
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
                <h3 className="text-white font-bold text-sm">메뉴 사진 → SEO 설명 자동 생성</h3>
              </div>
              <p className="text-gray-400 text-xs">사진 업로드 → Vision AI 분석 → 네이버 상위 노출 메뉴 설명 자동 완성!</p>
            </div>

            {/* ✅ 실제 업로드 기능 */}
            <div className="rounded-2xl bg-[#13131f] border border-white/5 p-5">
              <p className="text-white font-bold text-sm mb-3">메뉴 사진 업로드</p>

              {menuPhoto ? (
                <div className="relative mb-4">
                  <img src={menuPhoto} alt="메뉴 사진" className="w-full h-48 object-cover rounded-2xl" />
                  <button
                    onClick={() => { setMenuPhoto(null); setMenuDesc(''); }}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-all">
                    <X size={14} className="text-white" />
                  </button>
                  {isGeneratingDesc && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                      <div className="flex items-center gap-2 text-white text-sm font-bold">
                        <Loader2 size={18} className="animate-spin text-amber-400" />
                        Vision AI 분석 중...
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => menuInputRef.current?.click()}
                  className="border-2 border-dashed border-white/10 rounded-2xl p-10 text-center hover:border-amber-500/40 transition-all cursor-pointer mb-4">
                  <Image size={32} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm font-medium">메뉴 사진 클릭해서 업로드</p>
                  <p className="text-gray-600 text-xs mt-1">JPG, PNG, WEBP · 최대 10MB</p>
                </div>
              )}

              <input
                ref={menuInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleMenuPhoto}
              />

              {!menuPhoto && (
                <button
                  onClick={() => menuInputRef.current?.click()}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2">
                  <Upload size={16} />사진 선택하기
                </button>
              )}
            </div>

            {/* ✅ 생성된 SEO 설명 */}
            {menuDesc && (
              <div className="rounded-2xl bg-[#13131f] border border-amber-500/20 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-amber-400" />
                    <p className="text-amber-400 text-xs font-bold">✨ AI 생성 SEO 메뉴 설명</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(menuDesc); alert('복사됐어요!'); }}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                    <Copy size={11} />복사
                  </button>
                </div>
                <p className="text-white text-sm leading-relaxed">{menuDesc}</p>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => menuInputRef.current?.click()}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs transition-all">
                    <RefreshCw size={11} className="inline mr-1" />다른 사진
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(menuDesc); alert('네이버 플레이스에 붙여넣기 하세요!'); }}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-all">
                    네이버에 등록하기 →
                  </button>
                </div>
              </div>
            )}

            {/* 사용 방법 안내 */}
            {!menuPhoto && (
              <div className="rounded-2xl bg-[#13131f] border border-white/5 p-5">
                <p className="text-white font-bold text-sm mb-3">💡 이렇게 활용하세요</p>
                <div className="space-y-3">
                  {[
                    { step: '1', title: '메뉴 사진 촬영', desc: '스마트폰으로 메뉴 사진 찍기 (자연광 권장)' },
                    { step: '2', title: 'Vision AI 분석', desc: 'AI가 음식의 색감, 재료, 분위기를 자동 분석' },
                    { step: '3', title: 'SEO 설명 생성', desc: '"부천 카페", "가성비" 등 키워드 자동 포함' },
                    { step: '4', title: '네이버 플레이스 등록', desc: '복사 후 네이버 플레이스 메뉴 설명에 붙여넣기' },
                  ].map(item => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-400 text-xs font-bold">{item.step}</div>
                      <div>
                        <p className="text-white text-xs font-bold">{item.title}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
