'use client'

import { useState } from 'react'

export default function StorePage() {
  const [storeName, setStoreName] = useState('하랑마케팅 강남점')
  const [category, setCategory] = useState('마케팅 대행업')
  const [address, setAddress] = useState('서울시 강남구 테헤란로 123')
  const [phone, setPhone] = useState('02-1234-5678')
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('기본정보')

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const tabs = ['기본정보', '운영시간', '연동 플랫폼', '알림 설정']
  const platforms = [
    { name: '네이버 플레이스', color: '#03C75A', status: '연동됨' },
    { name: '구글 비즈니스', color: '#4285F4', status: '미연동' },
    { name: '카카오맵', color: '#F59E0B', status: '연동됨' },
    { name: '배달의민족', color: '#2AC1BC', status: '미연동' },
    { name: '요기요', color: '#FA0050', status: '미연동' },
    { name: '쿠팡이츠', color: '#FF4B30', status: '미연동' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-black text-[#191F28]">매장 관리</h1>
        <p className="text-sm text-[#8B95A1] mt-0.5">매장 정보 · 운영시간 · 플랫폼 연동</p>
      </div>

      <div className="flex gap-1 bg-[#F2F4F6] rounded-xl p-1 mb-6">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={"flex-1 py-2 rounded-lg text-xs font-semibold transition-all " + (activeTab === tab ? "bg-white text-[#191F28] shadow-sm" : "text-[#8B95A1]")}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === '기본정보' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-6 space-y-4">
          {[
            { label: '매장명', value: storeName, set: setStoreName },
            { label: '업종', value: category, set: setCategory },
            { label: '주소', value: address, set: setAddress },
            { label: '전화번호', value: phone, set: setPhone },
          ].map(item => (
            <div key={item.label}>
              <label className="text-xs font-semibold text-[#4E5968] mb-1.5 block">{item.label}</label>
              <input value={item.value} onChange={e => item.set(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E8EB] text-sm focus:outline-none focus:border-[#3182F6]" />
            </div>
          ))}
          <button onClick={handleSave}
            className={"w-full py-3 rounded-xl text-sm font-semibold transition-all " + (saved ? "bg-[#10B981] text-white" : "bg-[#3182F6] text-white hover:bg-[#1a6fd6]")}>
            {saved ? '✓ 저장됐어요!' : '저장하기'}
          </button>
        </div>
      )}

      {activeTab === '운영시간' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-6">
          {['월','화','수','목','금','토','일'].map(day => (
            <div key={day} className="flex items-center justify-between py-3 border-b border-[#F2F4F6] last:border-0">
              <span className="text-sm font-semibold text-[#191F28] w-8">{day}</span>
              <div className="flex items-center gap-2">
                <input defaultValue="09:00" type="time" className="px-2 py-1 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none" />
                <span className="text-[#8B95A1]">~</span>
                <input defaultValue="22:00" type="time" className="px-2 py-1 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none" />
              </div>
            </div>
          ))}
          <button onClick={handleSave} className="w-full mt-4 py-3 bg-[#3182F6] text-white rounded-xl text-sm font-semibold">
            {saved ? '✓ 저장됐어요!' : '저장하기'}
          </button>
        </div>
      )}

      {activeTab === '연동 플랫폼' && (
        <div className="space-y-3">
          {platforms.map(p => (
            <div key={p.name} className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#191F28]">{p.name}</p>
                <p className="text-xs" style={{ color: p.status === '연동됨' ? '#10B981' : '#8B95A1' }}>{p.status}</p>
              </div>
              <button style={{ background: p.status === '연동됨' ? '#F2F4F6' : '#3182F6', color: p.status === '연동됨' ? '#4E5968' : 'white' }}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold">
                {p.status === '연동됨' ? '연동 해제' : '연동하기'}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === '알림 설정' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-6 space-y-4">
          {[
            { label: '새 리뷰 알림', desc: '새로운 리뷰가 등록되면 알림', on: true },
            { label: '리뷰 미답변 알림', desc: '24시간 내 미답변 리뷰 알림', on: true },
            { label: '키워드 순위 변동', desc: '키워드 순위가 변동될 때 알림', on: false },
            { label: '정부지원금 알림', desc: '신규 지원금 공고 알림', on: true },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-[#191F28]">{item.label}</p>
                <p className="text-xs text-[#8B95A1]">{item.desc}</p>
              </div>
              <div className={"w-11 h-6 rounded-full cursor-pointer " + (item.on ? "bg-[#3182F6]" : "bg-[#E5E8EB]")}>
                <div className={"w-5 h-5 rounded-full bg-white shadow mt-0.5 transition-transform " + (item.on ? "translate-x-5" : "translate-x-0.5")} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
