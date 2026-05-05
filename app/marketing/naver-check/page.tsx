'use client'
// 어드민 전용 페이지로 이전됨 — 일반 사용자 접근 시 어드민으로 리다이렉트
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NaverCheckRedirect() {
 const router = useRouter()
 useEffect(() => { router.replace('/admin/naver-check') }, [router])
 return (
 <div className="min-h-screen flex items-center justify-center text-sm text-[#8B95A1]">
 이동 중...
 </div>
 )
}
