'use client'
export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function QRPage() {
 const router = useRouter()
 useEffect(() => { router.replace('/qr-admin') }, [router])
 return (
 <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center">
 <div className="text-center">
 <div className="w-12 h-12 border-4 border-[#3182F6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
 <p className="text-[#8B95A1] text-sm">QR 관리로 이동 중...</p>
 </div>
 </div>
 )
}
