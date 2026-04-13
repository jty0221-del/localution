'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../components/Sidebar'

type TabType = 'setting' | 'qr' | 'report'
type ToneType = 'z' | 'mom' | 'gourmet'
type RewardType = 'point' | 'drink' | 'discount' | 'side' | 'custom'

const chartData = [
  { day: '4/1', scan: 8, convert: 4 },
  { day: '4/3', scan: 12, convert: 7 },
  { day: '4/5', scan: 6, convert: 3 },
  { day: '4/7', scan: 15, convert: 9 },
  { day: '4/9', scan: 11, convert: 6 },
  { day: '4/11', scan: 10, convert: 6 },
]

export default function QRAdmin() {
  const [tab, setTab] = useState<TabType>('setting')
  const [tone, setTone] = useState<ToneType>('z')
  const [reward, setReward] = useState<RewardType>('point')
  const [mainKw, setMainKw] = useState('부천 맛집')
  const [subKw, setSubKw] = useState('#가성비 #회식장소')
  const [copied, setCopied] = useState(false)

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'setting', label: 'AI 세팅', icon: '⚙️' },
    { key: 'qr', label: 'QR 발급', icon: '📱' },
    { key: 'report', label: '성과 리포트', icon: '📊' },
  ]

  const tones = [
    { key: 'z' as ToneType, emoji: '🔥', label: 'Z세대 감성', desc: '힙하고 트렌디한 말투' },
    { key: 'mom' as ToneType, emoji: '💛', label: '맘카페 찐후기', desc: '따뜻하고 신뢰감 있는 말투' },
    { key: 'gourmet' as ToneType, emoji: '🍷', label: '진지한 미식가', desc: '격조 있고 전문적인 말투' },
  ]

  const rewards = [
    { key: 'point' as RewardType, label: '로컬루션 포인트 2,000P', icon: '🎁' },
    { key: 'drink' as RewardType, label: '음료 1병 무료 쿠폰', icon: '🥤' },
    { key: 'discount' as RewardType, label: '다음 방문 10% 할인', icon: '🏷️' },
    { key: 'side' as RewardType, label: '사이드 메뉴 서비스', icon: '🍟' },
    { key: 'custom' as RewardType, label: '직접 입력', icon: '✏️' },
  ]

  const rewardMap: Record<RewardType, string> = {
    point: '로컬루션 포인트 2,000P',
    drink: '음료 1병 무료 쿠폰',
    discount: '다음 방문 10% 할인',
    side: '사이드 메뉴 서비스',
    custom: '직접 입력',
  }

  const maxScan = Math.max(...chartData.map(d => d.scan))

  function handleCopy() {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8">

        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#191F28]">QR 리뷰 컨트롤 타워</h1>
          <p className="text-[#8B95A1] mt-1 text-sm">AI가 리뷰를 자동 생성하고 QR로 고객을 유도해요</p>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6 bg-white rounded-2xl p-1.5 shadow-sm w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                'px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2',
                tab === t.key
                  ? 'bg-[#3182F6] text-white shadow-sm'
                  : 'text-[#4E5968] hover:bg-[#F2F4F6]',
              ].join(' ')}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── AI 세팅 탭 ─── */}
        {tab === 'setting' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* 핵심 설정 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-[#EFF6FF] rounded-lg flex items-center justify-center text-sm">🔑</div>
                <h2 className="font-bold text-[#191F28]">SEO 키워드 세팅</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#4E5968] mb-1.5 uppercase tracking-wide">메인 타겟 키워드</label>
                  <input
                    type="text"
                    value={mainKw}
                    onChange={e => setMainKw(e.target.value)}
                    className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 transition-all"
                    placeholder="예: 부천 맛집, 합정 카페"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E5968] mb-1.5 uppercase tracking-wide">서브 키워드 (최대 3개)</label>
                  <input
                    type="text"
                    value={subKw}
                    onChange={e => setSubKw(e.target.value)}
                    className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 transition-all"
                    placeholder="#가성비 #회식장소 #주차편리"
                  />
                  <p className="text-xs text-[#8B95A1] mt-1.5">AI가 리뷰에 자동으로 키워드를 녹여드려요</p>
                </div>
              </div>
            </div>

            {/* 리뷰 톤앤매너 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-[#EFF6FF] rounded-lg flex items-center justify-center text-sm">✍️</div>
                <h2 className="font-bold text-[#191F28]">리뷰 톤앤매너</h2>
              </div>
              <div className="space-y-3">
                {tones.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTone(t.key)}
                    className={[
                      'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                      tone === t.key
                        ? 'border-[#3182F6] bg-[#EFF6FF]'
                        : 'border-[#E5E8EB] hover:border-[#3182F6]/40',
                    ].join(' ')}
                  >
                    <span className="text-xl">{t.emoji}</span>
                    <div className="flex-1">
                      <div className={['text-sm font-semibold', tone === t.key ? 'text-[#3182F6]' : 'text-[#191F28]'].join(' ')}>{t.label}</div>
                      <div className="text-xs text-[#8B95A1] mt-0.5">{t.desc}</div>
                    </div>
                    <div className={[
                      'w-4 h-4 rounded-full border-2 flex-shrink-0',
                      tone === t.key ? 'border-[#3182F6] bg-[#3182F6]' : 'border-[#D1D6DB]',
                    ].join(' ')} />
                  </button>
                ))}
              </div>
            </div>

            {/* 고객 보상 세팅 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-[#EFF6FF] rounded-lg flex items-center justify-center text-sm">🎁</div>
                <h2 className="font-bold text-[#191F28]">고객 보상 세팅</h2>
                <span className="ml-auto text-xs text-[#8B95A1]">리뷰 완료 시 지급할 혜택</span>
              </div>
              <div className="space-y-2">
                {rewards.map(r => (
                  <button
                    key={r.key}
                    onClick={() => setReward(r.key)}
                    className={[
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all text-sm',
                      reward === r.key
                        ? 'border-[#3182F6] bg-[#EFF6FF] font-semibold text-[#3182F6]'
                        : 'border-[#E5E8EB] text-[#4E5968] hover:border-[#3182F6]/40',
                    ].join(' ')}
                  >
                    <span>{r.icon}</span>
                    {r.label}
                    {reward === r.key && <span className="ml-auto text-[#3182F6]">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* 고객 화면 미리보기 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-[#EFF6FF] rounded-lg flex items-center justify-center text-sm">👁️</div>
                <h2 className="font-bold text-[#191F28]">고객 화면 미리보기</h2>
              </div>
              {/* 모바일 프레임 */}
              <div className="border-2 border-[#E5E8EB] rounded-2xl p-4 bg-[#F8FAFF] relative">
                <div className="flex items-center justify-center gap-1 mb-4">
                  <div className="w-16 h-1.5 bg-[#D1D6DB] rounded-full mx-auto" />
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">📸</div>
                  <p className="text-sm font-semibold text-[#191F28] leading-snug mb-1">영수증 사진 한 장으로<br />네이버 리뷰를 완성해 드려요!</p>
                  <p className="text-xs text-[#8B95A1] mb-3">리뷰 작성 완료 시 <span className="font-semibold text-[#3182F6]">{rewardMap[reward]}</span> 지급</p>
                  <button className="w-full bg-[#3182F6] text-white text-sm font-bold py-3 rounded-xl shadow-sm">
                    📸 영수증 찍고 리뷰 작성하기
                  </button>
                </div>
              </div>
              <button className="w-full mt-4 bg-[#3182F6] text-white font-bold py-3 rounded-xl hover:bg-[#1B64DA] transition-colors text-sm">
                AI 리뷰 자동화 세팅 저장
              </button>
            </div>
          </div>
        )}

        {/* ─── QR 발급 탭 ─── */}
        {tab === 'qr' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* QR 코드 발급 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-[#EFF6FF] rounded-lg flex items-center justify-center text-sm">📱</div>
                <h2 className="font-bold text-[#191F28]">QR 코드 발급</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">매장명</label>
                  <input
                    type="text"
                    defaultValue="하랑마케팅 카페"
                    className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">메인 키워드</label>
                  <input
                    type="text"
                    value={mainKw}
                    onChange={e => setMainKw(e.target.value)}
                    className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-all"
                  />
                </div>

                {/* QR 미리보기 */}
                <div className="bg-[#F8FAFF] border-2 border-dashed border-[#3182F6]/30 rounded-2xl p-6 text-center">
                  <div className="inline-block bg-white p-3 rounded-xl shadow-sm mb-3">
                    <div className="w-28 h-28 bg-[#191F28] rounded-lg flex items-center justify-center">
                      <div className="grid grid-cols-5 gap-0.5">
                        {Array.from({ length: 25 }).map((_, i) => (
                          <div
                            key={i}
                            className={['w-3.5 h-3.5 rounded-sm', [0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24,6,12,18].includes(i) ? 'bg-[#191F28]' : 'bg-white'].join(' ')}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-[#8B95A1]">스캔하면 → 리뷰 작성 페이지로 바로 이동</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex-1 border-2 border-[#3182F6] text-[#3182F6] font-semibold py-3 rounded-xl hover:bg-[#EFF6FF] transition-colors text-sm"
                  >
                    {copied ? '✓ 복사됨!' : '🔗 리뷰 페이지 URL 복사'}
                  </button>
                  <button className="flex-1 bg-[#3182F6] text-white font-semibold py-3 rounded-xl hover:bg-[#1B64DA] transition-colors text-sm">
                    📥 QR 다운로드
                  </button>
                </div>
              </div>
            </div>

            {/* 텐트카드 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-[#EFF6FF] rounded-lg flex items-center justify-center text-sm">🏆</div>
                <h2 className="font-bold text-[#191F28]">테이블 비치용 텐트카드</h2>
              </div>

              {/* 텐트카드 미리보기 */}
              <div className="bg-gradient-to-br from-[#3182F6] to-[#1B64DA] rounded-2xl p-6 text-white text-center mb-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-6 -translate-x-6" />
                <div className="relative">
                  <p className="text-xs font-medium text-blue-100 mb-1">⭐ 리뷰 한 번으로</p>
                  <p className="text-lg font-bold mb-2">선물 받아가세요!</p>
                  <div className="bg-white rounded-xl p-3 mb-3 inline-block">
                    <div className="w-16 h-16 bg-[#191F28] rounded-lg mx-auto flex items-center justify-center">
                      <div className="grid grid-cols-4 gap-0.5">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <div key={i} className={['w-2.5 h-2.5 rounded-sm', [0,1,2,3,4,7,8,11,12,13,14,15].includes(i) ? 'bg-[#191F28]' : 'bg-white'].join(' ')} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-blue-100">📸 QR 스캔 → 영수증 촬영 → 리뷰 완성</p>
                  <div className="mt-3 bg-white/20 rounded-xl px-4 py-2 inline-block">
                    <p className="text-xs font-bold">🎁 {rewardMap[reward]}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#F8FAFF] rounded-xl p-4 mb-4">
                <p className="text-xs text-[#4E5968] font-semibold mb-1">🏆 이 QR을 테이블에 붙여두기만 하면</p>
                <p className="text-xs text-[#8B95A1]">리뷰가 자동으로 쏟아집니다!</p>
                <p className="text-xs text-[#8B95A1] mt-1">고객이 QR 스캔 → 영수증 촬영 → AI 리뷰 생성 → 네이버 복붙</p>
              </div>

              <button className="w-full bg-[#191F28] text-white font-bold py-3 rounded-xl hover:bg-[#2D3540] transition-colors text-sm">
                🖨️ 텐트카드 디자인 다운로드
              </button>
            </div>
          </div>
        )}

        {/* ─── 성과 리포트 탭 ─── */}
        {tab === 'report' && (
          <div className="space-y-5">

            {/* 요약 카드 */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'QR 스캔', value: '62회', sub: '이번 달', icon: '📱', color: '#3182F6' },
                { label: '전환 완료', value: '35건', sub: '리뷰 작성', icon: '✅', color: '#00C896' },
                { label: 'SEO 리뷰', value: '128개', sub: '누적', icon: '⭐', color: '#FF8C00' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-xs text-[#8B95A1]">{s.sub}</span>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-[#8B95A1] mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* 일별 추이 차트 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-[#191F28] mb-1">일별 스캔 & 전환 추이</h3>
                <p className="text-xs text-[#8B95A1] mb-5">2026년 4월</p>
                <div className="flex items-end gap-2 h-32">
                  {chartData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex gap-0.5 items-end" style={{ height: '96px' }}>
                        <div
                          className="flex-1 bg-[#3182F6] rounded-t-md"
                          style={{ height: (d.scan / maxScan * 96) + 'px' }}
                        />
                        <div
                          className="flex-1 bg-[#93C5FD] rounded-t-md"
                          style={{ height: (d.convert / maxScan * 96) + 'px' }}
                        />
                      </div>
                      <span className="text-[10px] text-[#8B95A1]">{d.day}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-xs text-[#4E5968]">
                    <div className="w-3 h-3 rounded-sm bg-[#3182F6]" />
                    스캔
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#4E5968]">
                    <div className="w-3 h-3 rounded-sm bg-[#93C5FD]" />
                    전환
                  </div>
                </div>
              </div>

              {/* 전환율 분석 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-[#191F28] mb-5">전환율 분석</h3>
                <div className="space-y-3 mb-5">
                  {[
                    { label: '전환 완료', count: 35, color: '#3182F6', pct: 56.5 },
                    { label: '작성 중', count: 15, color: '#F59E0B', pct: 24.2 },
                    { label: '이탈', count: 12, color: '#E5E8EB', pct: 19.3 },
                  ].map((r, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#4E5968] font-medium">{r.label}</span>
                        <span className="font-semibold text-[#191F28]">{r.count}건</span>
                      </div>
                      <div className="h-2 bg-[#F2F4F6] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: r.pct + '%', backgroundColor: r.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-[#EFF6FF] rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-[#3182F6]">56.5%</div>
                  <div className="text-xs text-[#8B95A1] mt-0.5">전환율</div>
                </div>
              </div>
            </div>

            {/* AI 인사이트 */}
            <div className="bg-gradient-to-r from-[#EFF6FF] to-[#F0FDF4] border border-[#DBEAFE] rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-[#3182F6] rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0">🤖</div>
              <div>
                <p className="text-sm font-bold text-[#191F28] mb-1">AI 인사이트</p>
                <p className="text-sm text-[#4E5968]">
                  <span className="font-semibold text-[#3182F6]">'가성비'</span> 키워드가 포함된 리뷰의 전환율이 평균 대비{' '}
                  <span className="font-semibold text-[#00C896]">+23%</span> 높아요!
                  서브 키워드에 <span className="font-semibold">'가성비'</span>를 첫 번째로 배치하면 성과가 올라갑니다.
                </p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
