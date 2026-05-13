-- v38: 사장님 답글 템플릿 (자주 쓰는 표현)
CREATE TABLE IF NOT EXISTS reply_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,           -- 사장님이 본 이름 (예: "감사 인사")
  body TEXT NOT NULL,            -- 실제 답글 본문
  trigger_keywords TEXT[],       -- 이 키워드 포함 리뷰에 추천 (예: ["감사", "맛있"])
  rating_match INT,              -- 별점 매칭 (1~5 / null=모든 별점)
  use_count INT DEFAULT 0,       -- 사용 횟수
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reply_templates_user ON reply_templates(user_id, is_pinned DESC, use_count DESC);
