'use client'

/**
 * /customers 전체 권한 가드
 * 요구 모듈: crm
 */

import GatedRoute from '../components/GatedRoute'

export default function CustomersLayout({ children }: { children: React.ReactNode }) {
 return <GatedRoute moduleId="crm">{children}</GatedRoute>
}
