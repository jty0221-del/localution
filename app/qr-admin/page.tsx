'use client';

import { useState } from 'react';
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
  { name: '전환 완료', value: 35, color: '#3182F6' },
  { name: '작성 중', value: 15, color: '#93C5FD' },
  { name: '이탈', value: 12, color: '#E5EAF2' },
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

const REVIEW_URL = 'https://localution-6sv7.vercel.app/review/a51a7a5f-35bf-4543-95fa-8f8435d34c31';

export default function QRAdminPage() {
  const [mainKeyword, setMainKeyword] = useState('부천 맛집');
  const [subInput, setSubInput] = useState('');
  const [subKeywords, setSubKeywords] = useState(['가성비', '회식장소']);
  const [selectedTone, setSelectedTone] = useState('gen-z');
  const [rewardEnabled, setRewardEnabled] = useState(true);
  const [rewardText, setRewardText] = useState('로컬루션 포인트 2,000P');
  const [qrDone, setQrDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

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
    setQrDone(true);
    setTimeout(() => setQrDone(false), 2000);
    alert('QR 텐트카드 다운로드 시작!\n(실제 연동 시 PDF/PNG 생성)');
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(REVIEW_URL);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const previewText = `📸 영수증 사진 한 장으로\n네이버 리뷰를 완성해 드려요!\n\n리뷰 작성 완료 시\n${rewardEnabled ? `🎁 ${rewardText} 지급` : '감사한 마음을 전합니다 😊'}`;

  return (
    <div className="min-h-screen bg-[#F8FAFB] pb-20">

      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <div className="flex items-center gap-2">
              <QrCode size={18} className="text-[#3182F6]" />
              <h1 className="font-bold text-base text-[#191F28]">QR 리뷰 컨트롤 타워</h1>
            </div>
            <p className="text-[#8B95A1] text-xs mt-0.5">AI 리뷰 자동화 세팅</p>
          </div>
          <button onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              saved
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-[#3182F6] text-white shadow-sm shadow-blue-200'
            }`}>
            {saved ? <><Check size={14} /> 저장됨!</> : <><ShieldCheck size={14} /> 저장</>}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-6 space-y-4">

        {/* SECTION 1: SEO 키워드 */}
        <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#EBF3FF] flex items-center justify-center">
              <Target size={15} className="text-[#3182F6]" />
            </div>
            <div>
              <h2 className="text-[#191F28] font-bold text-sm">SEO 키워드 세팅</h2>
              <p className="text-[#8B95A1] text-xs">AI가 리뷰에 자동으로 키워드를 녹여드려요</p>
            </div>
            <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-[#EBF3FF] text-[#3182F6] font-semibold">핵심 설정</span>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#8B95A1] mb-2">메인 타겟 키워드</label>
              <div className="relative">
                <input value={mainKeyword} onChange={(e) => setMainKeyword(e.target.value)}
                  placeholder="예: 부천 맛집, 신중동 고깃집"
                  className="w-full bg-[#F8FAFB] border border-gray-200 rounded-xl px-4 py-3 text-[#191F28] text-sm placeholder-[#B0B8C1] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#EBF3FF] transition-all" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Sparkles size={14} className="text-[#3182F6]" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B95A1] mb-2">서브 키워드 <span className="text-[#B0B8C1] font-normal">(최대 3개)</span></label>
              <div className="flex gap-2 mb-3 flex-wrap">
                {subKeywords.map((kw, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EBF3FF] text-[#3182F6] text-xs font-semibold border border-blue-100">
                    #{kw}
                    <button onClick={() => removeSubKeyword(i)}><X size={11} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={subInput} onChange={(e) => setSubInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubKeyword()}
                  placeholder="예: 가성비, 회식장소"
                  disabled={subKeywords.length >= 3}
                  className="flex-1 bg-[#F8FAFB] border border-gray-200 rounded-xl px-4 py-2.5 text-[#191F28] text-sm placeholder-[#B0B8C1] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#EBF3FF] transition-all disabled:opacity-40" />
                <button onClick={addSubKeyword} disabled={subKeywords.length >= 3 || !subInput.trim()}
                  className="px-3 py-2.5 rounded-xl bg-[#3182F6] hover:bg-[#1B6EF3] disabled:opacity-30 transition-all">
                  <Plus size={16} className="text-white" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B95A1] mb-2">리뷰 톤앤매너</label>
              <div className="space-y-2">
                {toneOptions.map((tone) => (
                  <button key={tone.id} onClick={() => setSelectedTone(tone.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                      selectedTone === tone.id
                        ? 'border-[#3182F6] bg-[#EBF3FF]'
                        : 'border-gray-100 bg-[#F8FAFB] hover:border-gray-200'
                    }`}>
                    <span className="text-xl">{tone.emoji}</span>
                    <div className="flex-1">
                      <p className="text-[#191F28] text-sm font-semibold">{tone.label}</p>
                      <p className="text-[#8B95A1] text-xs">{tone.desc}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 transition-all ${selectedTone === tone.id ? 'border-[#3182F6] bg-[#3182F6]' : 'border-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: 고객 보상 */}
        <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center">
              <Gift size={15} className="text-pink-500" />
            </div>
            <div>
              <h2 className="text-[#191F28] font-bold text-sm">고객 보상 세팅</h2>
              <p className="text-[#8B95A1] text-xs">리뷰 완료 시 고객에게 지급할 혜택</p>
            </div>
            <button onClick={() => setRewardEnabled(!rewardEnabled)} className="ml-auto">
              {rewardEnabled
                ? <ToggleRight size={28} className="text-[#3182F6]" />
                : <ToggleLeft size={28} className="text-gray-300" />}
            </button>
          </div>
          <div className={`p-5 space-y-4 transition-opacity ${rewardEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <div>
              <label className="block text-xs font-semibold text-[#8B95A1] mb-2">빠른 선택</label>
              <div className="flex flex-wrap gap-2">
                {rewardPresets.map((preset) => (
                  <button key={preset} onClick={() => setRewardText(preset)}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition-all font-medium ${
                      rewardText === preset
                        ? 'border-[#3182F6] bg-[#EBF3FF] text-[#3182F6]'
                        : 'border-gray-200 text-[#8B95A1] hover:text-[#191F28] hover:border-gray-300'
                    }`}>{preset}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B95A1] mb-2">직접 입력</label>
              <input value={rewardText} onChange={(e) => setRewardText(e.target.value)}
                placeholder="예: 아메리카노 1잔 무료"
                className="w-full bg-[#F8FAFB] border border-gray-200 rounded-xl px-4 py-3 text-[#191F28] text-sm placeholder-[#B0B8C1] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#EBF3FF] transition-all" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Eye size={13} className="text-[#8B95A1]" />
                <label className="text-xs font-semibold text-[#8B95A1]">고객 화면 미리보기</label>
              </div>
              <div className="rounded-2xl overflow-hidden border border-gray-100 bg-gradient-to-br from-[#EBF3FF] to-[#DBEAFE] p-5">
                <div className="w-8 h-1 bg-blue-200 rounded-full mx-auto mb-4" />
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#3182F6] flex items-center justify-center mx-auto shadow-lg shadow-blue-200">
                    <QrCode size={24} className="text-white" />
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm">
                    <p className="text-[#191F28] text-sm font-medium whitespace-pre-line leading-relaxed">{previewText}</p>
                  </div>
                  <div className="w-full py-3 rounded-xl bg-[#3182F6] text-white text-sm font-bold shadow-sm">
                    📸 영수증 찍고 리뷰 작성하기
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: QR 발급 */}
        <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <QrCode size={15} className="text-amber-500" />
            </div>
            <div>
              <h2 className="text-[#191F28] font-bold text-sm">QR 코드 발급</h2>
              <p className="text-[#8B95A1] text-xs">테이블 비치용 텐트카드 다운로드</p>
            </div>
          </div>
          <div className="p-5">
            <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-amber-700 text-sm font-semibold leading-relaxed">
                🏆 이 QR을 테이블에 붙여두기만 하면<br />
                <span className="text-[#191F28] font-bold">리뷰가 자동으로 쏟아집니다!</span>
              </p>
              <p className="text-[#8B95A1] text-xs mt-1.5">고객이 QR 스캔 → 영수증 촬영 → AI 리뷰 생성 → 네이버 복붙</p>
            </div>

            <div className="flex gap-4 items-center mb-5">
              <div className="w-32 h-32 rounded-2xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm p-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(REVIEW_URL)}`}
                  alt="QR Code"
                  className="w-full h-full"
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="p-2.5 rounded-xl bg-[#F8FAFB] border border-gray-100">
                  <p className="text-xs text-[#8B95A1]">매장명</p>
                  <p className="text-[#191F28] text-sm font-semibold">하랑마케팅 카페</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F8FAFB] border border-gray-100">
                  <p className="text-xs text-[#8B95A1]">메인 키워드</p>
                  <p className="text-[#3182F6] text-sm font-semibold">{mainKeyword}</p>
                </div>
              </div>
            </div>

            <button onClick={handleCopyUrl}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#F8FAFB] border border-gray-200 text-sm text-[#8B95A1] hover:text-[#191F28] hover:border-gray-300 mb-3 transition-all font-medium">
              {urlCopied
                ? <><Check size={15} className="text-emerald-500" /> URL 복사됨!</>
                : <><Star size={15} /> 리뷰 페이지 URL 복사</>}
            </button>

            <button onClick={handleQRDownload}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#3182F6] hover:bg-[#1B6EF3] text-white font-bold text-sm transition-all shadow-sm active:scale-95">
              {qrDone ? <><Check size={16} /> 완료!</> : <><Download size={16} /> 텐트카드 디자인 다운로드</>}
            </button>
            <p className="text-center text-xs text-[#B0B8C1] mt-2">고객이 스캔하면 → 리뷰 작성 페이지로 바로 이동</p>
          </div>
        </div>

        {/* SECTION 4: 성과 리포트 */}
        <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <BarChart2 size={15} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-[#191F28] font-bold text-sm">이번 달 성과 리포트</h2>
              <p className="text-[#8B95A1] text-xs">QR 리뷰 자동화 성과</p>
            </div>
            <span className="ml-auto text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">2026년 4월</span>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'QR 스캔', value: '62', unit: '회', icon: QrCode, color: 'text-[#3182F6]', bg: 'bg-[#EBF3FF]' },
                { label: '전환 완료', value: '35', unit: '건', icon: Repeat2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { label: 'SEO 리뷰', value: '128', unit: '개', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className={`${item.bg} rounded-2xl p-3 text-center border border-gray-100`}>
                    <Icon size={18} className={`${item.color} mx-auto mb-1.5`} />
                    <p className="text-[#191F28] font-black text-xl leading-none">{item.value}</p>
                    <p className="text-[#8B95A1] text-xs mt-0.5">{item.unit}</p>
                    <p className="text-[#8B95A1] text-xs mt-1 font-medium">{item.label}</p>
                  </div>
                );
              })}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-[#191F28]">일별 스캔 & 전환 추이</p>
                <div className="flex items-center gap-3 text-xs text-[#8B95A1]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3182F6] inline-block" />스캔</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />전환</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={lineData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" />
                  <XAxis dataKey="day" tick={{ fill: '#8B95A1', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8B95A1', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E5EAF2', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} labelStyle={{ color: '#3182F6' }} />
                  <Line type="monotone" dataKey="스캔" stroke="#3182F6" strokeWidth={2.5} dot={{ fill: '#3182F6', r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="전환" stroke="#34d399" strokeWidth={2.5} dot={{ fill: '#34d399', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <p className="text-sm font-bold text-[#191F28] mb-3">전환율 분석</p>
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
                      <span className="text-[#8B95A1] text-xs flex-1">{item.name}</span>
                      <span className="text-[#191F28] text-xs font-bold">{item.value}건</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-[#8B95A1]">전환율</p>
                    <p className="text-emerald-500 font-black text-lg">56.5%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#EBF3FF] border border-blue-100">
              <div className="flex items-start gap-2">
                <Zap size={15} className="text-[#3182F6] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[#191F28] text-xs font-bold mb-1">AI 인사이트</p>
                  <p className="text-[#8B95A1] text-xs leading-relaxed">
                    <span className="text-[#3182F6] font-semibold">'가성비'</span> 키워드가 포함된 리뷰의 전환율이 평균 대비 <span className="text-emerald-600 font-bold">+23%</span> 높아요!
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
