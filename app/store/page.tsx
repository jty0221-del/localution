'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../components/Sidebar'

type StoreTab = 'info' | 'hours' | 'menu' | 'photos'

export default function StorePage() {
  const [tab, setTab] = useState<StoreTab>('info')
  const [saved, setSaved] = useState(false)

  const tabs: { key: StoreTab; label: string; icon: string }[] = [
    { key: 'info', label: '기본 정보', icon: '🏪' },
    { key: 'hours', label: '영업시간', icon: '🕐' },
    { key: 'menu', label: '메뉴 관리', icon: '📋' },
    { key: 'photos', label: '사진 관리', icon: '📸' },
  ]

  const days = ['월', '화', '수', '목', '금', '토', '일']
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({
    '월': { open: '09:00', close: '22:00', closed: false },
    '화': { open: '09:00', close: '22:00', closed: false },
    '수': { open: '09:00', close: '22:00', closed: false },
    '목': { open: '09:00', close: '22:00', closed: false },
    '금': { open: '09:00', close: '23:00', closed: false },
    '토': { open: '10:00', close: '23:00', closed: false },
    '일': { open: '10:00', close: '21:00', closed: false },
  })

  const menus = [
    { name: '아메리카노', price: 4500, category: '음료', popular: true },
    { name: '카페라떼', price: 5000, category: '음료', popular: true },
    { name: '크로플', price: 6500, category: '디저트', popular: false },
    { name: '에그샌드위치', price: 7500, category: '푸드', popular: true },
    { name: '그린티라떼', price: 5500, category: '음료', popular: false },
  ]

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#191F28]">매장 관리</h1>
            <p className="text-[#8B95A1] mt-1 text-sm">매장 정보와 메뉴를 업데이트해요</p>
          </div>
          <button
            onClick={handleSave}
            className={[
              'px-5 py-2.5 rounded-xl text-sm font-bold transition-all',
              saved
                ? 'bg-[#00C896] text-white'
                : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]',
            ].join(' ')}
          >
            {saved ? '✓ 저장됨!' : '저장하기'}
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6 bg-white rounded-2xl p-1.5 shadow-sm w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2',
                tab === t.key
                  ? 'bg-[#3182F6] text-white shadow-sm'
                  : 'text-[#4E5968] hover:bg-[#F2F4F6]',
              ].join(' ')}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* 기본 정보 */}
        {tab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-[#191F28]">매장 기본 정보</h2>
              {[
                { label: '매장명', placeholder: '하랑마케팅 카페', type: 'text' },
                { label: '대표 전화', placeholder: '010-7510-9054', type: 'tel' },
                { label: '주소', placeholder: '경기 고양시 일산동구 장백로19', type: 'text' },
                { label: '카테고리', placeholder: '카페·베이커리', type: 'text' },
              ].map((f, i) => (
                <div key={i}>
                  <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    defaultValue={f.placeholder}
                    className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-[#191F28]">SEO 키워드 설정</h2>
              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">메인 키워드</label>
                <input type="text" defaultValue="부천 맛집" className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-all" />
                <p className="text-xs text-[#8B95A1] mt-1">네이버·구글 검색 최적화에 활용돼요</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">서브 키워드 (최대 5개)</label>
                <input type="text" defaultValue="#가성비 #회식장소 #주차편리 #룸있음" className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">매장 소개 (리뷰 답변에 활용)</label>
                <textarea
                  rows={3}
                  defaultValue="정성 가득한 음식과 따뜻한 분위기의 카페입니다. 회식, 단체 모임에 적합한 룸을 보유하고 있어요."
                  className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-all resize-none"
                />
              </div>
              {/* 플랫폼 연동 상태 */}
              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-2">플랫폼 연동 상태</label>
                <div className="space-y-2">
                  {[
                    { name: '네이버 플레이스', connected: true, color: '#03C75A' },
                    { name: '구글 지도', connected: true, color: '#4285F4' },
                    { name: '카카오맵', connected: false, color: '#FEE500' },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#F8F9FA]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.connected ? p.color : '#D1D6DB' }} />
                        <span className="text-sm text-[#4E5968]">{p.name}</span>
                      </div>
                      {p.connected
                        ? <span className="text-xs font-bold text-[#00C896]">✓ 연동됨</span>
                        : <button className="text-xs text-[#3182F6] font-semibold">연동하기</button>
                      }
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 영업시간 */}
        {tab === 'hours' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm max-w-lg">
            <h2 className="font-bold text-[#191F28] mb-5">영업시간 설정</h2>
            <div className="space-y-3">
              {days.map(day => (
                <div key={day} className="flex items-center gap-4">
                  <span className="w-6 text-sm font-bold text-[#191F28]">{day}</span>
                  {hours[day].closed ? (
                    <div className="flex-1 text-sm text-[#8B95A1] bg-[#F2F4F6] rounded-xl px-4 py-3 text-center">휴무</div>
                  ) : (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="time"
                        value={hours[day].open}
                        onChange={e => setHours(h => ({ ...h, [day]: { ...h[day], open: e.target.value } }))}
                        className="flex-1 border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3182F6]"
                      />
                      <span className="text-[#8B95A1] text-sm">~</span>
                      <input
                        type="time"
                        value={hours[day].close}
                        onChange={e => setHours(h => ({ ...h, [day]: { ...h[day], close: e.target.value } }))}
                        className="flex-1 border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3182F6]"
                      />
                    </div>
                  )}
                  <button
                    onClick={() => setHours(h => ({ ...h, [day]: { ...h[day], closed: !h[day].closed } }))}
                    className={[
                      'px-3 py-2 rounded-xl text-xs font-semibold transition-all',
                      hours[day].closed
                        ? 'bg-[#3182F6] text-white'
                        : 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]',
                    ].join(' ')}
                  >
                    {hours[day].closed ? '영업' : '휴무'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 메뉴 관리 */}
        {tab === 'menu' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#F2F4F6]">
              <h2 className="font-bold text-[#191F28]">메뉴 목록</h2>
              <button className="bg-[#3182F6] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#1B64DA] transition-colors">
                + 메뉴 추가
              </button>
            </div>
            <div className="divide-y divide-[#F8F9FA]">
              {menus.map((m, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFBFF] transition-colors">
                  <div className="w-10 h-10 bg-[#F2F4F6] rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                    {m.category === '음료' ? '☕' : m.category === '디저트' ? '🥐' : '🍳'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#191F28]">{m.name}</span>
                      {m.popular && <span className="text-[10px] bg-[#FFF3E0] text-[#FF8C00] px-1.5 py-0.5 rounded-full font-bold">인기</span>}
                      <span className="text-[10px] bg-[#F2F4F6] text-[#8B95A1] px-1.5 py-0.5 rounded-full">{m.category}</span>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-[#191F28]">{m.price.toLocaleString()}원</div>
                  <div className="flex gap-2">
                    <button className="text-xs text-[#3182F6] border border-[#3182F6] px-2.5 py-1.5 rounded-lg hover:bg-[#EFF6FF] transition-colors">수정</button>
                    <button className="text-xs text-[#F04452] border border-[#F04452] px-2.5 py-1.5 rounded-lg hover:bg-[#FFF0F0] transition-colors">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 사진 관리 */}
        {tab === 'photos' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[#191F28]">매장 사진</h2>
              <button className="bg-[#3182F6] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#1B64DA] transition-colors">
                + 사진 업로드
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={[
                  'aspect-square rounded-xl overflow-hidden',
                  i === 0 ? 'bg-gradient-to-br from-[#3182F6] to-[#8B5CF6]' :
                  i === 1 ? 'bg-gradient-to-br from-[#00C896] to-[#3182F6]' :
                  i === 2 ? 'bg-gradient-to-br from-[#FF8C00] to-[#F04452]' :
                  'bg-[#F2F4F6] border-2 border-dashed border-[#E5E8EB]',
                ].join(' ')}>
                  {i < 3 && (
                    <div className="w-full h-full flex items-center justify-center text-white text-3xl">
                      {['🏪', '☕', '🍳'][i]}
                    </div>
                  )}
                  {i >= 3 && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#8B95A1] gap-1">
                      <span className="text-2xl">+</span>
                      <span className="text-xs">업로드</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-[#8B95A1] mt-3">📌 첫 번째 사진이 대표 사진으로 설정됩니다</p>
          </div>
        )}
      </main>
    </div>
  )
}
