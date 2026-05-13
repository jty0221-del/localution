-- v38: AI 답글 피드백 학습 테이블
CREATE TABLE IF NOT EXISTS reply_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  platform_review_id TEXT,
  draft_reply TEXT,
  edited_reply TEXT,  -- 사장님이 수정한 최종 답글 (있으면)
  feedback TEXT NOT NULL CHECK (feedback IN ('good', 'bad', 'edited')),
  tone TEXT,
  reason TEXT,  -- 싫어요 사유 (선택)
  review_content TEXT,
  rating INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reply_feedback_user ON reply_feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reply_feedback_tone ON reply_feedback(tone, feedback);
