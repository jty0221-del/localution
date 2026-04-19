/**
 * 로컬루션 회사 정보 중앙화
 * ────────────────────────────────────────────────
 * Footer·Terms·Privacy·Inquiry 등 법적/연락처 정보를 한 파일에서 관리.
 *
 * 🔄 법인 전환·상호 변경 시 이 파일의 상수만 교체하면 사이트 전역 자동 반영.
 *
 * ⚠️ 현재 법적 사업자는 "하랑"(개인사업자) — 전자상거래법상 표시 의무라 그대로 유지.
 *    로컬루션 개인사업자 신규 등록 완료 시 아래 LEGAL_* 값을 교체하면 됨.
 *
 * 변경 대상 (로컬루션 개인사업자 등록 완료 시):
 *   - LEGAL_NAME:        '하랑' → '로컬루션'
 *   - BIZ_NUMBER:        '706-68-00281' → 신규 사업자번호
 *   - ECOMMERCE_NUMBER:  '2020-서울강서-1482' → 신규 통신판매업 번호
 *   - ADDRESS:           동일 또는 신규
 *   - (선택) EMAIL/PRIVACY_OFFICER_EMAIL 도메인 이전 시 함께 교체
 */

export const COMPANY = {
  /* ─── 브랜드 (공개 노출용) ─── */
  BRAND:        '로컬루션',
  BRAND_EN:     'Localution',
  TAGLINE:      '자영업자를 위한 AI 마케팅 OS',
  DOMAIN:       'www.localution.co.kr',

  /* ─── 법적 사업자 정보 (전자상거래법상 표시 의무 — 실제 등록증 기준) ─── */
  LEGAL_NAME:        '하랑',                         // 현 사업자등록 상호
  CEO:               '전태영',
  BIZ_NUMBER:        '706-68-00281',                 // 사업자등록번호
  ECOMMERCE_NUMBER:  '2020-서울강서-1482',           // 통신판매업 신고번호
  ADDRESS:           '경기 고양시 일산동구 장백로19 더루벤투스카운티 501호',

  /* ─── 연락처 ─── */
  PHONE:                  '010-7510-9054',
  EMAIL:                  'jty0221@naver.com',       // 🔄 2026-04-19 harangmarketing → jty0221 교체
  PRIVACY_OFFICER_NAME:   '전태영',
  PRIVACY_OFFICER_EMAIL:  'jty0221@naver.com',

  /* ─── 외부 채널 ─── */
  KAKAO_OPENCHAT: 'https://open.kakao.com/o/gXyJ6xrg',

  /* ─── 저작권 ─── */
  COPYRIGHT_YEAR: 2026,
  COPYRIGHT_ENTITY: 'Localution',                    // 브랜드 기준 저작권 표기
} as const

/* ─── 조합 상수 (재사용 편의) ─── */
export const COMPANY_FOOTER_LINE_1 = `${COMPANY.LEGAL_NAME} | 대표: ${COMPANY.CEO} | 사업자등록번호: ${COMPANY.BIZ_NUMBER}`
export const COMPANY_FOOTER_LINE_2 = `통신판매업신고번호: ${COMPANY.ECOMMERCE_NUMBER}`
export const COMPANY_FOOTER_LINE_3 = `주소: ${COMPANY.ADDRESS}`
export const COMPANY_FOOTER_LINE_4 = `전화: ${COMPANY.PHONE} | 이메일: ${COMPANY.EMAIL}`
export const COMPANY_FOOTER_LINE_5 = `개인정보보호책임자: ${COMPANY.PRIVACY_OFFICER_NAME} (${COMPANY.PRIVACY_OFFICER_EMAIL})`
export const COMPANY_COPYRIGHT = `© ${COMPANY.COPYRIGHT_YEAR} ${COMPANY.COPYRIGHT_ENTITY}. All rights reserved.`
