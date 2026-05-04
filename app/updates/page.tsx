'use client'

export const dynamic = 'force-dynamic'

import { CheckCircle2, Clock, Wrench } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import PageHeader from '../components/PageHeader'
import Footer from '../components/Footer'

const UPDATES = [
  {
    date: '2026년 5월',
    items: [
      {
        title: '유튜브 커뮤니티 자동 업로드',
        desc: '유튜브 채널 커뮤니티 탭에 글을 자동으로 올리고, 첫 번째 댓글까지 달고 고정해 드립니다. 내 PC에 작은 프로그램을 설치하면 로컬루션에서 바로 사용할 수 있어요.',
      },
      {
        title: '업데이트 내역 페이지',
        desc: '새로 추가된 기능과 앞으로 나올 기능을 한눈에 볼 수 있는 이 페이지가 생겼습니다.',
      },
      {
        title: '쿠팡이츠 리뷰 관리',
        desc: '쿠팡이츠 리뷰도 네이버·배민처럼 AI가 답글을 자동으로 만들어 드립니다.',
      },
    ],
  },
  {
    date: '2026년 4월',
    items: [
      {
        title: '카드뉴스 자동 제작',
        desc: '인스타그램용 카드뉴스를 AI가 자동으로 만들어 드립니다. 업종과 주제만 넣으면 바로 완성됩니다.',
      },
      {
        title: '릴스·숏폼 콘텐츠 제작',
        desc: '틱톡, 유튜브 쇼츠, 인스타 릴스에 올릴 짧은 영상 대본을 AI가 만들어 드립니다.',
      },
      {
        title: '지역 커뮤니티',
        desc: '같은 지역 사장님들끼리 정보를 나누고 소통할 수 있는 공간입니다.',
      },
      {
        title: 'QR 리뷰 자동화',
        desc: '테이블에 QR 코드를 올려두면 손님이 스캔했을 때 AI가 리뷰를 대신 써줍니다. 손님은 한 번 터치로 네이버·구글에 리뷰를 남길 수 있어요.',
      },
      {
        title: '블로그 순위 추적',
        desc: '내가 쓴 블로그 글이 네이버에서 몇 위에 뜨는지 주기적으로 확인할 수 있습니다.',
      },
      {
        title: '플레이스 실시간 순위 확인',
        desc: '내 가게가 네이버 플레이스 검색 결과에서 몇 위에 뜨는지 실시간으로 알 수 있습니다.',
      },
    ],
  },
  {
    date: '2026년 3월',
    items: [
      {
        title: '리뷰 통합 관리 (네이버·구글·카카오·배민·요기요)',
        desc: '여러 플랫폼에 흩어진 리뷰를 한 곳에 모아보고, AI가 답글을 자동으로 만들어 드립니다. 따뜻하게·전문적으로·유쾌하게 등 말투도 직접 고를 수 있어요.',
      },
      {
        title: '블로그 글 자동 작성',
        desc: '가게 정보를 입력하면 네이버 블로그에 올릴 글을 AI가 대신 써줍니다.',
      },
      {
        title: '키워드 조회·분석',
        desc: '어떤 단어로 검색을 많이 하는지, 경쟁이 얼마나 치열한지 한눈에 볼 수 있습니다.',
      },
      {
        title: '고객 관리',
        desc: '단골·신규·VIP 손님을 구분해서 관리하고, 문자나 카카오 메시지를 한 번에 보낼 수 있습니다.',
      },
      {
        title: '대시보드',
        desc: '매장의 리뷰·키워드·활동 현황을 한 화면에서 한눈에 볼 수 있습니다.',
      },
    ],
  },
]

const UPCOMING = [
  {
    title: '구글·카카오 마케팅 도구',
    desc: '구글 지도와 카카오맵 노출을 높이고 리뷰를 관리하는 기능을 준비 중입니다.',
  },
  {
    title: '정산·급여 자동 계산',
    desc: '직원 근태를 기록하면 급여를 자동 계산하고, 매출을 캘린더로 볼 수 있게 됩니다.',
  },
  {
    title: '정부지원금 알림',
    desc: '소상공인이 받을 수 있는 지원금·보조금 정보를 자동으로 알려드립니다.',
  },
  {
    title: '인근 매장 협업 쿠폰',
    desc: '근처 가게끼리 서로 쿠폰을 교환해서 손님을 함께 늘릴 수 있는 기능입니다.',
  },
  {
    title: '노쇼 방지 타임세일',
    desc: '예약 취소가 생기면 근처 손님에게 즉시 할인 알림을 보내 빈자리를 채울 수 있습니다.',
  },
]

export default function UpdatesPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />

      <div className="md:ml-[220px] flex flex-col min-h-screen">
        <PageHeader
          icon={<Clock size={28} className="text-white" strokeWidth={2.5} />}
          title="업데이트 내역"
          subtitle="새로 추가된 기능과 앞으로 나올 기능을 소개합니다"
        />

        <main className="flex-1 px-4 md:px-6 py-6 max-w-4xl mx-auto w-full space-y-8">

          {/* 준비 중인 기능 */}
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0">
                <Wrench size={14} className="text-white" strokeWidth={2.5} />
              </div>
              <h2 className="text-base font-black text-[#191F28]">곧 나올 기능</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {UPCOMING.map((item, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E5E8EB] shadow-sm p-4 flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-[7px]" />
                  <div>
                    <p className="text-sm font-bold text-[#191F28]">{item.title}</p>
                    <p className="text-xs text-[#8B95A1] mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 업데이트 기록 */}
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#2563EB] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={14} className="text-white" strokeWidth={2.5} />
              </div>
              <h2 className="text-base font-black text-[#191F28]">추가된 기능</h2>
            </div>

            <div className="space-y-6">
              {UPDATES.map((group, gi) => (
                <div key={gi}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-black text-[#3182F6] bg-[#EFF6FF] px-3 py-1 rounded-full flex-shrink-0">
                      {group.date}
                    </span>
                    <div className="flex-1 h-px bg-[#E5E8EB]" />
                  </div>

                  <div className="space-y-2.5">
                    {group.items.map((item, ii) => (
                      <div key={ii} className="bg-white rounded-2xl border border-[#E5E8EB] shadow-sm p-4 flex gap-3">
                        <CheckCircle2 size={15} className="text-[#059669] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                        <div>
                          <p className="text-sm font-bold text-[#191F28]">{item.title}</p>
                          <p className="text-xs text-[#8B95A1] mt-1 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

        </main>

        <Footer />
      </div>
    </div>
  )
}
