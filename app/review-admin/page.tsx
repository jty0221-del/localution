'use client';

import { useState, useRef } from 'react';
import {
  Star, MessageSquare, TrendingUp, Zap, Copy, Check,
  Search, RefreshCw, ThumbsUp, Clock, BarChart2,
  Share2, Loader2, Sparkles, Camera, FileText,
  Hash, Video, Upload, X, Eye, Image
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
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [menuPhoto, setMenuPhoto] = useState<string | null>(null);
  const [menuDesc, setMenuDesc] = useState('');
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const menuInputRef = useRef<HTMLInputElement>(null);

  const filteredReviews = reviews.filter(r => {
    const matchPlatform = filterPlatform === '전체' || r.platform === filterPlatform;
    const matchSearch = r.text.includes(searchText) || r.name.includes(searchText);
    return matchPlatform && matchSearch;
  });

  const unrepliedCount = reviews.filter(r => !r.replied).length;

  const toBase64 = (file: File): Promise<string> => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedReview) return;
    setUploadedPhoto(URL.createObjectURL(file));
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
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 500,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
            { type: 'text', text: `소상공인 카페 사장님으로서 사진을 분석해서 ${toneGuide[selectedTone]}로 답글을 작성해주세요.\n고객: ${selectedReview.name} / 별점: ${selectedReview.rating}점\n리뷰: ${selectedReview.text}\n규칙: 사진 내용 구체적 언급, 2~3문장, 재방문 유도, 답글만 출력` }
          ]}]
        })
      });
      const data = await response.json();
      setGeneratedReply(data.content?.[0]?.text || '생성 실패');
    } catch { setGeneratedReply('API 연결 오류'); }
    finally { setIsAnalyzing(false); }
  };

  const generateReply = async () => {
    if (!selectedReview) return;
    setIsGenerating(true);
    setGeneratedReply('');
    const toneGuide: Record<string, string> = { warm: '따뜻하고 친근한 사장님 말투', pro: '격식 있는 비즈니스 말투', fun: '유쾌하고 재미있는 말투', simple: '짧고 명확한 말투' };
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 300, messages: [{ role: 'user', content: `${toneGuide[selectedTone]}로 답글 작성. 고객: ${selectedReview.name} / 별점: ${selectedReview.rating}점\n리뷰: ${selectedReview.text}\n2~3문장, 이름 언급, 재방문 유도, 답글만 출력` }] })
      });
      const data = await response.json();
      setGeneratedReply(data.content?.[0]?.text || '생성 실패');
    } catch { setGeneratedReply('API 연결 오류'); }
    finally { setIsGenerating(false); }
  };

  const handleMenuPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMenuPhoto(URL.createObjectURL(file));
    setIsGeneratingDesc(true);
    setMenuDesc('');
    try {
      const base64 = await toBase64(file);
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 400, messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
          { type: 'text', text: '이 메뉴 사진으로 네이버 플레이스 최적화 메뉴 설명을 작성해주세요. "부천 카페", "가성비" 등 SEO 키워드 포함. 3~4문장. 설명만 출력.' }
        ]}] })
      });
      const data = await response.json();
      setMenuDesc(data.content?.[0]?.text || '생성 실패');
    } catch { setMenuDesc('API 연결 오류'); }
    finally { setIsGeneratingDesc(false); }
  };

  const copyReply = () => { navigator.clipboard.writeText(generatedReply); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handlePublish = async () => { setIsPublishing(true); await new Promise(r => setTimeout(r, 2000)); setIsPublishing(false); setPublishDone(true); setTimeout(() => setPublishDone(false), 3000); };

  return (
    <div className="min-h-screen bg-[#F8FAFB]">

      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E5EAF2] px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <h1 className="text-[#191F28] font-black text-xl">AI 리뷰 · 마케팅</h1>
            <p className="text-[#8B95A1] text-xs mt-0.5">Vision AI 사진 분석 · SEO 자동화</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FFF0F2] border border-[#FFD6DA] rounded-xl">
            <div className="w-2 h-2 rounded-full bg-[#F04452] animate-pulse" />
            <span className="text-[#F04452] text-xs font-bold">미답변 {unrepliedCount}개</span>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mt-4 bg-[#F2F4F6] rounded-xl p-1 max-w-5xl mx-auto">
          {[
            { id: 'reviews', label: '리뷰 관리', icon: MessageSquare },
            { id: 'seo', label: 'SEO 키워드', icon: TrendingUp },
            { id: 'shortform', label: '숏폼 발행', icon: Share2 },
            { id: 'menu', label: '메뉴 업스케일', icon: Camera },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id ? 'bg-white text-[#3182F6] shadow-sm' : 'text-[#8B95A1] hover:text-[#191F28]'
                }`}>
                <Icon size={13} /><span className="hidden sm:block">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-5xl mx-auto">

        {/* ── 리뷰 관리 ── */}
        {activeTab === 'reviews' && (
          <>
            {/* 통계 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: '전체 리뷰', value: '284', change: '+12', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
                { label: '평균 별점', value: '4.8', change: '↑0.2', icon: ThumbsUp, color: 'text-[#00C073]', bg: 'bg-[#E8FBF3]' },
                { label: '답글률', value: '94%', change: '+3%', icon: MessageSquare, color: 'text-[#3182F6]', bg: 'bg-[#EBF3FF]' },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-white rounded-2xl p-4 border border-[#E5EAF2]">
                    <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                      <Icon size={17} className={stat.color} />
                    </div>
                    <p className="text-[#191F28] font-black text-2xl leading-none">{stat.value}</p>
                    <p className="text-[#8B95A1] text-xs mt-1">{stat.label}</p>
                    <p className={`text-xs font-bold mt-1 ${stat.color}`}>{stat.change}</p>
                  </div>
                );
              })}
            </div>

            {/* 검색 & 필터 */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B8C1]" />
                <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="리뷰 검색..."
                  className="w-full bg-white border border-[#E5EAF2] rounded-xl pl-9 pr-4 py-2.5 text-[#191F28] text-sm placeholder-[#B0B8C1] focus:outline-none focus:border-[#3182F6] transition-all" />
              </div>
              <div className="flex gap-1">
                {['전체', '네이버', '배민', '구글'].map(p => (
                  <button key={p} onClick={() => setFilterPlatform(p)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${filterPlatform === p ? 'bg-[#3182F6] text-white' : 'bg-white border border-[#E5EAF2] text-[#8B95A1] hover:text-[#191F28]'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* 리뷰 목록 */}
            <div className="bg-white rounded-2xl border border-[#E5EAF2] overflow-hidden">
              <div className="divide-y divide-[#F2F4F6]">
                {filteredReviews.map(review => (
                  <div key={review.id}
                    className={`p-5 transition-all cursor-pointer hover:bg-[#F8FAFB] ${selectedReview?.id === review.id ? 'bg-[#EBF3FF] border-l-4 border-[#3182F6]' : ''}`}
                    onClick={() => { setSelectedReview(review); setGeneratedReply(''); setUploadedPhoto(null); }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                            review.platform === '네이버' ? 'bg-[#E8FBF3] text-[#00C073]' :
                            review.platform === '배민' ? 'bg-[#EBF3FF] text-[#3182F6]' : 'bg-[#F2F4F6] text-[#8B95A1]'
                          }`}>{review.platform}</span>
                          <span className="text-[#191F28] text-sm font-bold">{review.name}</span>
                          <span className="text-amber-400 text-xs">{'★'.repeat(review.rating)}</span>
                          {review.photo && <span className="text-xs bg-pink-50 text-pink-500 px-2 py-0.5 rounded-full font-medium">📸 사진</span>}
                          <span className="text-[#B0B8C1] text-xs ml-auto flex items-center gap-1"><Clock size={10} />{review.time}</span>
                        </div>
                        <p className="text-[#8B95A1] text-sm leading-relaxed line-clamp-2">{review.text}</p>
                        {review.keywords.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {review.keywords.map(kw => (
                              <span key={kw} className="text-xs px-2 py-0.5 bg-[#EBF3FF] text-[#3182F6] rounded-lg font-medium">#{kw}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {review.replied
                          ? <span className="text-xs text-[#B0B8C1] bg-[#F2F4F6] px-2.5 py-1.5 rounded-xl">답글완료</span>
                          : <span className="text-xs bg-[#FFF0F2] text-[#F04452] px-2.5 py-1.5 rounded-xl font-bold">미답변</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI 답글 패널 */}
            {selectedReview && (
              <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-[#EBF3FF] flex items-center justify-center">
                    <Zap size={14} className="text-[#3182F6]" />
                  </div>
                  <h3 className="text-[#191F28] font-bold text-sm">AI 답글 생성 — {selectedReview.name}님</h3>
                </div>

                {/* 말투 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {toneOptions.map(t => (
                    <button key={t.id} onClick={() => setSelectedTone(t.id)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${selectedTone === t.id ? 'border-[#3182F6] bg-[#EBF3FF]' : 'border-[#E5EAF2] hover:bg-[#F8FAFB]'}`}>
                      <span className="text-lg">{t.emoji}</span>
                      <div>
                        <p className={`text-xs font-bold ${selectedTone === t.id ? 'text-[#3182F6]' : 'text-[#191F28]'}`}>{t.label}</p>
                        <p className="text-[#B0B8C1] text-xs">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Vision AI */}
                <div className="mb-4 p-4 rounded-xl bg-pink-50 border border-pink-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye size={14} className="text-pink-500" />
                    <p className="text-pink-600 text-xs font-bold">Vision AI — 사진 분석 답글</p>
                  </div>
                  <p className="text-[#8B95A1] text-xs mb-3">고객 사진 업로드 시 AI가 사진을 분석해 더 구체적인 답글을 생성해요!</p>

                  {uploadedPhoto ? (
                    <div className="relative">
                      <img src={uploadedPhoto} alt="업로드 사진" className="w-full h-28 object-cover rounded-xl" />
                      <button onClick={() => setUploadedPhoto(null)}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center">
                        <X size={11} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => photoInputRef.current?.click()}
                      className="w-full py-2.5 rounded-xl border-2 border-dashed border-pink-200 hover:border-pink-400 text-pink-500 text-xs font-bold flex items-center justify-center gap-2 transition-all">
                      <Upload size={13} />사진 업로드
                    </button>
                  )}
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>

                <button onClick={generateReply} disabled={isGenerating || isAnalyzing}
                  className="w-full py-3 rounded-xl bg-[#3182F6] hover:bg-[#1B6EF3] disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
                  {isGenerating || isAnalyzing
                    ? <><Loader2 size={15} className="animate-spin" />{isAnalyzing ? '사진 분석 중...' : '생성 중...'}</>
                    : <><Sparkles size={15} />{uploadedPhoto ? 'Vision AI 답글 생성' : 'AI 답글 생성'}</>}
                </button>

                {generatedReply && (
                  <div className="mt-4 p-4 rounded-xl bg-[#F8FAFB] border border-[#E5EAF2]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#3182F6] text-xs font-bold">✨ 생성된 답글</span>
                      <button onClick={copyReply} className="flex items-center gap-1 text-xs text-[#8B95A1] hover:text-[#191F28]">
                        {copied ? <><Check size={11} className="text-[#00C073]" />복사됨!</> : <><Copy size={11} />복사</>}
                      </button>
                    </div>
                    <p className="text-[#191F28] text-sm leading-relaxed">{generatedReply}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={generateReply} className="flex-1 py-2 rounded-lg border border-[#E5EAF2] text-[#8B95A1] text-xs hover:bg-[#F2F4F6] transition-all">
                        <RefreshCw size={11} className="inline mr-1" />다시 생성
                      </button>
                      <button onClick={copyReply} className="flex-1 py-2 rounded-lg bg-[#00C073] hover:bg-[#00A85A] text-white text-xs font-bold transition-all">
                        복사 후 등록 ✓
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── SEO 키워드 ── */}
        {activeTab === 'seo' && (
          <>
            <div className="bg-gradient-to-r from-[#3182F6] to-[#1B6EF3] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-white" />
                <h3 className="text-white font-bold text-sm">파워링크 키워드 스캐너</h3>
              </div>
              <p className="text-blue-100 text-xs">네이버 플레이스 상위 노출을 위한 실시간 키워드 분석</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5EAF2] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E5EAF2] flex items-center justify-between">
                <p className="text-[#191F28] font-bold text-sm">추천 키워드</p>
                <button className="flex items-center gap-1.5 text-xs text-[#3182F6] font-medium"><RefreshCw size={12} />새로고침</button>
              </div>
              <div className="divide-y divide-[#F2F4F6]">
                {seoKeywords.map((kw, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-center gap-4 hover:bg-[#F8FAFB] transition-all">
                    <span className="text-[#B0B8C1] text-xs w-4">{i + 1}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <Hash size={12} className="text-[#B0B8C1]" />
                      <span className="text-[#191F28] text-sm font-bold">{kw.keyword}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[#191F28] text-sm font-bold">{kw.volume}</p>
                      <p className="text-[#B0B8C1] text-xs">월 검색량</p>
                    </div>
                    <div className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                      kw.competition === '높음' ? 'bg-[#FFF0F2] text-[#F04452]' :
                      kw.competition === '중간' ? 'bg-[#FFF8E6] text-[#FF9500]' :
                      'bg-[#E8FBF3] text-[#00C073]'
                    }`}>{kw.competition}</div>
                    <button className="text-xs bg-[#EBF3FF] hover:bg-[#3182F6] hover:text-white text-[#3182F6] px-3 py-1.5 rounded-lg font-bold transition-all">적용</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={15} className="text-[#00C073]" />
                <h3 className="text-[#191F28] font-bold text-sm">AI SEO 인사이트</h3>
              </div>
              <div className="space-y-3">
                {[
                  { icon: '🏆', title: '상위 노출 핵심', desc: '"부천 맛집" + "신중동" 조합이 이번 달 검색량 23% 상승했어요.' },
                  { icon: '📝', title: '리뷰 키워드 주입', desc: '"가성비" 포함 리뷰 비율이 68%로 목표치 달성!' },
                  { icon: '⚡', title: '경쟁 분석', desc: '"소사구 맛집" 키워드는 경쟁이 낮아 빠른 상위 노출이 가능해요.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 p-4 rounded-xl bg-[#F8FAFB] border border-[#E5EAF2]">
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-[#191F28] text-sm font-bold">{item.title}</p>
                      <p className="text-[#8B95A1] text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── 숏폼 발행 ── */}
        {activeTab === 'shortform' && (
          <>
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Share2 size={16} className="text-white" />
                <h3 className="text-white font-bold text-sm">OSMU 숏폼 퍼블리셔</h3>
              </div>
              <p className="text-pink-100 text-xs">영상 1개 업로드 → 틱톡·쇼츠·릴스·클립 동시 발행</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
              <p className="text-[#191F28] font-bold text-sm mb-3">영상 업로드</p>
              <div className="border-2 border-dashed border-[#E5EAF2] rounded-2xl p-10 text-center hover:border-[#3182F6] transition-all cursor-pointer">
                <Video size={28} className="text-[#B0B8C1] mx-auto mb-2" />
                <p className="text-[#8B95A1] text-sm font-medium">영상 파일 드래그 or 클릭</p>
                <p className="text-[#B0B8C1] text-xs mt-1">MP4, MOV · 최대 500MB</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
              <p className="text-[#191F28] font-bold text-sm mb-3">발행 플랫폼 선택</p>
              <div className="grid grid-cols-2 gap-2">
                {shortformPlatforms.map(p => (
                  <button key={p.id}
                    onClick={() => setSelectedPlatforms(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${selectedPlatforms.includes(p.id) ? 'border-[#3182F6] bg-[#EBF3FF]' : 'border-[#E5EAF2] hover:bg-[#F8FAFB]'}`}>
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <p className={`text-sm font-bold ${selectedPlatforms.includes(p.id) ? 'text-[#3182F6]' : 'text-[#191F28]'}`}>{p.name}</p>
                      <p className="text-[#B0B8C1] text-xs">{p.size}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ml-auto flex-shrink-0 transition-all ${selectedPlatforms.includes(p.id) ? 'border-[#3182F6] bg-[#3182F6]' : 'border-[#E5EAF2]'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
              <p className="text-[#191F28] font-bold text-sm mb-3">발행 일정</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#8B95A1] mb-1.5 block font-medium">발행 날짜</label>
                  <input type="date" className="w-full bg-[#F8FAFB] border border-[#E5EAF2] rounded-xl px-3 py-2.5 text-[#191F28] text-sm focus:outline-none focus:border-[#3182F6]" />
                </div>
                <div>
                  <label className="text-xs text-[#8B95A1] mb-1.5 block font-medium">발행 시간</label>
                  <input type="time" className="w-full bg-[#F8FAFB] border border-[#E5EAF2] rounded-xl px-3 py-2.5 text-[#191F28] text-sm focus:outline-none focus:border-[#3182F6]" />
                </div>
              </div>
            </div>

            <button onClick={handlePublish} disabled={isPublishing || selectedPlatforms.length === 0}
              className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
                publishDone ? 'bg-[#00C073] text-white' : 'bg-gradient-to-r from-pink-500 to-rose-500 disabled:opacity-50 text-white'
              }`}>
              {isPublishing ? <><Loader2 size={16} className="animate-spin" />{selectedPlatforms.length}개 발행 중...</> :
               publishDone ? <><Check size={16} />발행 완료!</> :
               <><Share2 size={16} />{selectedPlatforms.length}개 플랫폼 동시 발행</>}
            </button>
          </>
        )}

        {/* ── 메뉴 업스케일 ── */}
        {activeTab === 'menu' && (
          <>
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Camera size={16} className="text-white" />
                <h3 className="text-white font-bold text-sm">메뉴 사진 → SEO 설명 자동 생성</h3>
              </div>
              <p className="text-amber-100 text-xs">Vision AI가 사진을 분석해 네이버 최적화 메뉴 설명을 자동으로 완성해요!</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
              {menuPhoto ? (
                <div className="relative mb-4">
                  <img src={menuPhoto} alt="메뉴" className="w-full h-52 object-cover rounded-xl" />
                  <button onClick={() => { setMenuPhoto(null); setMenuDesc(''); }}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-all">
                    <X size={14} className="text-white" />
                  </button>
                  {isGeneratingDesc && (
                    <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl">
                        <Loader2 size={15} className="animate-spin text-amber-500" />
                        <span className="text-[#191F28] text-sm font-bold">Vision AI 분석 중...</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div onClick={() => menuInputRef.current?.click()}
                  className="border-2 border-dashed border-[#E5EAF2] rounded-2xl p-12 text-center hover:border-amber-400 transition-all cursor-pointer mb-4">
                  <Image size={32} className="text-[#B0B8C1] mx-auto mb-3" />
                  <p className="text-[#8B95A1] text-sm font-medium">메뉴 사진 클릭해서 업로드</p>
                  <p className="text-[#B0B8C1] text-xs mt-1">JPG, PNG, WEBP</p>
                </div>
              )}
              <input ref={menuInputRef} type="file" accept="image/*" className="hidden" onChange={handleMenuPhoto} />
              {!menuPhoto && (
                <button onClick={() => menuInputRef.current?.click()}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2">
                  <Upload size={16} />사진 선택하기
                </button>
              )}
            </div>

            {menuDesc && (
              <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-amber-500" />
                    <p className="text-[#191F28] text-sm font-bold">✨ AI 생성 SEO 메뉴 설명</p>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(menuDesc); alert('복사됐어요!'); }}
                    className="flex items-center gap-1 text-xs text-[#8B95A1] hover:text-[#191F28]">
                    <Copy size={11} />복사
                  </button>
                </div>
                <p className="text-[#191F28] text-sm leading-relaxed">{menuDesc}</p>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => menuInputRef.current?.click()}
                    className="flex-1 py-2.5 rounded-xl border border-[#E5EAF2] text-[#8B95A1] text-xs font-medium hover:bg-[#F8FAFB] transition-all">
                    다른 사진
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(menuDesc); alert('네이버 플레이스에 붙여넣기 하세요!'); }}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all">
                    네이버에 등록하기 →
                  </button>
                </div>
              </div>
            )}

            {!menuPhoto && (
              <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
                <p className="text-[#191F28] font-bold text-sm mb-4">💡 활용 방법</p>
                <div className="space-y-3">
                  {[
                    { step: '1', title: '메뉴 사진 촬영', desc: '스마트폰으로 메뉴 사진 촬영 (자연광 권장)' },
                    { step: '2', title: 'Vision AI 분석', desc: 'AI가 음식의 색감, 재료, 분위기를 자동 분석' },
                    { step: '3', title: 'SEO 설명 생성', desc: '"부천 카페", "가성비" 등 키워드 자동 포함' },
                    { step: '4', title: '네이버 플레이스 등록', desc: '복사 후 메뉴 설명에 붙여넣기' },
                  ].map(item => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#EBF3FF] flex items-center justify-center flex-shrink-0 text-[#3182F6] text-xs font-bold">{item.step}</div>
                      <div>
                        <p className="text-[#191F28] text-xs font-bold">{item.title}</p>
                        <p className="text-[#8B95A1] text-xs mt-0.5">{item.desc}</p>
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
