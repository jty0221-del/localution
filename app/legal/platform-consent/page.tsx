// app/legal/platform-consent/page.tsx
// ============================================================
// 23차-7: 대리권 위임동의서 v1.0 (2026-04-21)
//
//   · 외부 플랫폼 계정 대리 이용을 위한 명시적 동의 문서
//   · 실제 동의 절차는 /my/platforms 에서 플랫폼 연결 시 전자서명 방식으로 수행 (23차-8 에서 구현)
//   · 본 페이지는 동의서 원문 열람용
//   · 시행일: 2026-05-01
// ============================================================
import Link from 'next/link'
import Footer from '../../components/Footer'
import { COMPANY } from '../../lib/company'

export default function PlatformConsent() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/terms" className="text-sm text-[#3182F6] hover:underline flex items-center gap-1">
            ← 이용약관으로 돌아가기
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-[#191F28] mb-2">외부 플랫폼 대리권 위임동의서</h1>
          <p className="text-sm text-[#8B95A1] mb-2">
            <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-[#3182F6] text-xs font-medium mr-2">v1.0</span>
            시행일: 2026년 5월 1일
          </p>
          <p className="text-xs text-[#8B95A1] mb-8">
            본 동의서는 이용약관 제5조에 근거하여, 회원이 {COMPANY.LEGAL_NAME}(이하 "회사")에 외부 플랫폼 계정의 대리 이용을 명시적으로 위임하는 문서입니다.
          </p>

          {/* 동의서 본문 */}
          <div className="space-y-8 text-sm text-[#4E5968] leading-relaxed">

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="font-semibold text-[#191F28] mb-2">읽어주세요</p>
              <p className="text-xs">
                본 동의서는 회원 본인이 운영하는 외부 플랫폼 계정의 대리 이용을 회사에 위임하는 법적 효력을 가지는 문서입니다. 내용을 충분히 읽고 이해한 후 동의 여부를 결정해주세요. 동의 후에는 언제든지 [마이페이지 &gt; 플랫폼 연결]에서 철회할 수 있습니다.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제1조 (위임의 목적과 범위)</h2>
              <p>본인(이하 "위임인")은 회사가 위임인을 대리하여 다음의 외부 플랫폼 서비스(이하 "대상 플랫폼")에 접속하여 대리 업무를 수행할 수 있도록 명시적으로 위임합니다.</p>
              <div className="mt-3 space-y-1">
                <p>• 네이버 플레이스 (smartplace.naver.com)</p>
                <p>• 배달의민족 사장님광장 (ceo.baemin.com)</p>
                <p>• 요기요 사장님 포털 (ceo.yogiyo.co.kr)</p>
                <p>• 쿠팡이츠 스토어 (store.coupangeats.com)</p>
              </div>
              <p className="mt-3 text-xs text-[#8B95A1]">
                ※ 위 플랫폼 중 위임인이 실제로 연결한 계정에 한하여 대리권이 효력을 가지며, 미연결 플랫폼에 대해서는 어떠한 대리권도 발생하지 않습니다.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제2조 (위임 업무의 구체적 범위)</h2>
              <p>회사가 수행할 수 있는 대리 업무는 다음 각 호로 한정됩니다.</p>
              <div className="mt-3 space-y-2">
                <div className="bg-[#F2F4F6] rounded-xl p-3">
                  <p className="font-semibold text-[#191F28]">① 리뷰 및 평점 데이터 수집</p>
                  <p className="text-xs mt-1">위임인의 매장에 달린 리뷰·평점·작성자 닉네임(공개된 범위)·작성일시를 주기적으로 조회·저장합니다.</p>
                </div>
                <div className="bg-[#F2F4F6] rounded-xl p-3">
                  <p className="font-semibold text-[#191F28]">② 답글 게시</p>
                  <p className="text-xs mt-1">위임인이 직접 작성했거나 회사의 AI 도구로 초안을 생성한 후 위임인이 승인한 답글을 해당 리뷰에 게시합니다. 위임인이 "자동 승인 모드"를 활성화한 경우에는 사전 승인 없이 AI 답글이 게시될 수 있으며, 이 경우에도 내용에 대한 최종 책임은 위임인에게 있습니다.</p>
                </div>
                <div className="bg-[#F2F4F6] rounded-xl p-3">
                  <p className="font-semibold text-[#191F28]">③ 매장 노출 순위 조회</p>
                  <p className="text-xs mt-1">특정 키워드·지역 조합에 대해 위임인 매장의 노출 순위를 조회·기록합니다.</p>
                </div>
                <div className="bg-[#F2F4F6] rounded-xl p-3">
                  <p className="font-semibold text-[#191F28]">④ 로그인 세션 유지</p>
                  <p className="text-xs mt-1">위 업무를 수행하기 위한 로그인 상태 확인 및 필요 시 재로그인 절차를 수행합니다.</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-red-600">
                ※ 위 범위에 해당하지 않는 업무(매장 정보 수정, 메뉴 등록, 결제 관련 업무, 매장 삭제 등)는 위임 범위에 포함되지 않으며, 회사는 이를 절대 수행하지 않습니다.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제3조 (로그인 정보의 제공과 보호)</h2>
              <p>① 위임인은 대리 업무 수행을 위해 대상 플랫폼의 아이디 및 비밀번호를 회사에 제공합니다.</p>
              <p className="mt-2">② 회사는 제공받은 로그인 정보를 AES-256-GCM 암호화 알고리즘으로 이중 암호화(DEK + KEK 분리 방식)하여 저장합니다.</p>
              <p className="mt-2">③ 복호화에 필요한 Key Encryption Key는 데이터베이스와 분리된 환경(환경변수)에 보관되며, 회사의 내부 관리자도 평문 비밀번호를 조회할 수 없습니다.</p>
              <p className="mt-2">④ 대리 업무 수행 시에만 회사의 Worker 서버 메모리 상에서 일시적으로 복호화되며, 업무 완료 즉시 메모리에서 해제됩니다.</p>
              <p className="mt-2">⑤ 자세한 보호 조치는 개인정보처리방침 제8조를 참조하시기 바랍니다.</p>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제4조 (위임의 기간)</h2>
              <p>본 위임의 효력은 위임인이 동의한 날부터 발생하며, 다음 각 호 중 어느 하나에 해당하는 때 종료됩니다.</p>
              <div className="mt-3 space-y-1">
                <p>• 위임인이 [마이페이지 &gt; 플랫폼 연결]에서 연결을 해제한 때</p>
                <p>• 위임인이 서비스에서 탈퇴한 때</p>
                <p>• 회사가 서비스를 종료한 때</p>
                <p>• 대상 플랫폼이 자동화 접근을 완전 차단하여 대리 업무 수행이 기술적으로 불가능해진 때</p>
              </div>
              <p className="mt-3">위임 종료 시 회사는 저장된 자격증명을 즉시(24시간 이내) 파기합니다.</p>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제5조 (위임인의 확인 사항)</h2>
              <p>위임인은 본 동의서에 동의하기 전 다음 사항을 확인합니다.</p>
              <div className="mt-3 space-y-3">
                <div className="bg-[#F2F4F6] rounded-xl p-3">
                  <p className="font-semibold text-[#191F28]">① 본인 운영 계정만 연결</p>
                  <p className="text-xs mt-1">위임인은 본인이 정당한 운영 권한을 가진 매장 계정만을 연결합니다. 타인 또는 가맹점주·본사의 계정을 무단으로 연결하는 경우, 발생하는 모든 법적 책임은 위임인 본인에게 귀속됩니다.</p>
                </div>
                <div className="bg-[#F2F4F6] rounded-xl p-3">
                  <p className="font-semibold text-[#191F28]">② 플랫폼 이용약관 준수 의무</p>
                  <p className="text-xs mt-1">대상 플랫폼의 이용약관 및 운영정책을 준수할 책임은 위임인에게 있습니다. 일부 플랫폼은 자동화 도구 이용을 제한할 수 있으며, 이로 인해 계정에 일시적 제한·정지·해지가 발생할 수 있음을 충분히 인지하였습니다.</p>
                </div>
                <div className="bg-[#F2F4F6] rounded-xl p-3">
                  <p className="font-semibold text-[#191F28]">③ 계정 보안 책임</p>
                  <p className="text-xs mt-1">위임인은 제공한 로그인 정보가 변경된 경우 즉시 서비스에 재등록할 의무가 있으며, 이를 게을리하여 대리 업무가 중단되는 경우 회사는 책임을 지지 않습니다.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제6조 (회사의 면책)</h2>
              <p>다음 각 호의 사유로 발생하는 손해에 대해 회사는 법률이 정한 범위 내에서 면책됩니다.</p>
              <div className="mt-3 space-y-1">
                <p>• 대상 플랫폼의 이용약관 변경, 정책 개정, 시스템 점검 등으로 인한 대리 업무 중단</p>
                <p>• 대상 플랫폼의 자동화 접근 차단 정책으로 인한 위임인 계정의 일시적 제한·정지</p>
                <p>• 위임인이 제공한 로그인 정보의 오류 또는 변경 미반영으로 인한 업무 실패</p>
                <p>• 위임인이 "자동 승인 모드"를 활성화한 상태에서 게시된 AI 답글의 내용</p>
                <p>• 천재지변·불가항력 사유로 인한 서비스 중단</p>
              </div>
              <p className="mt-3 text-xs text-[#8B95A1]">
                ※ 단, 회사의 고의 또는 중과실로 인한 손해의 경우에는 그러하지 아니합니다. 또한 회사는 위임인의 법적 대응을 위해 필요한 기록(동의 이력, 위임 범위, 접근 로그)을 요청 시 제공합니다.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제7조 (동의 철회)</h2>
              <p>위임인은 언제든지 [마이페이지 &gt; 플랫폼 연결 &gt; 연결 해제]를 통해 본 위임을 철회할 수 있습니다. 철회 즉시 회사는 다음 조치를 취합니다.</p>
              <div className="mt-3 space-y-1">
                <p>• 저장된 자격증명 즉시 파기</p>
                <p>• 해당 플랫폼에 대한 대기 중인 대리 업무 즉시 중단</p>
                <p>• 연결 해제 사실을 시스템 로그에 기록</p>
              </div>
              <p className="mt-3 text-xs text-[#8B95A1]">
                ※ 이미 게시된 답글은 회사가 회수할 수 없으며, 위임인이 직접 해당 플랫폼에서 삭제하셔야 합니다.
              </p>
            </div>

            {/* 실제 동의 UI 안내 */}
            <div className="border-t border-[#E5E8EB] pt-6">
              <h2 className="font-bold text-[#191F28] mb-3">동의 절차 안내</h2>
              <p>본 동의서의 실제 동의는 외부 플랫폼을 연결하시는 시점에 [마이페이지 &gt; 플랫폼 연결] 화면에서 수행됩니다. 동의 시 아래 3개 항목을 체크하시게 되며, 동의 시각과 동의 버전(v1.0)이 전자적 기록으로 저장됩니다.</p>

              <div className="mt-4 bg-blue-50 rounded-xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded border-2 border-[#3182F6] flex-shrink-0 mt-0.5"></div>
                  <div>
                    <p className="font-semibold text-[#191F28] text-sm">(필수) 본 동의서의 내용을 모두 읽었으며, 제2조의 위임 범위에 동의합니다.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded border-2 border-[#3182F6] flex-shrink-0 mt-0.5"></div>
                  <div>
                    <p className="font-semibold text-[#191F28] text-sm">(필수) 연결하려는 외부 플랫폼 계정이 본인이 정당한 권한을 가진 계정임을 확인합니다.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded border-2 border-[#3182F6] flex-shrink-0 mt-0.5"></div>
                  <div>
                    <p className="font-semibold text-[#191F28] text-sm">(필수) 대상 플랫폼의 자동화 접근 정책으로 인해 계정에 제한이 발생할 수 있음을 인지하며, 이에 관한 제6조의 면책 조항에 동의합니다.</p>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs text-[#8B95A1]">
                동의 완료 시 저장되는 기록: 동의 일시(ISO 8601 UTC) · 동의 버전(v1.0) · 동의 IP 주소 · 대상 플랫폼 · User-Agent. 본 기록은 위임인의 법적 보호 및 분쟁 대응을 위해 3년간 보관됩니다.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-[#191F28] mb-3">제8조 (문의)</h2>
              <p>본 동의서에 관한 문의는 다음 연락처로 주시기 바랍니다.</p>
              <div className="mt-3 bg-[#F2F4F6] rounded-xl p-4 space-y-1.5">
                <p><strong>회사:</strong> {COMPANY.LEGAL_NAME}</p>
                <p><strong>개인정보 보호책임자:</strong> {COMPANY.PRIVACY_OFFICER_NAME}</p>
                <p><strong>연락처:</strong> {COMPANY.PHONE}</p>
                <p><strong>이메일:</strong> {COMPANY.PRIVACY_OFFICER_EMAIL}</p>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-[#E5E8EB] space-y-2 text-sm">
            <Link href="/terms" className="text-[#3182F6] hover:underline block">
              → 이용약관 보기
            </Link>
            <Link href="/privacy" className="text-[#3182F6] hover:underline block">
              → 개인정보처리방침 보기
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  )
}
