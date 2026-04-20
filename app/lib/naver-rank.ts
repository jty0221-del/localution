/**
 * 네이버 모바일 통합검색 "인기글" 영역의 블로그 포스트 순위 추적
 *
 * - 난독화된 SDS 클래스명에 의존하지 않고, blog.naver.com/{blogId}/{postId}
 *   패턴의 URL 등장 순서를 기준으로 순위를 계산한다.
 * - 같은 URL이 썸네일/제목/링크 등 여러 번 반복되므로 "최초 등장 순서"로 dedupe 한다.
 * - /clip/ (영상 클립) 경로는 제외하고 숫자 postId 만 순위 대상.
 *
 * 사용:
 *   const r = await checkNaverBlogRank("강남역 맛집", "https://blog.naver.com/xxx/224255837128");
 *   r => { rank: 1, section: "popular_post", total_found: 6 }
 */

export type RankSection = "popular_post" | "not_found";

export interface ParsedBlogUrl {
  blogId: string | null;
  postId: string | null;
}

export interface RankResult {
  rank: number | null; // null = 미노출
  section: RankSection;
  total_found: number; // 해당 키워드 상위 인기글 총 발견 수
  note?: string; // 오류/디버그 메시지
}

const UA_MOBILE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/**
 * blog.naver.com URL에서 blogId, postId를 추출.
 * 지원 포맷:
 *   https://blog.naver.com/xxx/224255837128
 *   https://blog.naver.com/PostView.naver?blogId=xxx&logNo=224255837128
 *   https://m.blog.naver.com/xxx/224255837128
 *   https://blog.naver.com/xxx (목록 페이지 — postId 없음 → null 반환)
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

  // PostView.naver?blogId=xxx&logNo=yyy
  if (u.pathname.toLowerCase().includes("postview")) {
    const blogId = u.searchParams.get("blogId");
    const postId = u.searchParams.get("logNo");
    if (blogId && postId && /^\d+$/.test(postId)) {
      return { blogId, postId };
    }
    return { blogId: null, postId: null };
  }

  // /{blogId}/{postId}
  const m = u.pathname.match(/^\/([A-Za-z0-9_-]+)\/(\d+)\/?$/);
  if (m) {
    return { blogId: m[1], postId: m[2] };
  }
  return { blogId: null, postId: null };
}

/**
 * HTML에서 blog.naver.com 포스트 URL을 첫 등장 순서대로 최대 N개 추출.
 * /clip/ 경로(클립 영상)는 제외. 숫자 postId만 잡는다.
 */
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

/**
 * 네이버 모바일 통합검색에서 특정 블로그 글의 순위를 조회한다.
 */
export async function checkNaverBlogRank(
  keyword: string,
  targetUrl: string,
  opts: { maxRank?: number; timeoutMs?: number } = {},
): Promise<RankResult> {
  const maxRank = opts.maxRank ?? 30;
  const timeoutMs = opts.timeoutMs ?? 10000;

  const { blogId, postId } = parseBlogUrl(targetUrl);
  if (!blogId || !postId) {
    return {
      rank: null,
      section: "not_found",
      total_found: 0,
      note: "invalid_target_url",
    };
  }

  const url = `https://m.search.naver.com/search.naver?where=m&query=${encodeURIComponent(keyword)}`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  let html: string;
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
    if (!res.ok) {
      return {
        rank: null,
        section: "not_found",
        total_found: 0,
        note: `fetch_status_${res.status}`,
      };
    }
    html = await res.text();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { rank: null, section: "not_found", total_found: 0, note: `fetch_error:${msg}` };
  } finally {
    clearTimeout(timer);
  }

  const list = extractBlogRanking(html, maxRank);
  const idx = list.findIndex(
    (p) => p.blogId.toLowerCase() === blogId.toLowerCase() && p.postId === postId,
  );

  if (idx === -1) {
    return { rank: null, section: "not_found", total_found: list.length };
  }
  return { rank: idx + 1, section: "popular_post", total_found: list.length };
}
