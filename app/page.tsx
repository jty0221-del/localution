'use client';

import { useState } from 'react';
import {
  LayoutDashboard, Star, Users, Calculator, MapPin,
  MessageSquare, Bell, Settings, ChevronRight,
  TrendingUp, ShoppingBag, Zap, Menu,
  ArrowUpRight, ArrowDownRight, Crown, X, Copy, Check, Loader2
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: '대시보드', id: 'dashboard' },
  { icon: Star, label: 'AI 리뷰 · 마케팅', id: 'review', badge: '3' },
  { icon: Users, label: 'CRM · 고객관리', id: 'crm' },
  { icon: Calculator, label: '정산 · 행정', id: 'admin' },
  { icon: MapPin, label: '로컬 시너지', id: 'local' },
  { icon: MessageSquare, label: '커뮤니티', id: 'community' },
];

const stats = [
  { label: '이번달 매출', value: '4,820,000', unit: '원', change: '+12.4%', up: true, icon: TrendingUp, color: 'from-violet-600 to-purple-700' },
  { label: '신규 리뷰', value: '28', unit: '개', change: '+5개', up: true, icon: Star, color: 'from-pink-600 to-rose-600' },
  { label: '단골 고객', value: '142', unit: '명', change: '+8명', up: true, icon: Users, color: 'from-blue-600 to-cyan-600' },
  { label: '미수금', value: '320,000', unit: '원', change: '-2건', up: false, icon: Calculator, color: 'from-orange-500 to-amber-500' },
];

const recentReviews = [
  { platform: '네이버', name: '김지수', rating: 5, text: '음식이 너무 맛있어요! 사장님도 친절하시고 또 올게요 😊', time: '10분 전', replied: false },
  { platform: '배민', name: '박민준', rating: 4, text: '배달도 빠르고 양도 많아요. 가격 대비 최고!', time: '1시간 전', replied: true },
  { platform: '네이버', name: '이서연', rating: 5, text: '분위기 너무 좋고 커피도 맛있어요. 단골 될 것 같아요!', time: '3시간 전', replied: false },
];

const toneOptions = [
  { id: 'warm', label: '따뜻한 사장님', emoji: '🤗', desc: '친근하고 감사한 말투' },
  { id: 'pro', label: '전문 비즈니스', emoji: '💼', desc: '격식 있고 신뢰감 있는 말투' },
  { id: 'fun', label: '유쾌한 캐릭터', emoji: '😄', desc: '재미있고 개성 있는 말투' },
  { id: 'simple', label: '심플 & 깔끔', emoji: '✨', desc: '짧고 명확한 말투' },
];

type Review = { platform: string; name: string; rating: number; text: string; time: string; replied: boolean };

export default function Home() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [selectedTone, setSelectedTone] = useState('warm');
  const [generatedReply, setGeneratedReply] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reviews, setReviews] = useState(recentReviews);

  const openModal = (review: Review) => {
    setSelectedReview(review);
    setGeneratedReply('');
    setCopied(false);
  };

  const closeModal = () => {
    setSelectedReview(null);
    setGeneratedReply('');
  };

  const generateReply = async () => {
    if (!selectedReview) return;
    setIsLoading(true);
    setGeneratedReply('');

    const toneLabel = toneOptions.find(t => t.id === selectedTone)?.label || '따뜻한 사장님';

    try {
      // 🔑 Anthropic API 연동 포인트
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
          messages: [
            {
              role: 'user',
              content: `당신은 소상공인 가게 사장님입니다. 아래 고객 리뷰에 대해 "${toneLabel}" 말투로 진심 어린 답글을 작성해주세요.

플랫폼: ${selectedReview.platform}
고객명: ${selectedReview.name}
별점: ${selectedReview.rating}점
리뷰 내용: ${selectedReview.text}

규칙:
- 2~4문장으로 간결하게
- 고객 이름 직접 언급
- 구체적인 리뷰 내용에 반응
- 재방문 유도로 마무리
- 이모지 1~2개 자연스럽게 포함
- 답글만 출력 (설명 없이)`
            }
          ]
        })
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || '답글 생성에 실패했습니다.';
      setGeneratedReply(reply);
    } catch {
      setGeneratedReply('API 연결 오류가 발생했습니다. API 키를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyReply = () => {
    navigator.clipboard.writeText(generatedReply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const markAsReplied = () => {
    if (!selectedReview) return;
    setReviews(prev => prev.map(r =>
      r.name === selectedReview.name ? { ...r, replied: true } : r
    ));
    closeModal();
  };

  return (
    <div className="flex h-screen bg-[#0f0f13] overflow-hidden">

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* AI 답글 모달 */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                  <Zap size={14} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">AI 답글 생성기</h3>
                  <p className="text-gray-500 text-xs">Claude AI가 최적의 답글을 생성해요</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">

              {/* 리뷰 원문 */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    selectedReview.platform === '네이버' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>{selectedReview.platform}</span>
                  <span className="text-white text-sm font-medium">{selectedReview.name}</span>
                  <span className="text-yellow-400 text-xs">{'★'.repeat(selectedReview.rating)}</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{selectedReview.text}</p>
              </div>

              {/* 말투 선택 */}
              <div>
                <p className="text-gray-400 text-xs mb-2 font-medium">말투 선택</p>
                <div className="grid grid-cols-2 gap-2">
                  {toneOptions.map(tone => (
                    <button
                      key={tone.id}
                      onClick={() => setSelectedTone(tone.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedTone === tone.id
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-white/5 bg-white/3 hover:bg-white/5'
                      }`}
                    >
                      <div className="text-base mb-0.5">{tone.emoji} <span className="text-white text-xs font-medium">{tone.label}</span></div>
                      <p className="text-gray-500 text-xs">{tone.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 생성 버튼 */}
              <button
                onClick={generateReply}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> AI가 답글 생성 중...</>
                ) : (
                  <><Zap size={16} /> AI 답글 생성하기</>
                )}
              </button>

              {/* 생성된 답글 */}
              {generatedReply && (
                <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-violet-400 text-xs font-medium">✨ 생성된 답글</p>
                    <button
                      onClick={copyReply}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      {copied ? <><Check size={12} className="text-emerald-400" /> 복사됨!</> : <><Copy size={12} /> 복사</>}
                    </button>
                  </div>
                  <p className="text-white text-sm leading-relaxed">{generatedReply}</p>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={generateReply}
                      className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white text-xs transition-all"
                    >
                      다시 생성
                    </button>
                    <button
                      onClick={markAsReplied}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all"
                    >
                      답글 완료 처리 ✓
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 사이드바 */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-[#13131f] border-r border-white/5
        flex flex-col transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <MapPin size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-none">로컬루션</h1>
              <p className="text-violet-400 text-xs mt-0.5">Localution AI</p>
            </div>
          </div>
        </div>

        <div className="mx-4 mt-4 p-3 rounded-xl bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/20">
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-yellow-400" />
            <span className="text-xs text-white font-medium">PRO 멤버십</span>
            <span className="ml-auto text-xs text-violet-400">활성</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 mt-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveMenu(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="w-5 h-5 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight size={14} />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all">
            <Settings size={18} />
            <span className="text-sm font-medium">설정</span>
          </button>
          <div className="mt-3 px-3 py-2.5 rounded-xl bg-white/5">
            <p className="text-xs text-gray-400">하랑마케팅</p>
            <p className="text-sm text-white font-medium mt-0.5">전태영 사장님</p>
          </div>
        </div>
      </aside>

      {/* 메인 */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-[#0f0f13]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
                <Menu size={22} />
              </button>
              <div>
                <h2 className="text-white font-bold text-lg leading-none">대시보드</h2>
                <p className="text-gray-500 text-xs mt-1">2026년 4월 11일 · 부천 소사구</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                <Bell size={18} className="text-gray-400" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full"></span>
              </button>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-sm font-bold">
                전
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          <div className="rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 p-5 relative overflow-hidden">
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={16} className="text-yellow-300" />
                <span className="text-yellow-300 text-xs font-medium">AI 비서 활성화됨</span>
              </div>
              <h3 className="text-white font-bold text-xl">좋은 아침이에요, 전태영 사장님! ☀️</h3>
              <p className="text-white/70 text-sm mt-1">오늘 답변 안 된 리뷰가 <span className="text-yellow-300 font-bold">{reviews.filter(r => !r.replied).length}개</span> 있어요. AI 답글 달아드릴까요?</p>
              <button
                onClick={() => openModal(reviews.find(r => !r.replied)!)}
                className="mt-3 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-white text-sm font-medium transition-all"
              >
                AI 답글 바로 달기 →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl bg-[#13131f] border border-white/5 p-4 hover:border-violet-500/30 transition-all">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                    <Icon size={16} className="text-white" />
                  </div>
                  <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-white font-bold text-lg leading-none">{stat.value}</span>
                    <span className="text-gray-500 text-xs mb-0.5">{stat.unit}</span>
                  </div>
                  <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${stat.up ? 'text-emerald-400' : 'text-red-400'}`}>
                    {stat.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {stat.change}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl bg-[#13131f] border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">최근 리뷰</h3>
              <button className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                전체보기 <ChevronRight size={12} />
              </button>
            </div>
            <div className="space-y-3">
              {reviews.map((review, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/5 transition-all border border-white/5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        review.platform === '네이버' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>{review.platform}</span>
                      <span className="text-white text-sm font-medium">{review.name}</span>
                      <span className="text-yellow-400 text-xs">{'★'.repeat(review.rating)}</span>
                      <span className="text-gray-600 text-xs ml-auto">{review.time}</span>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed truncate">{review.text}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center">
                    {review.replied ? (
                      <span className="text-xs text-gray-600 bg-white/5 px-2 py-1 rounded-lg">답글 완료</span>
                    ) : (
                      <button
                        onClick={() => openModal(review)}
                        className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-2 py-1 rounded-lg transition-all whitespace-nowrap"
                      >
                        AI 답글
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#13131f] border border-white/5 p-5">
            <h3 className="text-white font-bold mb-4">빠른 실행</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: Star, label: 'AI 리뷰 답글', color: 'text-pink-400', bg: 'bg-pink-500/10' },
                { icon: MessageSquare, label: '알림톡 발송', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { icon: Calculator, label: '세금계산서', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { icon: ShoppingBag, label: '공동구매', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.label} className={`flex flex-col items-center gap-2 p-4 rounded-xl ${item.bg} hover:scale-105 transition-all border border-white/5`}>
                    <Icon size={22} className={item.color} />
                    <span className="text-white text-xs font-medium text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}