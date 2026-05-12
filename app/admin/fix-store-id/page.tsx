// app/admin/fix-store-id/page.tsx
// ============================================================
// v38: 매장 ID 누락 사용자 수동 fix 페이지 (모바일 최적화)
//   · 사용자 선택 → naver/kakao URL 붙여넣기 → 자동 저장
// ============================================================
'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/app/components/PageHeader'
import {
  Link2, Search, Save, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink,
} from 'lucide-react'

type NullUser = { user_id: string; platform: string }

export default function FixStoreIdPage() {
  const [users, setUsers] = useState<NullUser[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<{ user_id: string; platform: string } | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [placeUrl, setPlaceUrl] = useState('')
  const [placeId, setPlaceId] = useState('')
  const [storeName, setStoreName] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/platform-issues-overview?_t=' + Date.now(), { cache: 'no-store' })
      const j = await r.json()
      if (j.ok) setUsers(j.null_place_id_users || [])
    } catch (_) {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])

  const loadDetail = async (u: NullUser) => {
    setSelected(u)
    setDetail(null)
    setPlaceUrl('')
    setPlaceId('')
    setStoreName('')
    try {
      const r = await fetch('/api/admin/user-platform-detail?user_id=' + encodeURIComponent(u.user_id.replace('...', '')))
      const j = await r.json()
      if (j.ok) setDetail(j)
    } catch (_) {}
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    setLastResult(null)
    try {
      const body: any = { user_id: selected.user_id.replace('...', ''), platform: selected.platform }
      if (placeUrl) body.naver_place_url = placeUrl
      if (placeId) body.store_id = placeId
      if (storeName) body.store_name = storeName
      const r = await fetch('/api/admin/set-platform-store-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await r.json()
      setLastResult(j)
      if (j.ok) {
        setTimeout(fetchUsers, 1000)
      }
    } catch (e: any) {
      setLastResult({ ok: false, error: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <PageHeader
        title="매장 ID 수동 fix"
        subtitle="naver_place / kakao_map URL 붙여넣고 저장"
        icon={<Link2 size={24} className="text-white" strokeWidth={2.5} />}
        variant="emerald"
        badge="ADMIN"
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="text-sm md:text-base font-bold text-gray-900">매장 ID 누락 사용자 {users.length}명</div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs md:text-sm font-medium text-gray-700"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 새로고침
          </button>
        </div>

        {/* 사용자 리스트 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {users.map((u, i) => {
            const isSelected = selected?.user_id === u.user_id && selected?.platform === u.platform
            return (
              <button
                key={i}
                onClick={() => loadDetail(u)}
                className={`text-left p-3 md:p-4 rounded-2xl border-2 transition ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-sm flex items-center justify-center flex-shrink-0">
                    <Link2 size={13} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-xs md:text-sm font-bold text-gray-900">{u.platform}</span>
                </div>
                <div className="font-mono text-[11px] md:text-xs text-gray-600 truncate">{u.user_id}</div>
              </button>
            )
          })}
          {users.length === 0 && !loading && (
            <div className="col-span-full text-center py-8 text-gray-400 text-sm">
              매장 ID 누락 사용자 없음. 모든 사용자가 정상 연결됐어요.
            </div>
          )}
        </div>

        {/* 선택된 사용자 상세 + 입력 폼 */}
        {selected && (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4 md:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-sm flex items-center justify-center">
                <Search size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base md:text-lg font-bold text-gray-900">
                  {selected.platform} 매장 ID 입력
                </div>
                <div className="font-mono text-[11px] md:text-xs text-gray-500 truncate">
                  {selected.user_id}
                </div>
              </div>
            </div>

            {detail && (
              <div className="text-xs md:text-sm bg-gray-50 rounded-lg p-3 space-y-1">
                {detail.profile?.email && (
                  <div><span className="text-gray-500">이메일:</span> {detail.profile.email}</div>
                )}
                {detail.profile?.display_name && (
                  <div><span className="text-gray-500">이름:</span> {detail.profile.display_name}</div>
                )}
                {detail.stores && detail.stores.length > 0 && (
                  <div>
                    <span className="text-gray-500">기존 매장:</span>
                    {detail.stores.map((s: any, i: number) => (
                      <div key={i} className="ml-3 text-gray-700">
                        · {s.name} {s.address && `(${s.address})`}
                      </div>
                    ))}
                  </div>
                )}
                {detail.recent_reviews && detail.recent_reviews.length > 0 && (
                  <div className="text-[11px] md:text-xs text-gray-500">
                    최근 리뷰 {detail.recent_reviews.length}건 (다른 플랫폼)
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs md:text-sm font-bold text-gray-900 mb-1 block">
                  {selected.platform === 'naver_place' ? '네이버 플레이스 URL' : 'kakao_map URL'}
                </label>
                <input
                  type="url"
                  value={placeUrl}
                  onChange={e => setPlaceUrl(e.target.value)}
                  placeholder={
                    selected.platform === 'naver_place'
                      ? 'https://map.naver.com/p/entry/place/1463314293'
                      : 'https://place.map.kakao.com/27406075'
                  }
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                <div className="text-[11px] text-gray-500 mt-1">
                  URL 붙여넣으면 자동으로 ID 추출 + 매장명 검색
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-400 font-medium">또는 직접 입력</div>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs md:text-sm font-bold text-gray-900 mb-1 block">
                    place_id (숫자)
                  </label>
                  <input
                    type="text"
                    value={placeId}
                    onChange={e => setPlaceId(e.target.value)}
                    placeholder="1463314293"
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs md:text-sm font-bold text-gray-900 mb-1 block">
                    매장명 (선택)
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    placeholder="예: 일산닭칼국수 부천점"
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || (!placeUrl && !placeId)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold rounded-xl shadow-sm hover:shadow-md transition disabled:opacity-50"
              >
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                저장
              </button>
            </div>

            {lastResult && (
              <div className={`p-3 rounded-lg text-xs md:text-sm ${lastResult.ok ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'}`}>
                <div className="flex items-start gap-2">
                  {lastResult.ok ? (
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    {lastResult.ok ? (
                      <>
                        <div className="font-bold">저장 완료</div>
                        <div className="mt-1">
                          place_id <code className="bg-white px-1 rounded">{lastResult.place_id_set}</code>
                          {lastResult.place_name && <> · {lastResult.place_name}</>}
                        </div>
                        <div className="text-[11px] mt-1">{lastResult.message}</div>
                      </>
                    ) : (
                      <>
                        <div className="font-bold">저장 실패</div>
                        <div className="mt-1">{lastResult.error}</div>
                        {lastResult.hint && <div className="text-[11px] mt-1">{lastResult.hint}</div>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 가이드 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-4 md:p-5">
          <div className="text-sm md:text-base font-bold text-blue-900 mb-2">사용 방법</div>
          <ol className="text-xs md:text-sm text-blue-900 space-y-1.5 list-decimal list-inside">
            <li>위 사용자 카드 선택</li>
            <li>네이버 플레이스 검색 → 해당 매장 페이지 URL 복사</li>
            <li>URL 붙여넣기 → 저장 클릭</li>
            <li>다음 cron 사이클 (30분) 부터 리뷰 자동 수집 + 답글 발행 가능</li>
          </ol>
          <div className="mt-3 text-[11px] text-blue-700">
            URL 예: <code className="bg-white px-1 rounded">https://map.naver.com/p/entry/place/1463314293</code>
          </div>
        </div>
      </div>
    </div>
  )
}
