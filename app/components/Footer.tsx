import Link from 'next/link'
import Image from 'next/image'
import {
  COMPANY,
  COMPANY_FOOTER_LINE_1,
  COMPANY_FOOTER_LINE_2,
  COMPANY_FOOTER_LINE_3,
  COMPANY_FOOTER_LINE_4,
  COMPANY_FOOTER_LINE_5,
  COMPANY_COPYRIGHT,
} from '../lib/company'

export default function Footer() {
  return (
    <footer className="w-full bg-[#191F28] text-white py-10 px-5 md:py-12 md:px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          {/* 브랜드 */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              {/* 로고는 public/logo.svg 로 분리 — 번들 크기 및 캐싱 최적화 */}
              <Image src="/logo.svg" alt={`${COMPANY.BRAND} 로고`} width={36} height={36} className="select-none" />
              <div>
                <span className="text-lg font-black text-white">{COMPANY.BRAND}</span>
                <span className="text-[10px] text-[#3182F6] font-bold block tracking-widest">{COMPANY.BRAND_EN.toUpperCase()}</span>
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
                <Link href="/about" className="block text-[#8B95A1] hover:text-white transition-colors">회사 소개</Link>
                <Link href="/service-intro" className="block text-[#8B95A1] hover:text-white transition-colors">서비스 소개</Link>
                <Link href="/pricing" className="block text-[#8B95A1] hover:text-white transition-colors">요금</Link>
                <Link href="/community" className="block text-[#8B95A1] hover:text-white transition-colors">커뮤니티</Link>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-300 mb-3">고객지원</div>
              <div className="space-y-2">
                <Link href="/inquiry" className="block text-[#8B95A1] hover:text-white transition-colors">문의하기</Link>
                <a href={COMPANY.KAKAO_OPENCHAT} target="_blank" rel="noopener" className="block text-[#8B95A1] hover:text-white transition-colors">카카오 상담</a>
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

        {/* ─── 법정 사업자 정보 (lib/company.ts 단일 소스) ─── */}
        <div className="border-t border-gray-700 pt-6 flex flex-col md:flex-row justify-between gap-3 text-xs text-[#8B95A1]">
          <div className="space-y-1">
            <div>{COMPANY_FOOTER_LINE_1}</div>
            <div>{COMPANY_FOOTER_LINE_2}</div>
            <div>{COMPANY_FOOTER_LINE_3}</div>
            <div>{COMPANY_FOOTER_LINE_4}</div>
            <div>{COMPANY_FOOTER_LINE_5}</div>
          </div>
          <div className="self-start md:self-end">{COMPANY_COPYRIGHT}</div>
        </div>
      </div>
    </footer>
  )
}
