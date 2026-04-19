import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="w-full bg-[#191F28] text-white py-10 px-5 md:py-12 md:px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          {/* 브랜드 */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              {/* 로고는 public/logo.svg 로 분리 — 번들 크기 및 캐싱 최적화 */}
              <img src="/logo.svg" alt="로컬루션 로고" width={36} height={36} className="select-none" />
              <div>
                <span className="text-lg font-black text-white">로컬루션</span>
                <span className="text-[10px] text-[#3182F6] font-bold block tracking-widest">LOCALUTION</span>
              </div>
            </div>
            <p className="text-[#8B95A1] text-xs leading-relaxed max-w-xs">
              소상공인과 마케터를 위한<br />AI 기반 올인원 비즈니스 자동화 플랫폼
            </p>
          </div>

          {/* 링크 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="font-semibold text-gray-300 mb-3">서비스</div>
              <div className="space-y-2">
                <Link href="/service-intro" className="block text-[#8B95A1] hover:text-white transition-colors">서비스 소개</Link>
                <Link href="/pricing" className="block text-[#8B95A1] hover:text-white transition-colors">요금</Link>
                <Link href="/community" className="block text-[#8B95A1] hover:text-white transition-colors">커뮤니티</Link>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-300 mb-3">고객지원</div>
              <div className="space-y-2">
                <Link href="/inquiry" className="block text-[#8B95A1] hover:text-white transition-colors">문의하기</Link>
                <a href="https://open.kakao.com/o/gXyJ6xrg" target="_blank" rel="noopener" className="block text-[#8B95A1] hover:text-white transition-colors">카카오 상담</a>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-300 mb-3">법적 고지</div>
              <div className="space-y-2">
                <Link href="/terms" className="block text-[#8B95A1] hover:text-white transition-colors">이용약관</Link>
                <Link href="/privacy" className="block text-[#8B95A1] hover:text-white transition-colors">개인정보처리방침</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6 flex flex-col md:flex-row justify-between gap-3 text-xs text-[#8B95A1]">
          <div className="space-y-1">
            <div>하랑 | 대표: 전태영 | 사업자등록번호: 706-68-00281</div>
            <div>통신판매업신고번호: 2020-서울강서-1482</div>
            <div>주소: 경기 고양시 일산동구 장백로19 더루벤투스카운티 501호</div>
            <div>전화: 010-7510-9054 | 이메일: harangmarketing@naver.com</div>
            <div>개인정보보호책임자: 하랑 (harangmarketing@naver.com)</div>
          </div>
          <div className="self-start md:self-end">© 2026 하랑. All rights reserved.</div>
        </div>
      </div>
    </footer>
  )
}
