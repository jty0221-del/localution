'use client'

/**
 * /qr-admin 전체 권한 가드
 * 요구 모듈: qr-stamp
 */

import GatedRoute from '../components/GatedRoute'

export default function QrAdminLayout({ children }: { children: React.ReactNode }) {
  return <GatedRoute moduleId="qr-stamp">{children}</GatedRoute>
}
