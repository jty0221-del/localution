'use client';

// ============================================================
// useCustomers — CRM 듀얼 모드 훅 (localStorage ↔ Supabase)
// ============================================================
// 규칙:
//   1) 로그인 O + Supabase 응답 OK → DB 모드
//   2) 로그인 X 또는 DB 실패      → localStorage 모드 (기존 동작 유지)
//   3) 로그인 O + 로컬 데이터 존재 → 1회 자동 이관(ensureMigrated)
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, type CustomerTag } from '@/app/lib/supabase';

export type Customer = {
  id: string;
  name: string;
  phone: string;
  visits: number;
  totalSpend: number;
  lastVisit: string; // YYYY-MM-DD
  tags: CustomerTag[];
  memo: string;
};

const LS_KEY = 'localution.customers';
const LS_MIGRATED_KEY = 'localution.customers.migrated_at';

export type UseCustomersMode = 'local' | 'remote' | 'loading';

export interface UseCustomersResult {
  customers: Customer[];
  mode: UseCustomersMode;
  isDemo: boolean;           // 로컬 데이터 0건 → 상위 컴포넌트에서 DEMO 보여줌
  loading: boolean;
  error: string | null;
  add: (input: Omit<Customer, 'id' | 'visits' | 'totalSpend' | 'lastVisit'>) => Promise<void>;
  update: (id: string, patch: Partial<Customer>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reset: () => Promise<void>; // 샘플(데모)로 되돌리기
  refresh: () => Promise<void>;
}

// ============================================================
// 내부 유틸
// ============================================================
const todayISODate = () => new Date().toISOString().slice(0, 10);

const rowToCustomer = (r: {
  id: string;
  legacy_id: string | null;
  name: string;
  phone: string | null;
  memo: string;
  tags: string[] | null;
  visits_count: number;
  total_spend_krw: number;
  last_visit_at: string | null;
}): Customer => ({
  id: r.id,
  name: r.name,
  phone: r.phone ?? '',
  visits: r.visits_count ?? 0,
  totalSpend: r.total_spend_krw ?? 0,
  lastVisit: r.last_visit_at ? r.last_visit_at.slice(0, 10) : '',
  tags: (r.tags ?? []) as CustomerTag[],
  memo: r.memo ?? '',
});

// ============================================================
// 훅 본체
// ============================================================
export function useCustomers(): UseCustomersResult {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mode, setMode] = useState<UseCustomersMode>('loading');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  // ---------- 로컬 ----------
  const readLocal = (): Customer[] => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Customer[]) : [];
    } catch {
      return [];
    }
  };

  const writeLocal = (next: Customer[]) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {}
  };

  // ---------- 원격 ----------
  const fetchRemote = useCallback(async (): Promise<Customer[] | null> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, legacy_id, name, phone, memo, tags, visits_count, total_spend_krw, last_visit_at')
        .order('updated_at', { ascending: false });
      if (error) {
        setError(error.message);
        return null;
      }
      return (data ?? []).map(rowToCustomer);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'fetch failed');
      return null;
    }
  }, []);

  // ---------- 이관 (localStorage → DB, 1회) ----------
  // onConflict 대신 "기존 legacy_id 조회 후 신규만 insert" 패턴으로 안전하게 처리
  const ensureMigrated = useCallback(async (userId: string) => {
    try {
      const migrated = localStorage.getItem(LS_MIGRATED_KEY);
      if (migrated) return;
      const local = readLocal();
      if (local.length === 0) {
        localStorage.setItem(LS_MIGRATED_KEY, todayISODate());
        return;
      }

      // 이미 이관된 legacy_id 목록 조회 (중복 insert 방지)
      const { data: existing } = await supabase
        .from('customers')
        .select('legacy_id')
        .eq('user_id', userId)
        .not('legacy_id', 'is', null);
      const existingIds = new Set((existing ?? []).map(r => r.legacy_id));

      const toInsert = local
        .filter(c => !existingIds.has(c.id))
        .map(c => ({
          user_id: userId,
          legacy_id: c.id,
          name: c.name,
          phone: c.phone || null,
          memo: c.memo ?? '',
          tags: c.tags ?? [],
          visits_count: c.visits ?? 0,
          total_spend_krw: c.totalSpend ?? 0,
          last_visit_at: c.lastVisit ? new Date(c.lastVisit).toISOString() : null,
        }));

      if (toInsert.length === 0) {
        localStorage.setItem(LS_MIGRATED_KEY, todayISODate());
        return;
      }

      const { error } = await supabase.from('customers').insert(toInsert);
      if (error) {
        console.warn('[useCustomers] 이관 실패, 로컬 보존:', error.message);
        return;
      }
      localStorage.setItem(LS_MIGRATED_KEY, todayISODate());
    } catch (e) {
      console.warn('[useCustomers] 이관 중 예외:', e);
    }
  }, []);

  // ---------- 초기 로드 ----------
  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      userIdRef.current = uid;

      if (uid) {
        await ensureMigrated(uid);
        const remote = await fetchRemote();
        if (remote !== null) {
          setCustomers(remote);
          setMode('remote');
          setLoading(false);
          return;
        }
      }
      // 원격 실패 또는 미로그인 → 로컬
      setCustomers(readLocal());
      setMode('local');
    } finally {
      setLoading(false);
    }
  }, [ensureMigrated, fetchRemote]);

  useEffect(() => {
    bootstrap();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      bootstrap();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [bootstrap]);

  // ---------- CRUD ----------
  const add: UseCustomersResult['add'] = async (input) => {
    if (mode === 'remote' && userIdRef.current) {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          user_id: userIdRef.current,
          name: input.name,
          phone: input.phone || null,
          memo: input.memo ?? '',
          tags: input.tags ?? [],
        })
        .select('id, legacy_id, name, phone, memo, tags, visits_count, total_spend_krw, last_visit_at')
        .single();
      if (error) { setError(error.message); return; }
      setCustomers((prev) => [rowToCustomer(data), ...prev]);
      return;
    }
    // local
    const next: Customer = {
      id: `cust-${Date.now()}`,
      name: input.name,
      phone: input.phone,
      visits: 0,
      totalSpend: 0,
      lastVisit: todayISODate(),
      tags: input.tags,
      memo: input.memo ?? '',
    };
    const nextList = [next, ...customers];
    setCustomers(nextList);
    writeLocal(nextList);
  };

  const update: UseCustomersResult['update'] = async (id, patch) => {
    if (mode === 'remote' && userIdRef.current) {
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.phone !== undefined) dbPatch.phone = patch.phone || null;
      if (patch.memo !== undefined) dbPatch.memo = patch.memo;
      if (patch.tags !== undefined) dbPatch.tags = patch.tags;
      const { error } = await supabase.from('customers').update(dbPatch).eq('id', id);
      if (error) { setError(error.message); return; }
      setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      return;
    }
    const nextList = customers.map((c) => (c.id === id ? { ...c, ...patch } : c));
    setCustomers(nextList);
    writeLocal(nextList);
  };

  const remove: UseCustomersResult['remove'] = async (id) => {
    if (mode === 'remote' && userIdRef.current) {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) { setError(error.message); return; }
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      return;
    }
    const nextList = customers.filter((c) => c.id !== id);
    setCustomers(nextList);
    writeLocal(nextList);
  };

  const reset: UseCustomersResult['reset'] = async () => {
    if (mode === 'remote' && userIdRef.current) {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('user_id', userIdRef.current);
      if (error) { setError(error.message); return; }
      setCustomers([]);
      return;
    }
    try { localStorage.removeItem(LS_KEY); } catch {}
    setCustomers([]);
  };

  const refresh = useCallback(async () => {
    await bootstrap();
  }, [bootstrap]);

  return {
    customers,
    mode,
    isDemo: customers.length === 0,
    loading,
    error,
    add,
    update,
    remove,
    reset,
    refresh,
  };
}
