// app/privacy/page.tsx
// ============================================================
// 23차-7: 개인정보처리방침 v2 — 외부 플랫폼 계정정보 처리 조문 추가 (2026-04-21)
//
//   · 제2조 수집 항목 확대: 외부 플랫폼 로그인 정보 추가
//   · 제3조 보유기간: 플랫폼 자격증명 별도 보유 기간 명시
//   · 제8조 신규: 외부 플랫폼 계정정보의 처리 (암호화 방식, 접근 통제)
//   · 제9조 신규: 자동 접속 및 로그 보관
//   · 시행일: 2026-05-01
// ============================================================
import Link from 'next/link'
import Footer from '../components/Footer'
import { COMPANY } from '../lib/company'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/settings" className="text-sm text-[#3182F6] hover:underline flex items-center gap-1">
            ← 설정으로 돌아가기
          </Link>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-[#191F28] mb-2">개인정보처리방침</h1>
          <p className="text-sm text-[#8B95A1] mb-2">
            <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-[#3182F6] text-xs font-medium mr-2">v2.0</span>
            시행일: 2026년 5월 1일
          </p>
          <p className="text-xs text-[#8B95A1] mb-8">
            변경 이력: 2024.1.1 v1.0 최초 시행 → 2026.5.1 v2.0 (외부 플랫폼 계정정보 처리 조문 신설)
          </p>

          <div className="space-y-8 text-sm text-[#4E5968] leading-relaxed">
            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제1조 (개인정보의 처리 목적)</h2>
              <p>{COMPANY.LEGAL_NAME}(이하 "회사")은 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
              <ul className="mt-3 space-y-1.5 list-disc list-inside text-[#4E5968]">
                <li>서비스 제공 및 계약 이행</li>
                <li>회원 관리 및 본인 확인</li>
                <li>결제 처리 및 요금 청구</li>
                <li>외부 플랫폼 연동을 통한 리뷰 수집, 답글 대리 게시, 순위 추적 업무 수행</li>
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
                      ['선택', '외부 플랫폼 로그인 정보(아이디, 비밀번호)', '플랫폼 연동 기능(리뷰·답글·순위) 이용'],
                      ['자동수집', '접속 로그, IP 주소, 쿠키, 서비스 이용 기록', '부정 이용 방지 및 서비스 품질 개선'],
                    ].map(([type, item, purpose], i) => (
                      <tr key={i} className="border-t border-[#E5E8EB]">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${type === '필수' ? 'bg-red-100 text-red-600' : type === '선택' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-[#3182F6]'}`}>{type}</span>
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
                <p>• 외부 플랫폼 로그인 정보: 회원이 연결 해제 시 즉시 파기, 서비스 탈퇴 시 즉시 파기</p>
                <p>• 플랫폼에서 수집한 리뷰·답글·순위 데이터: 서비스 탈퇴 후 30일</p>
                <p>• 대리 업무 접근 로그: 3년 (법적 분쟁 대응 및 감사 목적)</p>
                <p>• 서비스 이용 기록: 통신비밀보호법에 따라 3개월</p>
              </div>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제4조 (개인정보의 제3자 제공)</h2>
              <p>회사는 원칙적으로 정보주체의 개인정보를 수집·이용 목적으로 명시한 범위 내에서 처리하며, 다음의 경우를 제외하고는 정보주체의 동의 없이 제3자에게 제공하지 않습니다.</p>
              <div className="mt-3 space-y-1">
                <p>• 토스페이먼츠(주): 결제 처리 목적</p>
                <p>• Anthropic, PBC: AI 답글 초안 생성 목적 (리뷰 원문만 전송, 회원 개인정보 미전송)</p>
                <p>• 법령에 의한 요청이 있는 경우</p>
              </div>
              <p className="mt-3 text-xs text-[#8B95A1]">
                ※ 외부 플랫폼 로그인 정보는 제3자에게 제공되지 않으며, 대리 업무 수행을 위해 회사의 Worker 서버에서만 복호화되어 사용됩니다.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제5조 (정보주체의 권리·의무)</h2>
              <p>정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다: 개인정보 열람 요구, 오류 정정 요구, 삭제 요구, 처리 정지 요구. 권리 행사는 이메일({COMPANY.PRIVACY_OFFICER_EMAIL})을 통해 하실 수 있으며 지체 없이 조치하겠습니다. 외부 플랫폼 계정 연결 해제는 [마이페이지 &gt; 플랫폼 연결]에서 즉시 처리됩니다.</p>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제6조 (개인정보 보호책임자)</h2>
              <div className="bg-[#F2F4F6] rounded-xl p-4 space-y-1.5">
                <p><strong>개인정보 보호책임자:</strong> {COMPANY.PRIVACY_OFFICER_NAME}</p>
                <p><strong>소속/직위:</strong> {COMPANY.LEGAL_NAME} / 대표</p>
                <p><strong>연락처:</strong> {COMPANY.PHONE}</p>
                <p><strong>이메일:</strong> {COMPANY.PRIVACY_OFFICER_EMAIL}</p>
              </div>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제7조 (개인정보 처리방침 변경)</h2>
              <p>이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전(회원에게 불리한 변경의 경우 30일 전)부터 공지사항을 통하여 고지할 것입니다.</p>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제8조 (외부 플랫폼 계정정보의 처리)</h2>
              <p>회사는 회원이 서비스의 외부 플랫폼 연동 기능을 이용하기 위해 제공한 로그인 정보(아이디 및 비밀번호, 이하 "자격증명")를 다음과 같이 처리합니다.</p>

              <div className="mt-4 space-y-3">
                <div className="bg-[#F2F4F6] rounded-xl p-4">
                  <p className="font-semibold text-[#191F28] mb-2">① 암호화 저장</p>
                  <p>자격증명은 AES-256-GCM 암호화 알고리즘을 이용해 이중 암호화(Data Encryption Key + Key Encryption Key 분리) 방식으로 저장합니다. 데이터베이스가 유출되더라도 Key Encryption Key 없이는 복호화가 불가능하며, Key Encryption Key는 데이터베이스와 물리적으로 분리된 환경(환경변수)에 보관됩니다.</p>
                </div>

                <div className="bg-[#F2F4F6] rounded-xl p-4">
                  <p className="font-semibold text-[#191F28] mb-2">② 접근 통제</p>
                  <p>자격증명은 대리 업무를 수행하는 Worker 서버 프로세스의 메모리 상에서만 일시적으로 복호화되며, 업무 완료 후 즉시 메모리에서 해제됩니다. 회사의 내부 관리자도 평문 비밀번호를 열람할 수 없도록 설계되어 있습니다.</p>
                </div>

                <div className="bg-[#F2F4F6] rounded-xl p-4">
                  <p className="font-semibold text-[#191F28] mb-2">③ 이용 목적 한정</p>
                  <p>자격증명은 다음 각 호의 목적 이외에는 절대 사용되지 않습니다.</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside pl-2">
                    <li>회원이 위임한 대리 업무(리뷰 수집, 답글 게시, 순위 조회)의 수행</li>
                    <li>연결 상태 확인 및 유지</li>
                  </ul>
                </div>

                <div className="bg-[#F2F4F6] rounded-xl p-4">
                  <p className="font-semibold text-[#191F28] mb-2">④ 파기</p>
                  <p>회원이 [마이페이지 &gt; 플랫폼 연결]에서 연결 해제를 요청하거나 서비스를 탈퇴하는 경우, 저장된 자격증명은 즉시(최대 24시간 이내) 삭제됩니다. 삭제 후에는 회사가 해당 비밀번호를 복구하거나 재사용할 수 없습니다.</p>
                </div>

                <div className="bg-[#F2F4F6] rounded-xl p-4">
                  <p className="font-semibold text-[#191F28] mb-2">⑤ 비밀번호 변경 권고</p>
                  <p>회원은 서비스 해지 후 외부 플랫폼에서 해당 계정의 비밀번호를 직접 변경하시기를 권고합니다. 회사는 파기 절차를 철저히 이행하지만, 만약의 보안 사고에 대비하여 비밀번호 변경을 병행하시면 보다 안전합니다.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제9조 (대리 업무 접근 로그의 보관)</h2>
              <p>회사는 회원의 법적 권익 보호 및 분쟁 대응을 위해 대리 업무 수행 시 다음 로그를 3년간 보관합니다.</p>
              <div className="mt-3 space-y-1">
                <p>• 접속 일시 및 IP 주소 (회사 Worker 서버의 IP)</p>
                <p>• 대상 외부 플랫폼 및 계정 식별값(아이디의 해시값, 평문 미보관)</p>
                <p>• 수행 업무 유형(리뷰 수집 / 답글 게시 / 순위 조회)</p>
                <p>• 업무 수행 결과(성공 / 실패 / 오류 코드)</p>
              </div>
              <p className="mt-3 text-xs text-[#8B95A1]">
                ※ 회원이 본인의 접근 로그 열람을 요청할 경우 {COMPANY.PRIVACY_OFFICER_EMAIL}으로 요청하시면 영업일 기준 7일 이내에 제공합니다.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제10조 (안전성 확보 조치)</h2>
              <p>회사는 개인정보 및 외부 플랫폼 자격증명의 안전성 확보를 위해 다음의 조치를 취하고 있습니다.</p>
              <div className="mt-3 space-y-1">
                <p>• 관리적 조치: 내부 관리계획 수립·시행, 정기적 직원 교육</p>
                <p>• 기술적 조치: AES-256-GCM 이중 암호화, HTTPS 전구간 적용, 접근 권한 최소화, 접근 기록 보관</p>
                <p>• 물리적 조치: 데이터 보관 서버의 접근 통제</p>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-[#E5E8EB] space-y-2 text-sm">
            <Link href="/terms" className="text-[#3182F6] hover:underline block">
              → 이용약관 보기
            </Link>
            <Link href="/legal/platform-consent" className="text-[#3182F6] hover:underline block">
              → 대리권 위임동의서 보기
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  )
}
