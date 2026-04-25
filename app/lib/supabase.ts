import { createClient } from '@supabase/supabase-js';

// 빌드 시(prerender) 환경변수가 없으면 placeholder 로 폴백.
// 실제 런타임(서버/브라우저)에는 Vercel 환경변수가 주입됨.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================
// 스토어(매장) 타입
// ============================================================
export type Store = {
  id: string;
  name: string;
  category: string;
  address: string;
  main_keyword: string;
  sub_keywords: string[];
  tone: string;
  reward_enabled: boolean;
  reward_text: string;
  naver_url: string;
  cover_color: string;
};

// ============================================================
// CRM 타입 (supabase/migrations/20260420_crm.sql 와 동기화)
// ============================================================
export type CustomerTag = 'VIP' | '단골' | '신규' | '휴면' | '블랙리스트';

export type CustomerRow = {
  id: string;
  user_id: string;
  legacy_id: string | null;
  name: string;
  phone: string | null;
  memo: string;
  tags: CustomerTag[];
  visits_count: number;
  total_spend_krw: number;
  last_visit_at: string | null;
  created_at: string;
  updated_at: string;
};

// 클라이언트 로컬 UI 에서 다루는 단순화된 형태 (기존 Customer 인터페이스와 호환)
export type CustomerInput = {
  name: string;
  phone?: string;
  memo?: string;
  tags: CustomerTag[];
};

export type CustomerVisitRow = {
  id: string;
  user_id: string;
  customer_id: string;
  amount_krw: number;
  source: 'manual' | 'qr_stamp' | 'pos' | 'order';
  memo: string;
  metadata: Record<string, unknown>;
  visited_at: string;
  created_at: string;
};

export type CustomerMessageRow = {
  id: string;
  user_id: string;
  customer_id: string | null;
  recipient_count: number;
  channel: 'alimtalk' | 'sms' | 'kakao';
  template: string | null;
  body: string;
  status: 'queued' | 'sent' | 'failed';
  failed_reason: string | null;
  sent_at: string | null;
  created_at: string;
};
