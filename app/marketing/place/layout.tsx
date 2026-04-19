'use client'

/**
 * /marketing/place 권한 가드
 * 요구 모듈: keyword (플레이스 진단은 키워드 모듈에 포함)
 *
 * ⚠️ 현재 이 경로는 비로그인 공개 체험 도구이기도 함 (홈 히어로 "1분 무료 진단" CTA 목적지).
 * 따라서 GatedRoute 를 페이지에 걸지 않고, 페이지 내부에서 결과 저장/고급기능만 가드하는 구조가 적합.
 * 해당 파일은 임시 placeholder 로 둔다. Phase 0.5 에서 세부 정책 결정.
 */

export default function PlaceLayout({ children }: { children: React.ReactNode }) {
  // 공개 접근 허용 — 페이지 내부에서 필요 시 인라인 LockedBanner 사용
  return <>{children}</>
}
