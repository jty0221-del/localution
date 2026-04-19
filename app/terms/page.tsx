import Link from 'next/link'
import Footer from '../components/Footer'
import { COMPANY } from '../lib/company'

export default function Terms() {
  const sections = [
    {
      title: '제1조 (목적)',
      content: `이 약관은 ${COMPANY.LEGAL_NAME}(이하 "회사")이 제공하는 ${COMPANY.BRAND} 서비스(이하 "서비스")의 이용 조건 및 절차, 회사와 회원 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.`
    },
    {
      title: '제2조 (정의)',
      content: `"서비스"란 회사가 제공하는 소상공인 마케팅 관리 플랫폼 ${COMPANY.BRAND} 및 관련 제반 서비스를 의미합니다. "회원"이란 본 약관에 동의하고 서비스를 이용하는 자를 말합니다. "콘텐츠"란 서비스 내에서 제작·게시되는 모든 정보를 말합니다.`
    },
    {
      title: '제3조 (약관의 효력 및 변경)',
      content: '본 약관은 서비스를 이용하고자 하는 모든 회원에게 적용됩니다. 회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항을 통해 공지합니다. 변경된 약관에 동의하지 않는 회원은 서비스 이용을 중단하고 탈퇴할 수 있습니다.'
    },
    {
      title: '제4조 (서비스의 제공)',
      content: '회사는 소상공인의 마케팅 활동을 지원하기 위한 리뷰 관리, 고객 관리, QR 코드 생성, AI 리뷰 답변, 주간 리포트 등의 서비스를 제공합니다. 서비스는 연중무휴, 1일 24시간 제공됩니다. 단, 회사의 업무 또는 기술상의 이유로 서비스가 일시 중단될 수 있으며, 이 경우 사전 또는 사후 공지합니다.'
    },
    {
      title: '제5조 (이용요금 및 결제)',
      content: '서비스 이용요금은 서비스 내 요금 안내 페이지에 게시된 금액에 따릅니다. 이용요금은 매월 결제일에 자동으로 청구됩니다. 결제는 토스페이먼츠를 통한 카드 정기결제 방식으로 이루어집니다. 이용요금은 부가세 포함 금액입니다.'
    },
    {
      title: '제6조 (서비스 해지)',
      content: '회원은 언제든지 서비스 해지를 신청할 수 있습니다. 해지 신청 후 다음 결제일까지 서비스 이용이 가능하며, 이후 서비스가 종료됩니다. 해지 후 7일간 동일 계정으로 재가입이 제한됩니다. 해지 후 30일이 경과하면 회원의 데이터는 삭제됩니다.'
    },
    {
      title: '제7조 (개인정보보호)',
      content: '회사는 회원의 개인정보를 보호하기 위해 관련 법령을 준수하며, 개인정보처리방침에 따라 회원의 개인정보를 관리합니다. 개인정보처리방침은 별도 페이지에서 확인하실 수 있습니다.'
    },
    {
      title: '제8조 (면책조항)',
      content: '회사는 천재지변, 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다. 회원의 귀책사유로 인한 서비스 이용 장애에 대해 회사는 책임지지 않습니다. 회원이 서비스를 이용하여 얻은 정보로 인해 발생한 손해에 대해 회사는 책임지지 않습니다.'
    },
    {
      title: '제9조 (분쟁해결)',
      content: '본 약관과 관련하여 발생하는 분쟁은 대한민국 법률에 따라 처리됩니다. 분쟁이 발생할 경우 회사 소재지를 관할하는 법원을 전속 관할 법원으로 합니다.'
    },
  ]

  return (
    <div className="min-h-screen bg-[#F2F4F6]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/settings" className="text-sm text-[#3182F6] hover:underline flex items-center gap-1">
            ← 설정으로 돌아가기
          </Link>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-[#191F28] mb-2">이용약관</h1>
          <p className="text-sm text-[#8B95A1] mb-8">시행일: 2024년 1월 1일</p>
          <div className="space-y-8">
            {sections.map((s, i) => (
              <div key={i}>
                <h2 className="font-bold text-[#191F28] mb-3">{s.title}</h2>
                <p className="text-sm text-[#4E5968] leading-relaxed">{s.content}</p>
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  )
}
