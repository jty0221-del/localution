import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// 타입 정의
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
