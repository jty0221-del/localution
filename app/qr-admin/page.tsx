'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../components/Sidebar'

const qrList = [
  { id: 1, name: '메인 입구 QR', scans: 142, createdAt: '2024-01-15', active: true },
  { id: 2, name: '테이블 QR #1', scans: 89, createdAt: '2024-01-20', active: true },
  { id: 3, name: '테이블 QR #2', scans: 67, createdAt: '2024-01-20', active: true },
  { id: 4, name: '리뷰 유도 QR', scans: 203, createdAt: '2024-02-01', active: false },
]

export default function QRAdmin() {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list')
  const [qrName, setQrName] = useState('')
  const [qrTarget, setQrTarget] = useState('review')

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#191F28]">QR 관리</h1>
          <p className="text-[#8B95A1] mt-1">QR 코드를 만들고 스캔 현황을 확인해요</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: '전체 QR', value: '4개', icon: '📱' },
            { label: '이번 달 스캔', value: '501회', icon: '🔍' },
            { label: '활성 QR', value: '3개', icon: '✅' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold text-[#191F28]">{s.value}</div>
              <div className="text-xs text-[#8B95A1] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === 'list'
                ? 'bg-[#3182F6] text-white'
                : 'bg-white text-[#4E5968] border border-[#E5E8EB]'
            }`}
          >
            QR 목록
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === 'create'
                ? 'bg-[#3182F6] text-white'
                : 'bg-white text-[#4E5968] border border-[#E5E8EB]'
            }`}
          >
            + 새 QR 만들기
          </button>
        </div>

        {activeTab === 'list' && (
          <div className="space-y-4">
            {qrList.map(qr => (
              <div key={qr.id} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-[#F2F4F6] rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                      📱
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[#191F28]">{qr.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          qr.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {qr.active ? '활성' : '비활성'}
                        </span>
                      </div>
                      <div className="text-sm text-[#8B95A1]">
                        생성일: {qr.createdAt} · 총 스캔 <span className="font-medium text-[#3182F6]">{qr.scans}회</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-2 text-sm font-medium bg-[#EFF6FF] text-[#3182F6] rounded-xl hover:bg-[#DBEAFE] transition-colors">
                      다운로드
                    </button>
                    <button className="px-3 py-2 text-sm font-medium bg-[#F2F4F6] text-[#4E5968] rounded-xl hover:bg-[#E5E8EB] transition-colors">
                      수정
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm max-w-lg">
            <h2 className="font-bold text-[#191F28] mb-6">새 QR 코드 만들기</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#191F28] mb-2">QR 이름</label>
                <input
                  type="text"
                  value={qrName}
                  onChange={e => setQrName(e.target.value)}
                  placeholder="예: 입구 QR, 테이블 QR"
                  className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#191F28] mb-2">QR 용도</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'review', label: '리뷰 유도', icon: '⭐', desc: '네이버/구글 리뷰 작성' },
                    { value: 'menu', label: '메뉴판', icon: '📋', desc: '디지털 메뉴 보기' },
                    { value: 'event', label: '이벤트', icon: '🎉', desc: '쿠폰/이벤트 페이지' },
                    { value: 'sns', label: 'SNS 팔로우', icon: '📸', desc: '인스타/카카오 연결' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setQrTarget(opt.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-colors ${
                        qrTarget === opt.value
                          ? 'border-[#3182F6] bg-[#EFF6FF]'
                          : 'border-[#E5E8EB] hover:border-[#3182F6]'
                      }`}
                    >
                      <div className="text-xl mb-1">{opt.icon}</div>
                      <div className="text-sm font-semibold text-[#191F28]">{opt.label}</div>
                      <div className="text-xs text-[#8B95A1] mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <button className="w-full bg-[#3182F6] text-white font-semibold py-3 rounded-xl hover:bg-[#1B64DA] transition-colors">
                QR 코드 생성하기
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
