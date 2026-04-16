'use client'

import { useState } from 'react'

const MOCK_QR = [
  { id: 'QR-001', name: '테이블 1번', scans: 47, reviews: 12, active: true, created: '2026-03-10' },
  { id: 'QR-002', name: '테이블 2번', scans: 31, reviews: 8, active: true, created: '2026-03-10' },
  { id: 'QR-003', name: '카운터',     scans: 83, reviews: 24, active: true, created: '2026-03-11' },
  { id: 'QR-004', name: '입구',       scans: 15, reviews: 4, active: false, created: '2026-03-15' },
]

export default function QrAdminPage() {
  const [activeTab, setActiveTab] = useState('QR 목록')
  const [showCreate, setShowCreate] = useState(false)
  const [qrName, setQrName] = useState('')


  const tabs = ['QR 목록', 'AI 설정', '성과 리포트']
  const totalScans = MOCK_QR.reduce((a, q) => a + q.scans, 0)
  const totalReviews = MOCK_QR.reduce((a, q) => a + q.reviews, 0)

  return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-black text-[#191F28]">QR 관리</h1>
              <p className="text-sm text-[#8B95A1] mt-0.5">QR 코드 생성 · 리뷰 자동화 · 성과 분석</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] text-white text-sm font-semibold rounded-xl hover:bg-[#7C3AED] transition-colors">
              <span>+</span><span>QR 생성</span>
            </button>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'QR 코드', value: MOCK_QR.length + '개', icon: '📱', color: '#8B5CF6' },
              { label: '총 스캔수', value: totalScans + '회', icon: '📊', color: '#3182F6' },
              { label: '수집 리뷰', value: totalReviews + '개', icon: '⭐', color: '#F59E0B' },
              { label: '전환율', value: Math.round(totalReviews/totalScans*100) + '%', icon: '🎯', color: '#10B981' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-[#F2F4F6] text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-[#8B95A1] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* 탭 */}
          <div className="flex gap-1 bg-[#F2F4F6] rounded-xl p-1 mb-5">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={"flex-1 py-2 rounded-lg text-xs font-semibold transition-all " + (activeTab === tab ? "bg-white text-[#191F28] shadow-sm" : "text-[#8B95A1] hover:text-[#4E5968]")}>
                {tab}
              </button>
            ))}
          </div>

          {/* QR 목록 */}
          {activeTab === 'QR 목록' && (
            <div className="space-y-3">
              {MOCK_QR.map(qr => (
                <div key={qr.id} className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-4 flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#F5F3FF] rounded-xl flex items-center justify-center flex-shrink-0">
                    <div className="grid grid-cols-3 gap-0.5">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className={"w-2.5 h-2.5 rounded-sm " + (Math.random() > 0.4 ? "bg-[#8B5CF6]" : "bg-transparent")} />
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-[#191F28]">{qr.name}</p>
                      <span className={"px-2 py-0.5 rounded-full text-[10px] font-bold " + (qr.active ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F2F4F6] text-[#8B95A1]")}>
                        {qr.active ? '활성' : '비활성'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#8B95A1]">
                      <span>스캔 {qr.scans}회</span>
                      <span>리뷰 {qr.reviews}개</span>
                      <span>생성 {qr.created}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button className="px-3 py-1.5 bg-[#F5F3FF] text-[#8B5CF6] text-xs font-semibold rounded-xl hover:bg-[#EDE9FE]">다운로드</button>
                    <button className="px-3 py-1.5 bg-[#F2F4F6] text-[#4E5968] text-xs font-semibold rounded-xl hover:bg-[#E5E8EB]">설정</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI 설정 */}
          {activeTab === 'AI 설정' && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-6 space-y-5">
              <div>
                <p className="text-sm font-bold text-[#191F28] mb-1">AI 답글 말투</p>
                <p className="text-xs text-[#8B95A1] mb-3">QR 스캔 후 리뷰 작성 시 AI가 추천하는 답글 톤</p>
                <div className="grid grid-cols-2 gap-2">
                  {['따뜻한','전문적','유쾌한','심플'].map(tone => (
                    <label key={tone} className="flex items-center gap-2 p-3 border border-[#E5E8EB] rounded-xl cursor-pointer hover:border-[#8B5CF6]">
                      <input type="radio" name="tone" value={tone} defaultChecked={tone === '따뜻한'} className="accent-[#8B5CF6]" />
                      <span className="text-sm text-[#4E5968]">{tone}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-[#191F28] mb-1">SEO 키워드 자동 주입</p>
                <p className="text-xs text-[#8B95A1] mb-2">AI 답글에 자동으로 포함할 키워드</p>
                <input defaultValue="강남 마케팅, 하랑마케팅, 소상공인 마케팅" className="w-full px-3 py-2 rounded-xl border border-[#E5E8EB] text-sm focus:outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#191F28] mb-1">리뷰 보상 설정</p>
                <div className="space-y-2">
                  {[{ label: '리뷰 작성 시', value: '음료 1잔 서비스' }, { label: '사진 리뷰 시', value: '디저트 추가 제공' }].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-xs text-[#4E5968] w-28">{item.label}</span>
                      <input defaultValue={item.value} className="flex-1 px-3 py-1.5 rounded-xl border border-[#E5E8EB] text-sm focus:outline-none focus:border-[#8B5CF6]" />
                    </div>
                  ))}
                </div>
              </div>
              <button className="w-full py-3 bg-[#8B5CF6] text-white rounded-xl text-sm font-semibold hover:bg-[#7C3AED]">저장하기</button>
            </div>
          )}

          {/* 성과 리포트 */}
          {activeTab === '성과 리포트' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-5">
                  <h3 className="text-sm font-bold text-[#191F28] mb-4">이번 달 스캔 추이</h3>
                  <div className="flex items-end gap-2 h-24">
                    {[12, 18, 8, 24, 16, 28, 35, 22, 19, 31, 27, 40, 18, 15].map((v, i) => (
                      <div key={i} className="flex-1 rounded-t-sm" style={{ height: (v/40*100) + '%', background: '#8B5CF6', opacity: 0.6 + (i/20) }} />
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-5">
                  <h3 className="text-sm font-bold text-[#191F28] mb-4">플랫폼별 리뷰 등록</h3>
                  {[{ name: '네이버', count: 14, color: '#03C75A' }, { name: '구글', count: 6, color: '#4285F4' }, { name: '카카오', count: 4, color: '#F59E0B' }].map(p => (
                    <div key={p.name} className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#4E5968]">{p.name}</span>
                        <span className="font-bold text-[#191F28]">{p.count}개</span>
                      </div>
                      <div className="w-full bg-[#F2F4F6] rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: (p.count/14*100) + '%', background: p.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* QR 생성 모달 */}
          {showCreate && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
                <h2 className="text-base font-black text-[#191F28] mb-4">QR 코드 생성</h2>
                <div className="space-y-3">
                  <input placeholder="QR 코드 이름 (예: 테이블 5번)" value={qrName} onChange={e => setQrName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E8EB] text-sm focus:outline-none focus:border-[#8B5CF6]" />
                  <select className="w-full px-3 py-2 rounded-xl border border-[#E5E8EB] text-sm focus:outline-none focus:border-[#8B5CF6]">
                    <option>네이버 리뷰 유도</option>
                    <option>구글 리뷰 유도</option>
                    <option>카카오 리뷰 유도</option>
                    <option>멀티 플랫폼</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-[#E5E8EB] rounded-xl text-sm text-[#4E5968] font-medium hover:bg-[#F8F9FA]">취소</button>
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 bg-[#8B5CF6] text-white rounded-xl text-sm font-semibold hover:bg-[#7C3AED]">생성</button>
                </div>
              </div>
            </div>
          )}

        </div>
  )
}
