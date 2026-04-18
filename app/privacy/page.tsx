import Link from 'next/link'
import Footer from '../components/Footer'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#F2F4F6]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/settings" className="text-sm text-[#3182F6] hover:underline flex items-center gap-1">
            ← 설정으로 돌아가기
          </Link>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-[#191F28] mb-2">개인정보처리방침</h1>
          <p className="text-sm text-[#8B95A1] mb-8">시행일: 2024년 1월 1일 / 최종 수정일: 2024년 1월 1일</p>

          <div className="space-y-8 text-sm text-[#4E5968] leading-relaxed">
            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제1조 (개인정보의 처리 목적)</h2>
              <p>하랑마케팅(이하 "회사")은 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
              <ul className="mt-3 space-y-1.5 list-disc list-inside text-[#4E5968]">
                <li>서비스 제공 및 계약 이행</li>
                <li>회원 관리 및 본인 확인</li>
                <li>결제 처리 및 요금 청구</li>
                <li>서비스 개선 및 신규 서비스 개발</li>
                <li>법령상 의무 이행</li>
              </ul>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제2조 (수집하는 개인정보 항목)</h2>
              <div className="overflow-x-auto">
                <table className="w-full border border-[#E5E8EB] rounded-xl overflow-hidden text-xs">
                  <thead className="bg-[#F2F4F6]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-[#191F28]">구분</th>
                      <th className="px-4 py-3 text-left font-semibold text-[#191F28]">수집 항목</th>
                      <th className="px-4 py-3 text-left font-semibold text-[#191F28]">수집 목적</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['필수', '이름, 이메일, 전화번호', '회원 가입 및 관리'],
                      ['필수', '결제 정보(카드 빌링키)', '서비스 이용 요금 결제'],
                      ['선택', '매장명, 주소, 사업자번호', '서비스 제공 및 맞춤 기능'],
                    ].map(([type, item, purpose], i) => (
                      <tr key={i} className="border-t border-[#E5E8EB]">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${type === '필수' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{type}</span>
                        </td>
                        <td className="px-4 py-3">{item}</td>
                        <td className="px-4 py-3 text-[#8B95A1]">{purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제3조 (개인정보의 보유 및 이용 기간)</h2>
              <p>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
              <div className="mt-3 space-y-2">
                <p>• 회원 정보: 서비스 탈퇴 후 30일</p>
                <p>• 결제 정보: 전자상거래법에 따라 5년</p>
                <p>• 서비스 이용 기록: 통신비밀보호법에 따라 3개월</p>
              </div>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제4조 (개인정보의 제3자 제공)</h2>
              <p>회사는 원칙적으로 정보주체의 개인정보를 수집·이용 목적으로 명시한 범위 내에서 처리하며, 다음의 경우를 제외하고는 정보주체의 동의 없이 제3자에게 제공하지 않습니다.</p>
              <div className="mt-3 space-y-1">
                <p>• 토스페이먼츠(주): 결제 처리 목적</p>
                <p>• 법령에 의한 요청이 있는 경우</p>
              </div>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제5조 (정보주체의 권리·의무)</h2>
              <p>정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다: 개인정보 열람 요구, 오류 정정 요구, 삭제 요구, 처리 정지 요구. 권리 행사는 이메일(harangmarketing@naver.com)을 통해 하실 수 있으며 지체 없이 조치하겠습니다.</p>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제6조 (개인정보 보호책임자)</h2>
              <div className="bg-[#F2F4F6] rounded-xl p-4 space-y-1.5">
                <p><strong>개인정보 보호책임자:</strong> 전태영</p>
                <p><strong>소속/직위:</strong> 하랑마케팅 / 대표</p>
                <p><strong>연락처:</strong> 010-7510-9054</p>
                <p><strong>이메일:</strong> harangmarketing@naver.com</p>
              </div>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제7조 (개인정보 처리방침 변경)</h2>
              <p>이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  )
}

