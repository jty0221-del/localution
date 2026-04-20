/**
 * 네이버 모바일 통합검색 순위 파서 — v2 (18차-4)
 *
 * v1(naver-rank.ts) 문제점:
 *   - blog.naver.com URL 만 추적 → 인플루언서(in.naver.com) 누락
 *   - 섹션 구분 없이 전체 HTML 등장순 → "어느 블록에 노출됐는지" 알 수 없음
 *   - 블록 타이틀/키워드 미추출 → "강남역 점심 맛집 블록 2위" 표현 불가
 *
 * v2 전략:
 *   - HTML 을 `api_subject_bx` 기준으로 섹션 분할
 *   - 각 섹션의 첫 <h2>/<h3> 에서 블록 타이틀 추출
 *   - `<button data-cr-on="..." data-url="...">` 요소에서
 *       블록 ID (`a=ugB_b{N}R`), 블록 내 순위 (`r={M}`), 실제 URL 추출
 *   - 타겟 URL 과 매칭되는 모든 히트 수집 (여러 블록에 동시 노출 가능)
 *   - 블로그 탭 (`where=m_blog`) 별도 호출로 블로그 탭 순위도 병행 추적
 *
 * 사용:
 *   const r = await checkNaverBlogRank("강남역맛집", "https://blog.naver.com/xxx/224255837128");
 *   r.smart_blocks => [{block_id:'b1', block_title:'강남역 점심 맛집', my_rank:2, ...}, ...]
 *   r.blog_tab.my_rank => 15
 *   r.best_hit => 가장 우선순위 높은 노출 1개 (summary 용)
 */

export type RankSection =
  | "popular_post" // legacy 호환용 — v2에서는 "smart_block" 으로 대체되지만 기존 값 유지
  | "smart_block"
  | "blog_tab"
  | "not_found";

export interface ParsedBlogUrl {
  blogId: string | null;
  postId: string | null;
}

export interface BlockItem {
  rank: number; // 블록 내 순위 (1부터)
  url: string; // data-url 원본 (쿼리스트링 포함 가능)
  canonicalUrl: string; // 정규화된 URL (비교용)
  matched: boolean;
}

export interface SmartBlock {
  block_id: string; // "b1", "b2", ...
  block_title: string; // "강남역 점심 맛집" 등
  items: BlockItem[];
  my_rank: number | null; // 이 블록 안에서 타겟 URL 의 순위
}

export interface BlogTabResult {
  items: BlockItem[];
  my_rank: number | null;
  checked: boolean; // 블로그 탭을 호출했는지 (옵션에서 끄면 false)
}

export interface BestHit {
  type: "smart_block" | "blog_tab";
  block_id?: string;
  block_title: string;
  rank: number;
  url: string;
}

export interface RankResult {
  // ── v2 신규 필드 ─────────────────────────────────
  smart_blocks: SmartBlock[];
  blog_tab: BlogTabResult;
  best_hit: BestHit | null;

  // ── legacy 호환 (v1 API 와 동일한 의미) ───────────
  rank: number | null; // best_hit.rank (노출 없으면 null)
  section: RankSection; // 최우선 히트가 속한 종류
  total_found: number; // 전체 스마트블록 + 블로그 탭 아이템 수
  note?: string;
}

const UA_MOBILE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/**
 * blog.naver.com URL → { blogId, postId } (in.naver.com 은 null 반환)
 */
export function parseBlogUrl(input: string): ParsedBlogUrl {
  if (!input) return { blogId: null, postId: null };
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return { blogId: null, postId: null };
  }
  const host = u.hostname.replace(/^m\./, "");
  if (host !== "blog.naver.com") return { blogId: null, postId: null };

  if (u.pathname.toLowerCase().includes("postview")) {
    const blogId = u.searchParams.get("blogId");
    const postId = u.searchParams.get("logNo");
    if (blogId && postId && /^\d+$/.test(postId)) {
      return { blogId, postId };
    }
    return { blogId: null, postId: null };
  }

  const m = u.pathname.match(/^\/([A-Za-z0-9_-]+)\/(\d+)\/?$/);
  if (m) {
    return { blogId: m[1], postId: m[2] };
  }
  return { blogId: null, postId: null };
}

/**
 * URL 정규화 — 쿼리·해시 제거 + m. 호스트 통일.
 * 비교 목적이므로 소문자로.
 */
export function canonicalizeUrl(raw: string): string {
  if (!raw) return "";
  const decoded = raw.replace(/&amp;/g, "&");
  try {
    const u = new URL(decoded);
    const host = u.hostname.replace(/^m\./, "").toLowerCase();
    const pathname = u.pathname.replace(/\/+$/, "").toLowerCase();
    // 인플루언서: in.naver.com/{handle}/contents/internal/{id} 형식만 뽑고 query 무시
    if (host === "in.naver.com") {
      return `in.naver.com${pathname}`;
    }
    // 블로그: /{blogId}/{postId}
    if (host === "blog.naver.com") {
      return `blog.naver.com${pathname}`;
    }
    return `${host}${pathname}`;
  } catch {
    return decoded.toLowerCase();
  }
}

/**
 * 타겟 URL 2개가 "같은 글" 인지 비교.
 * blog.naver.com 은 blogId/postId 로 비교 (대소문자 무시).
 * in.naver.com 은 canonicalUrl 로 비교.
 */
export function isSameContent(targetUrl: string, candidateUrl: string): boolean {
  if (!targetUrl || !candidateUrl) return false;
  const tBlog = parseBlogUrl(targetUrl);
  const cBlog = parseBlogUrl(candidateUrl);
  if (tBlog.blogId && tBlog.postId && cBlog.blogId && cBlog.postId) {
    return (
      tBlog.blogId.toLowerCase() === cBlog.blogId.toLowerCase() &&
      tBlog.postId === cBlog.postId
    );
  }
  return canonicalizeUrl(targetUrl) === canonicalizeUrl(candidateUrl);
}

/**
 * HTML 에서 api_subject_bx 섹션들을 배열로 분할.
 * 첫 조각(섹션 진입 전)은 버린다.
 */
function splitSections(html: string): string[] {
  const parts = html.split("api_subject_bx");
  return parts.slice(1);
}

/**
 * 섹션 HTML 에서 첫 <h2>/<h3> 타이틀 추출.
 * 태그 제거 후 HTML 엔티티 디코딩.
 */
function extractBlockTitle(sectionHtml: string): string {
  const head = sectionHtml.slice(0, 5000);
  const m = head.match(/<h[23][^>]*>([\s\S]{0,400}?)<\/h[23]>/);
  if (!m) return "";
  return m[1]
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 섹션 HTML 에서 `<[tag] ... data-cr-on="..." ... data-url="..." ...>` 쌍 추출.
 * button/a 중 data-url 이 있는 것만.
 * 같은 (block_id, rank) 가 여러 번 나오면 data-url 이 있는 것 우선.
 */
function extractSectionItems(sectionHtml: string): {
  block_id: string;
  items: Array<{ rank: number; url: string }>;
} | null {
  const re = /<([a-z]+)\s+([^>]*?data-cr-on="([^"]+)"[^>]*)>/g;
  const byKey = new Map<string, { block_id: string; rank: number; url: string }>();
  let m: RegExpExecArray | null;

  while ((m = re.exec(sectionHtml))) {
    const attrs = m[2];
    const cron = m[3];

    const bMatch = cron.match(/a=ugB_(b\d+)R/);
    const rMatch = cron.match(/r=(\d+)/);
    if (!bMatch || !rMatch) continue;

    const block_id = bMatch[1];
    const rank = parseInt(rMatch[1], 10);
    if (!Number.isFinite(rank) || rank < 1) continue;

    const urlMatch = attrs.match(/data-url="([^"]+)"/);
    const url = urlMatch ? urlMatch[1].replace(/&amp;/g, "&") : "";

    const key = `${block_id}#${rank}`;
    const existing = byKey.get(key);
    if (!existing || (!existing.url && url)) {
      byKey.set(key, { block_id, rank, url });
    }
  }

  if (byKey.size === 0) return null;

  // 블록이 섞여 있을 수는 없으므로 첫 블록 id 채택
  const first = Array.from(byKey.values())[0];
  const block_id = first.block_id;

  const items = Array.from(byKey.values())
    .filter((v) => v.block_id === block_id && v.url)
    .map((v) => ({ rank: v.rank, url: v.url }))
    .sort((a, b) => a.rank - b.rank);

  return { block_id, items };
}

/**
 * 통합검색 HTML 에서 모든 스마트블록을 추출.
 * 타겟 URL 과 매칭되는 아이템에 matched=true + my_rank 세팅.
 */
export function extractSmartBlocks(html: string, targetUrl: string): SmartBlock[] {
  const sections = splitSections(html);
  const out: SmartBlock[] = [];

  for (const sec of sections) {
    const parsed = extractSectionItems(sec);
    if (!parsed) continue;

    const title = extractBlockTitle(sec);
    const items: BlockItem[] = parsed.items.map((it) => {
      const matched = isSameContent(targetUrl, it.url);
      return {
        rank: it.rank,
        url: it.url,
        canonicalUrl: canonicalizeUrl(it.url),
        matched,
      };
    });

    const mine = items.find((i) => i.matched);
    out.push({
      block_id: parsed.block_id,
      block_title: title || `(블록 ${parsed.block_id})`,
      items,
      my_rank: mine ? mine.rank : null,
    });
  }

  return out;
}

/**
 * 블로그 탭 HTML 에서 상위 N 개 블로그 포스트 추출.
 * m.search.naver.com/search.naver?where=m_blog 기준.
 */
export function extractBlogTabItems(
  html: string,
  targetUrl: string,
  maxRank = 30,
): BlockItem[] {
  // 블로그 탭 모바일은 api_subject_bx 가 아니라 data-url= 속성 혹은 href="https://blog.naver.com/..." 순서
  const re = /(?:data-url|href)="(https?:\/\/(?:m\.)?blog\.naver\.com\/[^"]+)"/g;
  const seen = new Set<string>();
  const items: BlockItem[] = [];
  let m: RegExpExecArray | null;
  let rank = 0;
  while ((m = re.exec(html))) {
    const rawUrl = m[1].replace(/&amp;/g, "&");
    const canonical = canonicalizeUrl(rawUrl);
    // blogId/postId 추출 가능한 것만
    const parsed = parseBlogUrl(rawUrl);
    if (!parsed.blogId || !parsed.postId) continue;
    const dedupeKey = `${parsed.blogId.toLowerCase()}/${parsed.postId}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    rank += 1;
    items.push({
      rank,
      url: rawUrl,
      canonicalUrl: canonical,
      matched: isSameContent(targetUrl, rawUrl),
    });
    if (rank >= maxRank) break;
  }
  return items;
}

/** 레거시 호환 — v1 extractBlogRanking 시그니처 유지. */
export function extractBlogRanking(
  html: string,
  maxRank = 30,
): { blogId: string; postId: string }[] {
  const re = /blog\.naver\.com\/([A-Za-z0-9_-]+)\/(\d{6,})/g;
  const seen = new Set<string>();
  const out: { blogId: string; postId: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const key = `${m[1]}/${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ blogId: m[1], postId: m[2] });
    if (out.length >= maxRank) break;
  }
  return out;
}

interface FetchOpts {
  timeoutMs?: number;
}

async function fetchHtml(url: string, opts: FetchOpts = {}): Promise<string | null> {
  const timeoutMs = opts.timeoutMs ?? 10000;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA_MOBILE,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.5",
        Referer: "https://m.naver.com/",
      },
      signal: ac.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * best_hit 계산 규칙:
 *   - 스마트블록 히트들 중 rank 가 가장 낮은 (1 에 가까운) 것 우선
 *   - 같은 rank 면 block_id 가 작은 것 (b1 < b2)
 *   - 스마트블록 히트가 없으면 blog_tab 히트 (있다면)
 */
function pickBestHit(
  smart_blocks: SmartBlock[],
  blog_tab: BlogTabResult,
): BestHit | null {
  const smartHits = smart_blocks
    .filter((b) => b.my_rank !== null)
    .map((b) => ({
      type: "smart_block" as const,
      block_id: b.block_id,
      block_title: b.block_title,
      rank: b.my_rank!,
      url: b.items.find((i) => i.matched)?.url ?? "",
    }));
  if (smartHits.length > 0) {
    smartHits.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.block_id.localeCompare(b.block_id);
    });
    return smartHits[0];
  }
  if (blog_tab.my_rank !== null) {
    const item = blog_tab.items.find((i) => i.matched);
    return {
      type: "blog_tab",
      block_title: "블로그 탭",
      rank: blog_tab.my_rank,
      url: item?.url ?? "",
    };
  }
  return null;
}

/**
 * 메인 엔트리 — 통합검색 + (옵션) 블로그 탭 동시 조회.
 */
export async function checkNaverBlogRank(
  keyword: string,
  targetUrl: string,
  opts: {
    maxRank?: number;
    timeoutMs?: number;
    includeBlogTab?: boolean; // 기본 true — 블로그 탭까지 조회
  } = {},
): Promise<RankResult> {
  const maxRank = opts.maxRank ?? 30;
  const timeoutMs = opts.timeoutMs ?? 10000;
  const includeBlogTab = opts.includeBlogTab ?? true;

  // 타겟 URL 유효성 체크 — blog.naver.com 포스트 이거나 in.naver.com 콘텐츠면 OK
  const parsed = parseBlogUrl(targetUrl);
  let targetValid = Boolean(parsed.blogId && parsed.postId);
  if (!targetValid) {
    // in.naver.com 포맷도 허용
    try {
      const u = new URL(targetUrl);
      if (u.hostname.replace(/^m\./, "") === "in.naver.com") {
        targetValid = true;
      }
    } catch {
      /* noop */
    }
  }
  if (!targetValid) {
    return {
      smart_blocks: [],
      blog_tab: { items: [], my_rank: null, checked: false },
      best_hit: null,
      rank: null,
      section: "not_found",
      total_found: 0,
      note: "invalid_target_url",
    };
  }

  const integratedUrl = `https://m.search.naver.com/search.naver?where=m&query=${encodeURIComponent(keyword)}`;
  const blogTabUrl = `https://m.search.naver.com/search.naver?where=m_blog&query=${encodeURIComponent(keyword)}`;

  const tasks: Promise<string | null>[] = [fetchHtml(integratedUrl, { timeoutMs })];
  if (includeBlogTab) {
    tasks.push(fetchHtml(blogTabUrl, { timeoutMs }));
  }

  const [integratedHtml, blogTabHtml] = await Promise.all(tasks);
  if (!integratedHtml) {
    return {
      smart_blocks: [],
      blog_tab: { items: [], my_rank: null, checked: includeBlogTab },
      best_hit: null,
      rank: null,
      section: "not_found",
      total_found: 0,
      note: "fetch_failed_integrated",
    };
  }

  const smart_blocks = extractSmartBlocks(integratedHtml, targetUrl);

  let blog_tab: BlogTabResult = { items: [], my_rank: null, checked: false };
  if (includeBlogTab) {
    if (blogTabHtml) {
      const items = extractBlogTabItems(blogTabHtml, targetUrl, maxRank);
      const mine = items.find((i) => i.matched);
      blog_tab = {
        items,
        my_rank: mine ? mine.rank : null,
        checked: true,
      };
    } else {
      blog_tab = { items: [], my_rank: null, checked: true };
    }
  }

  const best_hit = pickBestHit(smart_blocks, blog_tab);
  const total_found =
    smart_blocks.reduce((acc, b) => acc + b.items.length, 0) + blog_tab.items.length;

  let section: RankSection = "not_found";
  if (best_hit) {
    section = best_hit.type === "smart_block" ? "smart_block" : "blog_tab";
  }

  return {
    smart_blocks,
    blog_tab,
    best_hit,
    rank: best_hit ? best_hit.rank : null,
    section,
    total_found,
  };
}
