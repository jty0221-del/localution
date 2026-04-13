'use client';

import { useState } from 'react';
import {
  Users, Search, Plus, Send, Star,
  Phone, MessageCircle, Clock, Shield,
  ChevronRight, Bell, Loader2, Check, X,
  Crown, Heart
} from 'lucide-react';

const customers = [
  { id: 1, name: '김지수', phone: '010-1234-5678', email: 'jisu@naver.com', visits: 12, totalSpent: 156000, lastVisit: '2026-04-10', tags: ['VIP', '단골'], rating: 5, memo: '자몽에이드 단골, 오전 방문 선호', blacklist: false },
  { id: 2, name: '박민준', phone: '010-2345-6789', email: 'minjun@gmail.com', visits: 8, totalSpent: 98000, lastVisit: '2026-04-09', tags: ['배달', '단골'], rating: 4, memo: '배달 전문 고객', blacklist: false },
  { id: 3, name: '이서연', phone: '010-3456-7890', email: 'seoyeon@naver.com', visits: 5, totalSpent: 67000, lastVisit: '2026-04-08', tags: ['신규'], rating: 5, memo: '회식 예약 문의 많음', blacklist: false },
  { id: 4, name: '최동현', phone: '010-4567-8901', email: 'donghyun@daum.net', visits: 3, totalSpent: 38000, lastVisit: '2026-03-20', tags: ['일반'], rating: 3, memo: '', blacklist: false },
  { id: 5, name: '정민서', phone: '010-5678-9012', email: 'minseo@naver.com', visits: 1, totalSpent: 15000, lastVisit: '2026-03-01', tags: ['블랙리스트'], rating: 1, memo: '노쇼 3회, 환불 분쟁', blacklist: true },
];

const tagColors: Record<string, string> = {
  'VIP': 'bg-amber-50 text-amber-600 border-amber-200',
  '단골': 'bg-blue-50 text-blue-600 border-blue-100',
  '배달': 'bg-purple-50 text-purple-600 border-purple-100',
  '신규': 'bg-green-50 text-green-600 border-green-100',
  '일반': 'bg-gray-50 text-gray-500 border-gray-200',
  '블랙리스트': 'bg-red-50 text-red-500 border-red-100',
};

const messageTemplates = [
  { id: 1, name: '감사 인사', content: '{고객명}님, 안녕하세요! 하랑마케팅 카페입니다 😊\n오늘도 방문해주셔서 감사해요. 다음 방문 시 아메리카노 1잔 무료 제공해드릴게요!' },
  { id: 2, name: 'VIP 혜택', content: '{고객명}님, 안녕하세요!\nVIP 고객님께 특별 혜택 안내드려요. 이번 달 전 메뉴 10% 할인 + 무료 업그레이드 서비스를 제공해드립니다 🎁' },
  { id: 3, name: '재방문 유도', content: '{고객명}님, 오랫동안 뵙지 못해 그립네요 😢\n신메뉴가 출시됐어요! 이번 주 방문하시면 신메뉴 20% 할인 쿠폰 드릴게요.' },
  { id: 4, name: '이벤트 안내', content: '{고객명}님, 안녕하세요!\n이번 주말 특별 이벤트를 진행해요 🎉\n친구와 함께 방문 시 1+1 혜택 제공!' },
];

export default function CRMPage() {
  const [activeTab, setActiveTab] = useState<'customers' | 'message' | 'schedule' | 'blacklist'>('customers');
  const [searchText, setSearchText] = useState('');
  const [selectedTag, setSelectedTag] = useState('전체');
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof messageTemplates[0] | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendDone, setSendDone] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const allTags = ['전체', 'VIP', '단골', '신규', '일반', '블랙리스트'];

  const filteredCustomers = customers.filter(c => {
    const matchSearch = c.name.includes(searchText) || c.phone.includes(searchText);
    const matchTag = selectedTag === '전체' || c.tags.includes(selectedTag);
    if (activeTab === 'blacklist') return c.blacklist && matchSearch;
    return !c.blacklist && matchSearch && matchTag;
  });

  const toggleCustomer = (id: number) => {
    setSelectedCustomers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSendMessage = async () => {
    if (!customMessage || selectedCustomers.length === 0) return;
    setIsSending(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsSending(false);
    setSendDone(true);
    setTimeout(() => setSendDone(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFB]">

      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E5EAF2] px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto px-4 lg:px-0">
          <div>
            <h1 className="text-[#191F28] font-black text-xl">CRM · 고객관리</h1>
            <p className="text-[#8B95A1] text-xs mt-0.5">단골 고객 관리 · 맞춤 메시지 · 블랙컨슈머 방어</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#3182F6] hover:bg-[#1B6EF3] text-white text-sm font-bold rounded-xl transition-all">
            <Plus size={15} />고객 추가
          </button>
        </div>

        <div className="flex gap-1 mt-4 bg-[#F2F4F6] rounded-xl p-1 max-w-5xl mx-auto overflow-x-auto">
          {[
            { id: 'customers', label: '고객 목록', icon: Users },
            { id: 'message', label: '단체 메시지', icon: MessageCircle },
            { id: 'schedule', label: '예약 발송', icon: Clock },
            { id: 'blacklist', label: '블랙리스트', icon: Shield },
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

        {/* ── 고객 목록 ── */}
        {activeTab === 'customers' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: '전체 고객', value: '1,247명', icon: Users, color: 'text-[#3182F6]', bg: 'bg-[#EBF3FF]' },
                { label: 'VIP 고객', value: '48명', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-50' },
                { label: '이번달 신규', value: '23명', icon: Heart, color: 'text-[#00C073]', bg: 'bg-[#E8FBF3]' },
                { label: '재방문율', value: '68%', icon: Star, color: 'text-purple-500', bg: 'bg-purple-50' },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-white rounded-2xl p-4 border border-[#E5EAF2]">
                    <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                      <Icon size={17} className={stat.color} />
                    </div>
                    <p className="text-[#191F28] font-black text-xl leading-none">{stat.value}</p>
                    <p className="text-[#8B95A1] text-xs mt-1">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B8C1]" />
                <input value={searchText} onChange={e => setSearchText(e.target.value)}
                  placeholder="고객명 또는 전화번호 검색..."
                  className="w-full bg-white border border-[#E5EAF2] rounded-xl pl-9 pr-4 py-2.5 text-[#191F28] text-sm placeholder-[#B0B8C1] focus:outline-none focus:border-[#3182F6] transition-all" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {allTags.map(tag => (
                  <button key={tag} onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      selectedTag === tag ? 'bg-[#3182F6] text-white border-[#3182F6]' : 'bg-white text-[#8B95A1] border-[#E5EAF2] hover:text-[#191F28]'
                    }`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5EAF2] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E5EAF2] flex items-center justify-between">
                <p className="text-[#191F28] font-bold text-sm">고객 목록 ({filteredCustomers.length}명)</p>
                {selectedCustomers.length > 0 && (
                  <button onClick={() => setActiveTab('message')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3182F6] text-white text-xs font-bold rounded-lg">
                    <Send size={11} />{selectedCustomers.length}명 메시지 발송
                  </button>
                )}
              </div>
              <div className="divide-y divide-[#F2F4F6]">
                {filteredCustomers.map(customer => (
                  <div key={customer.id} className={`px-5 py-4 hover:bg-[#F8FAFB] transition-all ${selectedCustomer?.id === customer.id ? 'bg-[#EBF3FF]' : ''}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleCustomer(customer.id)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          selectedCustomers.includes(customer.id) ? 'bg-[#3182F6] border-[#3182F6]' : 'border-[#E5EAF2]'
                        }`}>
                        {selectedCustomers.includes(customer.id) && <Check size={11} className="text-white" />}
                      </button>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                        customer.blacklist ? 'bg-red-50 text-red-500' :
                        customer.tags.includes('VIP') ? 'bg-amber-50 text-amber-600' : 'bg-[#EBF3FF] text-[#3182F6]'
                      }`}>{customer.name[0]}</div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedCustomer(selectedCustomer?.id === customer.id ? null : customer)}>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[#191F28] font-bold text-sm">{customer.name}</p>
                          {customer.tags.map(tag => (
                            <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium border ${tagColors[tag] || ''}`}>{tag}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[#8B95A1] text-xs flex items-center gap-1"><Phone size={10} />{customer.phone}</span>
                          <span className="text-[#8B95A1] text-xs">방문 {customer.visits}회</span>
                          <span className="text-[#8B95A1] text-xs">총 {customer.totalSpent.toLocaleString()}원</span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-[#B0B8C1] flex-shrink-0" />
                    </div>

                    {selectedCustomer?.id === customer.id && (
                      <div className="mt-4 ml-8 p-4 rounded-xl bg-[#F8FAFB] border border-[#E5EAF2]">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                          {[
                            { label: '총 방문', value: `${customer.visits}회` },
                            { label: '총 결제', value: `${customer.totalSpent.toLocaleString()}원` },
                            { label: '평균 별점', value: `${customer.rating}점` },
                          ].map(item => (
                            <div key={item.label} className="text-center p-2 bg-white rounded-xl border border-[#E5EAF2]">
                              <p className="text-[#191F28] font-black text-lg">{item.value}</p>
                              <p className="text-[#8B95A1] text-xs">{item.label}</p>
                            </div>
                          ))}
                        </div>
                        {customer.memo && (
                          <div className="mb-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                            <p className="text-amber-700 text-xs font-bold mb-1">📝 메모</p>
                            <p className="text-amber-600 text-xs">{customer.memo}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => { setActiveTab('message'); setSelectedCustomers([customer.id]); }}
                            className="flex-1 py-2.5 rounded-xl bg-[#3182F6] text-white text-xs font-bold flex items-center justify-center gap-1.5">
                            <Send size={12} />메시지 발송
                          </button>
                          <button className="flex-1 py-2.5 rounded-xl border border-[#E5EAF2] text-[#8B95A1] text-xs font-medium">
                            태그 수정
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── 단체 메시지 ── */}
        {activeTab === 'message' && (
          <>
            <div className="bg-gradient-to-r from-[#3182F6] to-[#1B6EF3] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle size={16} className="text-white" />
                <h3 className="text-white font-bold text-sm">그룹 타겟팅 단체 발송</h3>
              </div>
              <p className="text-blue-100 text-xs">태그 기반 그룹핑 + {`{고객명}`} 치환 1:1 맞춤 메시지</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
              <p className="text-[#191F28] font-bold text-sm mb-3">수신 대상 선택</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {['전체', 'VIP', '단골', '신규', '배달', '일반'].map(tag => (
                  <button key={tag}
                    onClick={() => {
                      if (tag === '전체') setSelectedCustomers(customers.filter(c => !c.blacklist).map(c => c.id));
                      else setSelectedCustomers(customers.filter(c => c.tags.includes(tag)).map(c => c.id));
                    }}
                    className="py-2.5 rounded-xl border border-[#E5EAF2] hover:border-[#3182F6] hover:bg-[#EBF3FF] hover:text-[#3182F6] text-[#8B95A1] text-xs font-bold transition-all">
                    {tag} 고객
                  </button>
                ))}
              </div>
              <div className={`p-3 rounded-xl ${selectedCustomers.length > 0 ? 'bg-[#EBF3FF] border border-blue-100' : 'bg-[#F8FAFB] border border-[#E5EAF2]'}`}>
                <p className={`text-sm font-bold ${selectedCustomers.length > 0 ? 'text-[#3182F6]' : 'text-[#B0B8C1]'}`}>
                  {selectedCustomers.length > 0 ? `✅ ${selectedCustomers.length}명 선택됨` : '위에서 대상을 선택하세요'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
              <p className="text-[#191F28] font-bold text-sm mb-3">메시지 템플릿</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {messageTemplates.map(tmpl => (
                  <button key={tmpl.id} onClick={() => { setSelectedTemplate(tmpl); setCustomMessage(tmpl.content); }}
                    className={`p-3 rounded-xl border text-left transition-all ${selectedTemplate?.id === tmpl.id ? 'border-[#3182F6] bg-[#EBF3FF]' : 'border-[#E5EAF2] hover:bg-[#F8FAFB]'}`}>
                    <p className={`text-xs font-bold ${selectedTemplate?.id === tmpl.id ? 'text-[#3182F6]' : 'text-[#191F28]'}`}>{tmpl.name}</p>
                    <p className="text-[#B0B8C1] text-xs mt-1 line-clamp-1">{tmpl.content.slice(0, 30)}...</p>
                  </button>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[#191F28] text-xs font-bold">메시지 내용</label>
                  <span className="text-[#B0B8C1] text-xs">{`{고객명}`} 자동 치환</span>
                </div>
                <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)}
                  placeholder={`{고객명}님, 안녕하세요!\n하랑마케팅 카페입니다 😊`}
                  rows={5}
                  className="w-full bg-[#F8FAFB] border border-[#E5EAF2] rounded-xl px-4 py-3 text-[#191F28] text-sm placeholder-[#B0B8C1] focus:outline-none focus:border-[#3182F6] transition-all resize-none" />
              </div>

              {customMessage && (
                <div className="mt-3 p-4 rounded-xl bg-[#F8FAFB] border border-[#E5EAF2]">
                  <p className="text-[#8B95A1] text-xs font-bold mb-2">📱 미리보기</p>
                  <p className="text-[#191F28] text-sm leading-relaxed whitespace-pre-line">
                    {customMessage.replace('{고객명}', '김지수')}
                  </p>
                </div>
              )}
            </div>

            <button onClick={handleSendMessage} disabled={isSending || selectedCustomers.length === 0 || !customMessage}
              className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                sendDone ? 'bg-[#00C073] text-white' : 'bg-[#3182F6] hover:bg-[#1B6EF3] disabled:opacity-40 text-white'
              }`}>
              {isSending ? <><Loader2 size={16} className="animate-spin" />발송 중...</> :
               sendDone ? <><Check size={16} />발송 완료!</> :
               <><Send size={16} />{selectedCustomers.length}명에게 알림톡 발송</>}
            </button>
          </>
        )}

        {/* ── 예약 발송 ── */}
        {activeTab === 'schedule' && (
          <>
            <div className="bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-white" />
                <h3 className="text-white font-bold text-sm">VIP 스케줄러</h3>
              </div>
              <p className="text-purple-100 text-xs">특정 날짜/시간에 맞춤 메시지 예약 발송</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5 space-y-4">
              <div>
                <label className="text-[#191F28] text-xs font-bold mb-2 block">발송 대상</label>
                <div className="flex gap-2">
                  {['전체', 'VIP', '단골'].map(tag => (
                    <button key={tag} className="px-3 py-2 rounded-xl border border-[#E5EAF2] text-[#8B95A1] text-xs font-bold hover:border-[#3182F6] hover:text-[#3182F6] transition-all">
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#191F28] text-xs font-bold mb-2 block">발송 날짜</label>
                  <input type="date" className="w-full bg-[#F8FAFB] border border-[#E5EAF2] rounded-xl px-3 py-2.5 text-[#191F28] text-sm focus:outline-none focus:border-[#3182F6]" />
                </div>
                <div>
                  <label className="text-[#191F28] text-xs font-bold mb-2 block">발송 시간</label>
                  <input type="time" className="w-full bg-[#F8FAFB] border border-[#E5EAF2] rounded-xl px-3 py-2.5 text-[#191F28] text-sm focus:outline-none focus:border-[#3182F6]" />
                </div>
              </div>
              <div>
                <label className="text-[#191F28] text-xs font-bold mb-2 block">메시지</label>
                <textarea rows={4} placeholder="예약 발송할 메시지를 입력하세요..."
                  className="w-full bg-[#F8FAFB] border border-[#E5EAF2] rounded-xl px-4 py-3 text-[#191F28] text-sm placeholder-[#B0B8C1] focus:outline-none focus:border-[#3182F6] resize-none" />
              </div>
              <button className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold text-sm flex items-center justify-center gap-2">
                <Bell size={15} />예약 발송 등록
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5EAF2] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E5EAF2]">
                <p className="text-[#191F28] font-bold text-sm">예약된 발송</p>
              </div>
              <div className="divide-y divide-[#F2F4F6]">
                {[
                  { target: 'VIP 고객 48명', message: 'VIP 혜택 안내 메시지', date: '2026-04-15', time: '10:00' },
                  { target: '전체 고객 1,247명', message: '봄 신메뉴 출시 안내', date: '2026-04-20', time: '09:00' },
                ].map((item, i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <Clock size={16} className="text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#191F28] text-sm font-bold">{item.target}</p>
                      <p className="text-[#8B95A1] text-xs mt-0.5">{item.message}</p>
                      <p className="text-[#B0B8C1] text-xs mt-0.5">{item.date} {item.time}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-[#EBF3FF] text-[#3182F6] px-2.5 py-1 rounded-full font-bold">예약됨</span>
                      <button className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center">
                        <X size={12} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── 블랙리스트 ── */}
        {activeTab === 'blacklist' && (
          <>
            <div className="bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Shield size={16} className="text-white" />
                <h3 className="text-white font-bold text-sm">블랙컨슈머 방어망</h3>
              </div>
              <p className="text-red-100 text-xs">악성 고객 차단 · 부천 사장님 연합 공유</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Bell size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-700 text-sm font-bold">부천 사장님 연합 공유 시스템</p>
                  <p className="text-amber-600 text-xs mt-1 leading-relaxed">블랙리스트 고객 정보는 해시 처리 후 부천 지역 사장님들과 공유돼요. 개인정보는 보호되며 악성 고객 패턴만 공유됩니다.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5EAF2] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E5EAF2] flex items-center justify-between">
                <p className="text-[#191F28] font-bold text-sm">블랙리스트</p>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-100 text-red-500 text-xs font-bold rounded-lg">
                  <Plus size={11} />추가
                </button>
              </div>
              <div className="divide-y divide-[#F2F4F6]">
                {customers.filter(c => c.blacklist).map(customer => (
                  <div key={customer.id} className="px-5 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 text-red-500 font-bold">{customer.name[0]}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[#191F28] font-bold text-sm">{customer.name}</p>
                        <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-bold border border-red-100">블랙리스트</span>
                      </div>
                      <p className="text-[#8B95A1] text-xs flex items-center gap-1"><Phone size={10} />{customer.phone}</p>
                      <p className="text-red-400 text-xs mt-1">{customer.memo}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5EAF2] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E5EAF2]">
                <p className="text-[#191F28] font-bold text-sm">🔗 부천 연합 블랙리스트</p>
                <p className="text-[#8B95A1] text-xs mt-0.5">다른 사장님들이 공유한 정보</p>
              </div>
              <div className="divide-y divide-[#F2F4F6]">
                {[
                  { hash: '****5678', reason: '노쇼 5회', reportCount: 3, area: '중동' },
                  { hash: '****2341', reason: '환불 사기', reportCount: 7, area: '소사구' },
                  { hash: '****8890', reason: '욕설·폭언', reportCount: 2, area: '오정구' },
                ].map((item, i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Shield size={15} className="text-red-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[#191F28] text-sm font-bold">010-{item.hash}</p>
                        <span className="text-xs bg-red-50 text-red-400 px-2 py-0.5 rounded-full font-medium">{item.reason}</span>
                      </div>
                      <p className="text-[#8B95A1] text-xs">{item.area} · 신고 {item.reportCount}건</p>
                    </div>
                    <button className="text-xs bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-lg font-bold transition-all">차단</button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 고객 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[#E5EAF2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus size={16} className="text-[#3182F6]" />
                <h3 className="text-[#191F28] font-bold text-sm">고객 추가</h3>
              </div>
              <button onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-lg bg-[#F2F4F6] flex items-center justify-center text-[#8B95A1]">
                <X size={14} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: '고객명', placeholder: '예: 김지수', type: 'text' },
                { label: '전화번호', placeholder: '010-0000-0000', type: 'tel' },
                { label: '이메일', placeholder: 'example@naver.com', type: 'email' },
                { label: '메모', placeholder: '특이사항을 입력하세요', type: 'text' },
              ].map(field => (
                <div key={field.label}>
                  <label className="text-[#191F28] text-xs font-bold mb-1.5 block">{field.label}</label>
                  <input type={field.type} placeholder={field.placeholder}
                    className="w-full bg-[#F8FAFB] border border-[#E5EAF2] rounded-xl px-4 py-2.5 text-[#191F28] text-sm placeholder-[#B0B8C1] focus:outline-none focus:border-[#3182F6] transition-all" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={() => setShowAddModal(false)}
                  className="py-3 rounded-xl border border-[#E5EAF2] text-[#8B95A1] text-sm font-medium">취소</button>
                <button onClick={() => setShowAddModal(false)}
                  className="py-3 rounded-xl bg-[#3182F6] hover:bg-[#1B6EF3] text-white text-sm font-bold transition-all">추가하기</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
