// app/components/ReplyFeedbackButtons.tsx
// ============================================================
// v38: 답글에 좋아요/싫어요 피드백 버튼 (AI 학습용)
// ============================================================
'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, CheckCircle2, Loader2 } from 'lucide-react'

type Props = {
  reviewId: string
  compact?: boolean
}

export default function ReplyFeedbackButtons({ reviewId, compact = false }: Props) {
  const [sent, setSent] = useState<'good' | 'bad' | null>(null)
  const [sending, setSending] = useState<'good' | 'bad' | null>(null)
  const [reasonOpen, setReasonOpen] = useState(false)
  const [reason, setReason] = useState('')

  const send = async (feedback: 'good' | 'bad', reasonText?: string) => {
    setSending(feedback)
    try {
      const r = await fetch('/api/user/reply-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: reviewId, feedback, reason: reasonText }),
      })
      const j = await r.json()
      if (j.ok) {
        setSent(feedback)
        setReasonOpen(false)
      }
    } catch (_) {}
    finally { setSending(null) }
  }

  if (sent) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] md:text-xs font-bold ${sent === 'good' ? 'text-emerald-600' : 'text-red-600'}`}>
        <CheckCircle2 size={12} />
        {sent === 'good' ? '좋아요 저장됨' : '싫어요 저장됨 — AI 학습'}
      </span>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <button
          onClick={() => send('good')}
          disabled={!!sending}
          className={`inline-flex items-center gap-1 ${compact ? 'px-1.5 py-1' : 'px-2 py-1.5'} rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] md:text-xs font-bold transition disabled:opacity-50`}
          aria-label="이 답글 좋아요"
        >
          {sending === 'good' ? <Loader2 size={11} className="animate-spin" /> : <ThumbsUp size={11} />}
          좋아요
        </button>
        <button
          onClick={() => setReasonOpen(!reasonOpen)}
          disabled={!!sending}
          className={`inline-flex items-center gap-1 ${compact ? 'px-1.5 py-1' : 'px-2 py-1.5'} rounded-md bg-red-50 hover:bg-red-100 text-red-700 text-[10px] md:text-xs font-bold transition disabled:opacity-50`}
          aria-label="이 답글 싫어요"
        >
          {sending === 'bad' ? <Loader2 size={11} className="animate-spin" /> : <ThumbsDown size={11} />}
          싫어요
        </button>
      </div>

      {reasonOpen && (
        <div className="bg-red-50 rounded-lg p-2 space-y-1.5">
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="어떤 부분이 싫었어요? (예: 너무 길어요 / 너무 형식적이에요)"
            rows={2}
            className="w-full text-[11px] md:text-xs px-2 py-1.5 rounded border border-red-200 focus:outline-none focus:ring-1 focus:ring-red-300"
          />
          <div className="flex items-center gap-1">
            <button
              onClick={() => send('bad', reason)}
              disabled={!!sending}
              className="flex-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] md:text-xs font-bold rounded transition disabled:opacity-50"
            >
              제출 (AI 학습)
            </button>
            <button
              onClick={() => setReasonOpen(false)}
              className="px-2 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px] md:text-xs font-bold rounded transition"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
