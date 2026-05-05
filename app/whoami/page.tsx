'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

// 관리자 화이트리스트 (layout/adminAuth와 동기화)
const ADMIN_EMAILS = [
 'jty0221@gmail.com',
 'jty0221@naver.com',
 'halang@localution.co.kr',
 'admin@localution.co.kr',
]

type CookieDump = { name: string; value: string; valueLen: number }

export default function AdminWhoAmI() {
 const [luCookie, setLuCookie] = useState<any>(null)
 const [luRaw, setLuRaw] = useState<string>('')
 const [sbEmail, setSbEmail] = useState<string | null>(null)
 const [sbErr, setSbErr] = useState<string>('')
 const [allCookies, setAllCookies] = useState<CookieDump[]>([])
 const [now, setNow] = useState<string>('')

 useEffect(() => {
 setNow(new Date().toISOString())
 // 1) localution_user cookie
 try {
 const raw = document.cookie.split('; ').find(c => c.startsWith('localution_user='))
 if (raw) {
 const value = raw.slice('localution_user='.length)
 setLuRaw(value.slice(0, 300))
 try {
 const decoded = decodeURIComponent(value)
 setLuCookie(JSON.parse(decoded))
 } catch (e) {
 setLuCookie({ _parseError: String(e) })
 }
 }
 } catch {}

 // 2) 전체 쿠키 이름 목록
 try {
 const list = document.cookie.split('; ').map(c => {
 const eq = c.indexOf('=')
 const name = eq > -1 ? c.slice(0, eq) : c
 const value = eq > -1 ? c.slice(eq + 1) : ''
 return { name, value: value.slice(0, 60), valueLen: value.length }
 })
 setAllCookies(list)
 } catch {}

 // 3) Supabase 세션
 ;(async () => {
 try {
 const { data, error } = await supabase.auth.getUser()
 if (error) setSbErr(error.message)
 setSbEmail(data?.user?.email || null)
 } catch (e) {
 setSbErr(String(e))
 }
 })()
 }, [])

 const luEmail = (luCookie?.email || '').toLowerCase().trim()
 const luAllowed = luEmail && ADMIN_EMAILS.includes(luEmail)
 const sbAllowed = sbEmail && ADMIN_EMAILS.includes(sbEmail.toLowerCase().trim())

 return (
 <div className="min-h-screen bg-[#F2F4F6] p-4 md:p-8">
 <div className="max-w-3xl mx-auto space-y-4">
 <header className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white rounded-2xl p-6">
 <h1 className="text-xl font-black">WhoAmI · 관리자 인증 진단</h1>
 <p className="text-white/80 text-xs mt-1">로그인 후 이 페이지를 보면 현재 세션 정체를 알 수 있어.</p>
 <p className="text-white/50 text-[11px] mt-1">확인 시각 {now}</p>
 </header>

 <section className="bg-white rounded-2xl p-5 shadow-sm">
 <h2 className="font-bold mb-3 flex items-center gap-2">
 {luAllowed ? '' : luEmail ? '' : ''} <span>1) NextAuth OAuth (localution_user 쿠키)</span>
 </h2>
 {luCookie ? (
 <div className="space-y-2 text-sm">
 <Row k="email" v={luCookie.email || '(없음)'} highlight={!!luEmail} />
 <Row k="provider" v={luCookie.provider || '-'} />
 <Row k="name" v={luCookie.name || '-'} />
 <Row k="id" v={luCookie.id || '-'} />
 <Row k="ADMIN 화이트리스트 통과" v={luAllowed ? 'YES' : 'NO'} highlight={!!luAllowed} />
 <details className="text-xs text-[#8B95A1] mt-2">
 <summary className="cursor-pointer">raw payload</summary>
 <pre className="bg-[#F2F4F6] rounded p-2 mt-1 overflow-auto">{luRaw}</pre>
 </details>
 </div>
 ) : (
 <div className="text-sm text-[#8B95A1]">localution_user 쿠키 없음 (OAuth 로그인 안 됨)</div>
 )}
 </section>

 <section className="bg-white rounded-2xl p-5 shadow-sm">
 <h2 className="font-bold mb-3 flex items-center gap-2">
 {sbAllowed ? '' : sbEmail ? '' : ''} <span>2) Supabase Auth</span>
 </h2>
 <div className="space-y-2 text-sm">
 <Row k="email" v={sbEmail || '(세션 없음)'} highlight={!!sbEmail} />
 <Row k="ADMIN 화이트리스트 통과" v={sbAllowed ? 'YES' : 'NO'} highlight={!!sbAllowed} />
 {sbErr && <Row k="error" v={sbErr} />}
 </div>
 </section>

 <section className="bg-white rounded-2xl p-5 shadow-sm">
 <h2 className="font-bold mb-3">현재 허용된 관리자 이메일</h2>
 <div className="flex flex-wrap gap-2">
 {ADMIN_EMAILS.map(e => (
 <code key={e} className="text-xs bg-[#F2F4F6] px-2 py-1 rounded">{e}</code>
 ))}
 </div>
 <p className="text-xs text-[#8B95A1] mt-3 leading-relaxed">
 위 1)·2) 중 하나라도 이면 <code className="bg-[#F2F4F6] px-1.5 py-0.5 rounded">/admin/dashboard</code> 접근 가능.
 내가 로그인한 이메일이 위 목록에 없다면 <b>개발자에게 이메일 추가 요청</b>하면 돼.
 </p>
 </section>

 <section className="bg-white rounded-2xl p-5 shadow-sm">
 <h2 className="font-bold mb-3">쿠키 전체 목록 (이름만)</h2>
 <div className="space-y-1 text-xs font-mono">
 {allCookies.length === 0 ? (
 <span className="text-[#8B95A1]">쿠키 없음</span>
 ) : allCookies.map((c, i) => (
 <div key={i} className="flex gap-2">
 <span className={c.name.startsWith('localution_') || c.name.startsWith('sb-') ? 'font-bold text-[#3182F6]' : 'text-[#4E5968]'}>
 {c.name}
 </span>
 <span className="text-[#8B95A1]">· {c.valueLen}B</span>
 </div>
 ))}
 </div>
 </section>

 <div className="flex gap-2">
 <Link href="/admin/dashboard" className="flex-1 bg-[#3182F6] text-white text-center py-3 rounded-xl font-bold text-sm">
 /admin/dashboard 시도 →
 </Link>
 <Link href="/login" className="flex-1 bg-white border border-[#E5E8EB] text-[#4E5968] text-center py-3 rounded-xl font-bold text-sm">
 다시 로그인
 </Link>
 </div>
 </div>
 </div>
 )
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
 return (
 <div className="flex gap-3 items-start">
 <span className="text-[#8B95A1] w-32 flex-shrink-0 text-xs pt-0.5">{k}</span>
 <span className={`text-sm break-all ${highlight ? 'font-bold text-[#059669]' : 'text-[#191F28]'}`}>
 {v}
 </span>
 </div>
 )
}
