'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import {
  QrCode, Download, Star, Target, Zap,
  Plus, X, Check, Gift, Eye, BarChart2, Repeat2,
  Sparkles, ShieldCheck, ToggleLeft, ToggleRight
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const lineData = [
  { day: '4/1', 스캔: 3, 전환: 1 },
  { day: '4/3', 스캔: 7, 전환: 4 },
  { day: '4/5', 스캔: 5, 전환: 3 },
  { day: '4/7', 스캔: 12, 전환: 8 },
  { day: '4/9', 스캔: 9, 전환: 6 },
  { day: '4/11', 스캔: 18, 전환: 13 },
];

const donutData = [
  { name: '전환 완료', value: 35, color: '#7c3aed' },
  { name: '작성 중', value: 15, color: '#a78bfa' },
  { name: '이탈', value: 12, color: '#1e1b4b' },
];

const toneOptions = [
  { id: 'gen-z', emoji: '🔥', label: 'Z세대 감성', desc: '힙하고 트렌디한 말투' },
  { id: 'mom', emoji: '💛', label: '맘카페 찐후기', desc: '따뜻하고 신뢰감 있는 말투' },
  { id: 'gourmet', emoji: '🍷', label: '진지한 미식가', desc: '격조 있고 전문적인 말투' },
];

const rewardPresets = [
  '로컬루션 포인트 2,000P',
  '음료 1병 무료 쿠폰',
  '다음 방문 10% 할인',
  '사이드 메뉴 서비스',
];

export default function QRAdminPage() {
  const [mainKeyword, setMainKeyword] = useState('부천 맛집');
  const [subInput, setSubInput] = useState('');
  const [subKeywords, setSubKeywords] = useState(['가성비', '회식장소']);
  const [selectedTone, setSelectedTone] = useState('gen-z');
  const [rewardEnabled, setRewardEnabled] = useState(true);
  const [rewardText, setRewardText] = useState('로컬루션 포인트 2,000P');
  const [qrCopied, setQrCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const addSubKeyword = () => {
    if (subInput.trim() && subKeywords.length < 3) {
      setSubKeywords([...subKeywords, subInput.trim()]);
      setSubInput('');
    }
  };

  const removeSubKeyword = (idx: number) => {
    setSubKeywords(subKeywords.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleQRDownload = () => {
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2000);
    alert('QR 텐트카드 다운로드 시작!\n(실제 연동 시 PDF/PNG 생성)');
  };

  const previewText = `📸 영수증 사진 한 장으로\n네이버 리뷰를 완성해 드려요!\n\n리뷰 작성 완료 시\n${rewardEnabled ? `🎁 ${rewardText} 지급` : '감사한 마음을 전합니다 😊'}`;

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white pb-20">

      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-[#0f0f13]/90 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <div className="flex items-center gap-2">
              <QrCode size={18} className="text-violet-400" />
              <h1 className="font-bold text-base">QR 리뷰 컨트롤 타워</h1>
            </div>
            <p className="text-gray-500 text-xs mt-0.5">AI 리뷰 자동화 세팅</p>
          </div>
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              saved
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25'
            }`}
          >
            {saved ? <><Check size={14} /> 저장됨!</> : <><ShieldCheck size={14} /> 저장</>}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-6 space-y-5">

        {/* SECTION 1: SEO 키워드 */}
        <div className="rounded-2xl bg-[#13131f] border border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Target size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">SEO 키워드 세팅</h2>
              <p className="text-gray-500 text-xs">AI가 리뷰에 자동으로 키워드를 녹여드려요</p>
            </div>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium border border-violet-500/20">핵심 설정</span>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">메인 타겟 키워드</label>
              <div className="relative">
                <input
                  value={mainKeyword}
                  onChange={(e) => setMainKeyword(e.target.value)}
                  placeholder="예: 부천 맛집, 신중동 고깃집"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Sparkles size={14} className="text-violet-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">서브 키워드 <span className="text-gray-600 font-normal">(최대 3개)</span></label>
              <div className="flex gap-2 mb-3 flex-wrap">
                {subKeywords.map((kw, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/15 text-violet-300 text-xs font-medium border border-violet-500/20">
                    #{kw}
                    <button onClick={() => removeSubKeyword(i)}><X size={11} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={subInput}
                  onChange={(e) => setSubInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubKeyword()}
                  placeholder="예: 가성비, 회식장소"
                  disabled={subKeywords.length >= 3}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all disabled:opacity-40"
                />
                <button onClick={addSubKeyword} disabled={subKeywords.length >= 3 || !subInput.trim()} className="px-3 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 transition-all">
                  <Plus size={16} className="text-white" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">리뷰 톤앤매너</label>
              <div className="space-y-2">
                {toneOptions.map((tone) => (
                  <button key={tone.id} onClick={() => setSelectedTone(tone.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                      selectedTone === tone.id ? 'border-violet-500 bg-violet-500/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/5'
                    }`}
                  >
                    <span className="text-xl">{tone.emoji}</span>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{tone.label}</p>
                      <p className="text-gray-500 text-xs">{tone.desc}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 transition-all ${selectedTone === tone.id ? 'border-violet-500 bg-violet-500' : 'border-gray-600'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: 고객 보상 */}
        <div className="rounded-2xl bg-[#13131f] border border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Gift size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">고객 보상 세팅</h2>
              <p className="text-gray-500 text-xs">리뷰 완료 시 고객에게 지급할 혜택</p>
            </div>
            <button onClick={() => setRewardEnabled(!rewardEnabled)} className="ml-auto">
              {rewardEnabled ? <ToggleRight size={28} className="text-violet-400" /> : <ToggleLeft size={28} className="text-gray-600" />}
            </button>
          </div>

          <div className={`p-5 space-y-4 transition-opacity ${rewardEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">빠른 선택</label>
              <div className="flex flex-wrap gap-2">
                {rewardPresets.map((preset) => (
                  <button key={preset} onClick={() => setRewardText(preset)}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                      rewardText === preset ? 'border-pink-500 bg-pink-500/15 text-pink-300' : 'border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >{preset}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">직접 입력</label>
              <input value={rewardText} onChange={(e) => setRewardText(e.target.value)}
                placeholder="예: 아메리카노 1잔 무료"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Eye size={13} className="text-gray-400" />
                <label className="text-xs font-semibold text-gray-400">고객 화면 미리보기</label>
              </div>
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-5">
                <div className="w-8 h-1 bg-white/20 rounded-full mx-auto mb-4" />
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/30">
                    <QrCode size={24} className="text-white" />
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-white text-sm font-medium whitespace-pre-line leading-relaxed">{previewText}</p>
                  </div>
                  <div className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold">
                    📸 영수증 찍고 리뷰 작성하기
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: QR 발급 */}
        <div className="rounded-2xl bg-[#13131f] border border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <QrCode size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">QR 코드 발급</h2>
              <p className="text-gray-500 text-xs">테이블 비치용 텐트카드 다운로드</p>
            </div>
          </div>

          <div className="p-5">
            <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <p className="text-amber-300 text-sm font-medium leading-relaxed">
                🏆 이 QR을 테이블에 붙여두기만 하면<br />
                <span className="text-white font-bold">리뷰가 자동으로 쏟아집니다!</span>
              </p>
              <p className="text-gray-500 text-xs mt-1.5">고객이 QR 스캔 → 영수증 촬영 → AI 리뷰 생성 → 네이버 복붙</p>
            </div>

            <div className="flex gap-4 items-center mb-5">
              <div className="w-28 h-28 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 shadow-lg">
                <div className="grid grid-cols-3 gap-0.5 p-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className={`w-6 h-6 rounded-sm ${i !== 4 ? 'bg-gray-900' : 'bg-gray-200'}`} />
                  ))}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-xs text-gray-500">매장명</p>
                  <p className="text-white text-sm font-medium">하랑마케팅 카페</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-xs text-gray-500">메인 키워드</p>
                  <p className="text-violet-400 text-sm font-medium">{mainKeyword}</p>
                </div>
              </div>
            </div>

            <button onClick={handleQRDownload}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95"
            >
              {qrCopied ? <><Check size={16} /> 다운로드 완료!</> : <><Download size={16} /> 텐트카드 디자인 다운로드</>}
            </button>
            <p className="text-center text-xs text-gray-600 mt-2">PNG + PDF 동시 제공 · 인쇄 즉시 가능</p>
          </div>
        </div>

        {/* SECTION 4: 성과 리포트 */}
        <div className="rounded-2xl bg-[#13131f] border border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <BarChart2 size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">이번 달 성과 리포트</h2>
              <p className="text-gray-500 text-xs">QR 리뷰 자동화 성과</p>
            </div>
            <span className="ml-auto text-xs text-emerald-400 font-medium">2026년 4월</span>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'QR 스캔', value: '62', unit: '회', icon: QrCode, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                { label: '전환 완료', value: '35', unit: '건', icon: Repeat2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'SEO 리뷰', value: '128', unit: '개', icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className={`${item.bg} rounded-2xl p-3 text-center border border-white/5`}>
                    <Icon size={18} className={`${item.color} mx-auto mb-1.5`} />
                    <p className="text-white font-bold text-xl leading-none">{item.value}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{item.unit}</p>
                    <p className="text-gray-400 text-xs mt-1 font-medium">{item.label}</p>
                  </div>
                );
              })}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-white">일별 스캔 & 전환 추이</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />스캔</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />전환</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={lineData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: '#a78bfa' }} />
                  <Line type="monotone" dataKey="스캔" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="전환" stroke="#34d399" strokeWidth={2.5} dot={{ fill: '#34d399', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-3">전환율 분석</p>
              <div className="flex items-center gap-4">
                <PieChart width={120} height={120}>
                  <Pie data={donutData} cx={55} cy={55} innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                    {donutData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                </PieChart>
                <div className="flex-1 space-y-2.5">
                  {donutData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-gray-400 text-xs flex-1">{item.name}</span>
                      <span className="text-white text-xs font-bold">{item.value}건</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-xs text-gray-500">전환율</p>
                    <p className="text-emerald-400 font-bold text-lg">56.5%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/15">
              <div className="flex items-start gap-2">
                <Zap size={15} className="text-violet-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-xs font-semibold mb-1">AI 인사이트</p>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    <span className="text-violet-300 font-medium">'가성비'</span> 키워드가 포함된 리뷰의 전환율이
                    평균 대비 <span className="text-emerald-400 font-bold">+23%</span> 높아요. 서브 키워드 우선순위를 높여보세요!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
