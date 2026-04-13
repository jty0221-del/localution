import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[#E5E8EB] pt-8 pb-10 text-xs text-[#8B95A1]">
      <div className="flex flex-wrap gap-4 mb-5">
        <Link href="/terms" className="hover:text-[#3182F6] transition-colors underline">이용약관</Link>
        <Link href="/privacy" className="hover:text-[#3182F6] transition-colors underline font-semibold">개인정보처리방침</Link>
      </div>
      <div className="space-y-1.5 text-[11px] leading-relaxed">
        <p className="font-semibold text-[#4E5968] text-sm">하랑</p>
        <p>대표: 전태영 &nbsp;|&nbsp; 사업자등록번호: 706-68-00281</p>
        <p>통신판매업신고번호: 2020-서울강서-1482</p>
        <p>주소: 경기 고양시 일산동구 장백로19 더루벤투스카운티 501호</p>
        <p>전화: 010-7510-9054 &nbsp;|&nbsp; 이메일: harangmarketing@naver.com</p>
        <p>개인정보보호책임자: 하랑 (harangmarketing@naver.com)</p>
      </div>
      <p className="mt-5 text-[11px]">© 2024 하랑. All rights reserved.</p>
    </footer>
  )
}
