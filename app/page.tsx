'use client';

import { useState } from 'react';
import {
  TrendingUp, Star, MessageSquare, Users,
  ArrowUpRight, Zap, QrCode, Bell,
  ChevronRight, Sparkles, Clock, Loader2, Copy, Check
} from 'lucide-react';

const stats = [
  { label: '이번달 매출', value: '4,820,000원', change: '+11.6%', up: true, color: 'text-[#3182F6]', bg: 'bg-[#EBF3FF]', icon: TrendingUp },
  { label: '전체 리뷰', value: '284개', change: '+12', up: true, color: 'text-[#00C073]', bg: 'bg-[#E8FBF3]', icon: Star },
  { label: '미답변 리뷰', value: '3개', change: '빠른 처리 필요', up: false, color: 'text-[#F04452]', bg: 'bg-[#FFF0F2]', icon: MessageSquare },
  { label: '이번달 고객', value: '1,247명', change: '+8.3%', up: true, color: 'text-[#8B5CF6]', bg: 'bg-[#F3EEFF]', icon: Users },
];

const recentReviews = [
  { name: '김지수', platform: '네이버', rating: 5, text: '부천 맛집 찾다가 여기 발견했는데 진짜 맛있어요!', time: '10분 전', replied: false },
  { name: '박민준', platform: '배민', rating: 4, text: '배달도 빠르고 양도 많아요. 따뜻하게 도착했어요.', time: '1시간 전', replied: true },
  { name: '이서연', platform: '네이버', rating: 5, text: '회식장소로 딱이에요! 단체석도 있고 음식도 맛있어요.', time: '3시간 전', replied: false },
];

const quickActions = [
  { label: 'AI 답글 생성', icon: Sparkles, href: '/review-admin', color: 'bg-[#EBF3FF] text-[#3182F6]' },
  { label: 'QR 리뷰 관리', icon: QrCode, href: '/qr-admin', color: 'bg-[#E8FBF3] text-[#00C073]' },
  { label: '세금계산서', icon: TrendingUp, href: '/admin-biz', color: 'bg-[#FFF3E0] text-[#FF9500]' },
  { label: '고객 관리', icon: Users, href: '/crm', color: 'bg-[#F3EEFF] text-[#8B5CF6]' },
];

const toneOptions = [
  { id: 'warm', emoji: '🤗', label: '따뜻한 사장님' },
  { id: 'pro', emoji: '💼', label: '전문 비즈니스' },
  { id: 'fun', emoji: '😄', label: '유쾌한 캐릭터' },
  { id: 'simple', emoji: '✨', label: '심플 & 깔끔' },
];

export default function Dashboard() {
  const [selectedReview, setSelectedReview] = useState<typeof recentReviews[0] | null>(null);
  const [selectedTone, setSelectedTone] = useState('warm');
  const [generatedReply, setGeneratedReply] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const generateReply = async () => {
    if (!selectedReview) return;
    setIsGenerating(true);
    setGeneratedReply('');

    const toneGuide: Record<string, string> = {
      warm: '따뜻하고 친근한 사장님 말투',
      pro: '격식 있고 신뢰감 있는 비즈니스 말투',
      fun: '유쾌하고 재미있는 말투',
      simple: '짧고 명확한 말투',
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
            content: `소상공인 카페 사장님으로서 ${toneGuide[selectedTone]}로 답글을 작성해주세요.
고객: ${selectedReview.name} / 플랫폼: ${selectedReview.platform} / 별점: ${selectedReview.rating}점
리뷰: ${selectedReview.text}
규칙: 2~3문장, 고객 이름 언급, 재방문 유도, 답글만 출력`
          }]
        })
      });
      const data = await response.json();
      setGeneratedReply(data.content?.[0]?.text || '생성 실패');
    } catch {
      setGeneratedReply('API 연결 오류');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyReply = () => {
    navigator.clipboard.writeText(generatedReply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFB] p-6 max-w-5xl mx-auto">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[#191F28] font-black text-2xl">안녕하세요, 전태영 사장님 👋</h1>
          <p className="text-[#8B95A1] text-sm mt-1">오늘도 로컬루션과 함께 스마트하게 운영해요</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative w-10 h-10 rounded-xl bg-white border border-[#E5EAF2] flex items-center justify-center hover:bg-[#F8FAFB] transition-all">
            <Bell size={18} className="text-[#8B95A1]" />
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F04452]" />
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl p-4 border border-[#E5EAF2] hover:shadow-sm transition-all">
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={stat.color} />
              </div>
              <p className="text-[#191F28] font-black text-lg leading-none">{stat.value}</p>
              <p className="text-[#8B95A1] text-xs mt-1">{stat.label}</p>
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${stat.up ? 'text-[#00C073]' : 'text-[#F04452]'}`}>
                {stat.up && <ArrowUpRight size={12} />}
                {stat.change}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* 최근 리뷰 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5EAF2] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5EAF2]">
            <div className="flex items-center gap-2">
              <h2 className="text-[#191F28] font-bold text-sm">최근 리뷰</h2>
              <span className="bg-[#FFF0F2] text-[#F04452] text-xs px-2 py-0.5 rounded-full font-bold">미답변 3</span>
            </div>
            <button className="text-[#3182F6] text-xs font-medium flex items-center gap-1 hover:opacity-70 transition-all">
              전체보기 <ChevronRight size={12} />
            </button>
          </div>

          <div className="divide-y divide-[#F2F4F6]">
            {recentReviews.map((review, i) => (
              <div key={i} className="px-5 py-4 hover:bg-[#F8FAFB] transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        review.platform === '네이버' ? 'bg-[#E8FBF3] text-[#00C073]' : 'bg-[#EBF3FF] text-[#3182F6]'
                      }`}>{review.platform}</span>
                      <span className="text-[#191F28] text-sm font-bold">{review.name}</span>
                      <span className="text-amber-400 text-xs">{'★'.repeat(review.rating)}</span>
                      <span className="text-[#B0B8C1] text-xs ml-auto flex items-center gap-1">
                        <Clock size={10} />{review.time}
                      </span>
                    </div>
                    <p className="text-[#8B95A1] text-sm leading-relaxed line-clamp-1">{review.text}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {!review.replied ? (
                    <button
                      onClick={() => { setSelectedReview(review); setShowModal(true); setGeneratedReply(''); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3182F6] hover:bg-[#1B6EF3] text-white text-xs font-bold rounded-lg transition-all">
                      <Zap size={11} />AI 답글 생성
                    </button>
                  ) : (
                    <span className="text-xs text-[#B0B8C1] bg-[#F2F4F6] px-3 py-1.5 rounded-lg">답글 완료</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 빠른 실행 */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
            <h2 className="text-[#191F28] font-bold text-sm mb-4">빠른 실행</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(action => {
                const Icon = action.icon;
                return (
                  <a key={action.label} href={action.href}
                    className="flex flex-col items-center gap-2 p-3.5 rounded-xl bg-[#F8FAFB] hover:bg-[#F2F4F6] transition-all border border-[#E5EAF2]">
                    <div className={`w-9 h-9 rounded-xl ${action.color} flex items-center justify-center`}>
                      <Icon size={18} />
                    </div>
                    <span className="text-[#191F28] text-xs font-medium text-center leading-tight">{action.label}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* 오늘의 알림 */}
          <div className="bg-gradient-to-br from-[#3182F6] to-[#1B6EF3] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-white" />
              <p className="text-white font-bold text-sm">AI 인사이트</p>
            </div>
            <p className="text-blue-100 text-xs leading-relaxed">
              오늘 미답변 리뷰 3개가 있어요. 빠른 답글이 네이버 플레이스 상위 노출에 도움돼요!
            </p>
            <button className="mt-3 w-full py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all">
              지금 답글 달기 →
            </button>
          </div>
        </div>
      </div>

      {/* AI 답글 모달 */}
      {showModal && selectedReview && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[#E5EAF2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-[#3182F6]" />
                <h3 className="text-[#191F28] font-bold text-sm">AI 답글 생성</h3>
              </div>
              <button onClick={() => { setShowModal(false); setGeneratedReply(''); }}
                className="w-7 h-7 rounded-lg bg-[#F2F4F6] flex items-center justify-center hover:bg-[#E5EAF2] transition-all text-[#8B95A1] text-sm">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* 리뷰 내용 */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFB] border border-[#E5EAF2]">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[#191F28] text-xs font-bold">{selectedReview.name}</span>
                  <span className="text-amber-400 text-xs">{'★'.repeat(selectedReview.rating)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    selectedReview.platform === '네이버' ? 'bg-[#E8FBF3] text-[#00C073]' : 'bg-[#EBF3FF] text-[#3182F6]'
                  }`}>{selectedReview.platform}</span>
                </div>
                <p className="text-[#8B95A1] text-xs leading-relaxed">{selectedReview.text}</p>
              </div>

              {/* 말투 선택 */}
              <div>
                <p className="text-[#191F28] text-xs font-bold mb-2">말투 선택</p>
                <div className="grid grid-cols-2 gap-2">
                  {toneOptions.map(t => (
                    <button key={t.id} onClick={() => setSelectedTone(t.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                        selectedTone === t.id
                          ? 'border-[#3182F6] bg-[#EBF3FF]'
                          : 'border-[#E5EAF2] hover:bg-[#F8FAFB]'
                      }`}>
                      <span className="text-base">{t.emoji}</span>
                      <p className={`text-xs font-bold ${selectedTone === t.id ? 'text-[#3182F6]' : 'text-[#191F28]'}`}>{t.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={generateReply} disabled={isGenerating}
                className="w-full py-3.5 rounded-xl bg-[#3182F6] hover:bg-[#1B6EF3] disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
                {isGenerating ? <><Loader2 size={15} className="animate-spin" />생성 중...</> : <><Sparkles size={15} />AI 답글 생성</>}
              </button>

              {generatedReply && (
                <div className="p-4 rounded-xl bg-[#F8FAFB] border border-[#E5EAF2]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#3182F6] text-xs font-bold">✨ 생성된 답글</span>
                    <button onClick={copyReply} className="flex items-center gap-1 text-xs text-[#8B95A1] hover:text-[#191F28]">
                      {copied ? <><Check size={11} className="text-[#00C073]" />복사됨!</> : <><Copy size={11} />복사</>}
                    </button>
                  </div>
                  <p className="text-[#191F28] text-sm leading-relaxed">{generatedReply}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={generateReply} className="flex-1 py-2 rounded-lg border border-[#E5EAF2] text-[#8B95A1] hover:text-[#191F28] text-xs transition-all">
                      다시 생성
                    </button>
                    <button onClick={copyReply} className="flex-1 py-2 rounded-lg bg-[#00C073] hover:bg-[#00A85A] text-white text-xs font-bold transition-all">
                      복사 후 등록 ✓
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
