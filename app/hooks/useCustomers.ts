'use client';

// ============================================================
// useCustomers — 우리 쿠키 인증 API 기반 (보안 강화 v2, 2026-05-03)
//   · /api/customers GET/POST/PUT/DELETE 사용
//   · 로그인 시: DB가 source of truth, localStorage 는 보조 캐시 (오프라인 대응)
//   · 비로그인 시: localStorage 만 사용 (게스트 모드)
//   · 마이그레이션 후 LS 원본 삭제 (잔존 데이터 제거)
//   · DB 모드에서 모든 변경사항 LS 캐시도 자동 동기화 (즉시 표시)
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';

export type CustomerTag = 'VIP' | '단골' | '신규' | '휴면' | '블랙리스트';

export type Customer = {
  id: string;
  name: string;
  phone: string;
  visits: number;
  totalSpend: number;
  lastVisit: string;
  tags: CustomerTag[];
  memo: string;
};

const LS_KEY = 'localution.customers';
const LS_CACHE_KEY = 'localution.customers.cache';   // DB 모드 캐시 (로그인 사용자별 격리 X — 클라이언트 단일 사용자 가정)
const LS_MIGRATED_KEY = 'localution.customers.migrated_at';

export type UseCustomersMode = 'local' | 'remote' | 'loading';

export interface UseCustomersResult {
  customers: Customer[];
  mode: UseCustomersMode;
  isDemo: boolean;
  loading: boolean;
  error: string | null;
  add: (input: Omit<Customer, 'id' | 'visits' | 'totalSpend' | 'lastVisit'>) => Promise<void>;
  update: (id: string, patch: Partial<Customer>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reset: () => Promise<void>;
  refresh: () => Promise<void>;
}

const todayISODate = () => new Date().toISOString().slice(0, 10);

export function useCustomers(): UseCustomersResult {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mode, setMode] = useState<UseCustomersMode>('loading');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const migratedRef = useRef(false);

  // ---------- 로컬 (게스트 모드) ----------
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

  // ---------- DB 모드 캐시 (오프라인 즉시 표시) ----------
  const readCache = (): Customer[] => {
    try {
      const raw = localStorage.getItem(LS_CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Customer[]) : [];
    } catch {
      return [];
    }
  };

  const writeCache = (next: Customer[]) => {
    try {
      localStorage.setItem(LS_CACHE_KEY, JSON.stringify(next));
    } catch {}
  };

  // ---------- 원격 (우리 API) ----------
  const fetchRemote = useCallback(async (): Promise<Customer[] | null> => {
    try {
      const r = await fetch('/api/customers', { credentials: 'include', cache: 'no-store' });
      if (!r.ok) return null;
      const j = await r.json();
      if (!j.ok) {
        setError(j.error || 'fetch failed');
        return null;
      }
      const list = (j.customers || []) as Customer[];
      // DB 결과를 캐시에 저장 (다음 진입 시 즉시 표시)
      writeCache(list);
      return list;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'fetch failed');
      return null;
    }
  }, []);

  // ---------- 1회 마이그레이션 (localStorage → DB) ----------
  // 성공 시 LS_KEY 원본 데이터 자동 삭제 (잔존 방지)
  const ensureMigrated = useCallback(async () => {
    if (migratedRef.current) return;
    try {
      const migrated = localStorage.getItem(LS_MIGRATED_KEY);
      if (migrated) { migratedRef.current = true; return; }
      const local = readLocal();
      if (local.length === 0) {
        localStorage.setItem(LS_MIGRATED_KEY, todayISODate());
        migratedRef.current = true;
        return;
      }

      // 각 로컬 손님을 API 로 추가
      let migratedCount = 0;
      for (const c of local) {
        try {
          const r = await fetch('/api/customers', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: c.name,
              phone: c.phone,
              memo: c.memo,
              tags: c.tags,
            }),
          });
          if (r.ok) migratedCount++;
        } catch {}
      }
      localStorage.setItem(LS_MIGRATED_KEY, todayISODate());
      // 모든 데이터 마이그레이션 성공 시에만 LS 원본 삭제 (안전)
      if (migratedCount === local.length) {
        try { localStorage.removeItem(LS_KEY); } catch {}
        console.log('[useCustomers] migrated', migratedCount, 'customers, LS cleaned');
      } else {
        console.warn('[useCustomers] partial migration:', migratedCount, '/', local.length);
      }
      migratedRef.current = true;
    } catch (e) {
      console.warn('[useCustomers] migration error:', e);
    }
  }, []);

  // ---------- 초기 로드 ----------
  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. 캐시 즉시 표시 (UX) — 네트워크 응답 대기 안 함
      const cached = readCache();
      if (cached.length > 0) setCustomers(cached);

      // 2. 우리 API 호출 — 401 이면 미로그인
      const r = await fetch('/api/customers', { credentials: 'include', cache: 'no-store' });
      if (r.status === 401 || r.status === 403) {
        // 미로그인 → 로컬 모드 (게스트)
        setCustomers(readLocal());
        setMode('local');
        return;
      }
      if (r.ok) {
        const j = await r.json();
        if (j.ok) {
          // 첫 진입 시 1회 마이그레이션 시도
          await ensureMigrated();
          // 마이그레이션 후 재조회 (DB가 source of truth)
          const refetched = await fetchRemote();
          setCustomers(refetched || []);
          setMode('remote');
          return;
        }
      }
      // 실패 fallback (네트워크 오류 등)
      setCustomers(readLocal());
      setMode('local');
    } catch (_) {
      setCustomers(readLocal());
      setMode('local');
    } finally {
      setLoading(false);
    }
  }, [ensureMigrated, fetchRemote]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // ---------- CRUD ----------
  const add: UseCustomersResult['add'] = async (input) => {
    if (mode === 'remote') {
      const r = await fetch('/api/customers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: input.name,
          phone: input.phone,
          memo: input.memo,
          tags: input.tags,
        }),
      });
      const j = await r.json();
      if (!j.ok) { setError(j.error || 'add failed'); return; }
      const next = [j.customer, ...customers];
      setCustomers(next);
      writeCache(next);
      return;
    }
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
    if (mode === 'remote') {
      const r = await fetch('/api/customers', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const j = await r.json();
      if (!j.ok) { setError(j.error || 'update failed'); return; }
      const next = customers.map(c => (c.id === id ? { ...c, ...patch } : c));
      setCustomers(next);
      writeCache(next);
      return;
    }
    const nextList = customers.map(c => (c.id === id ? { ...c, ...patch } : c));
    setCustomers(nextList);
    writeLocal(nextList);
  };

  const remove: UseCustomersResult['remove'] = async (id) => {
    if (mode === 'remote') {
      const r = await fetch('/api/customers?id=' + id, { method: 'DELETE', credentials: 'include' });
      const j = await r.json();
      if (!j.ok) { setError(j.error || 'remove failed'); return; }
      const next = customers.filter(c => c.id !== id);
      setCustomers(next);
      writeCache(next);
      return;
    }
    const nextList = customers.filter(c => c.id !== id);
    setCustomers(nextList);
    writeLocal(nextList);
  };

  const reset: UseCustomersResult['reset'] = async () => {
    if (mode === 'remote') {
      // 한꺼번에 삭제 (서버 측 "전체 삭제" 엔드포인트 없음 — 개별 처리)
      for (const c of customers) {
        try {
          await fetch('/api/customers?id=' + c.id, { method: 'DELETE', credentials: 'include' });
        } catch {}
      }
      setCustomers([]);
      writeCache([]);
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
