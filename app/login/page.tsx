'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="로컬루션" width={64} height={64} className="mx-auto rounded-2xl mb-4" />
          <h1 className="text-2xl font-bold text-[#191F28]">로컬루션</h1>
          <p className="text-[#8B95A1] mt-1">소상공인 AI 만능 비서</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-[#191F28] mb-2">이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="이메일 주소 입력"
                className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#191F28] mb-2">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
              />
            </div>
          </div>

          <button className="w-full bg-[#3182F6] text-white font-semibold py-3 rounded-xl hover:bg-[#1B64DA] transition-colors">
            로그인
          </button>

          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-[#3182F6] hover:underline">
              둘러보기 (로그인 없이)
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
