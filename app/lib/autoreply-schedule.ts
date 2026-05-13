// app/lib/autoreply-schedule.ts
// ============================================================
// v38: 자동답글 일정 제어 — 주말 / 공휴일 / 영업시간 체크
// ============================================================

// 한국 공휴일 (양력 + 음력 자동 변환된 양력 날짜)
// 매년 업데이트 필요. 일단 2026 데이터.
const KOREAN_HOLIDAYS_2026 = new Set([
  '2026-01-01', // 신정
  '2026-02-16', // 설날
  '2026-02-17',
  '2026-02-18',
  '2026-03-01', // 삼일절
  '2026-05-05', // 어린이날
  '2026-05-25', // 부처님오신날
  '2026-06-06', // 현충일
  '2026-08-15', // 광복절
  '2026-09-24', // 추석
  '2026-09-25',
  '2026-09-26',
  '2026-10-03', // 개천절
  '2026-10-09', // 한글날
  '2026-12-25', // 크리스마스
])

const KOREAN_HOLIDAYS_2027 = new Set([
  '2027-01-01',
  '2027-02-05', // 설날
  '2027-02-06',
  '2027-02-07',
  '2027-03-01',
  '2027-05-05',
  '2027-05-13', // 부처님오신날
  '2027-06-06',
  '2027-08-15',
  '2027-09-14', // 추석
  '2027-09-15',
  '2027-09-16',
  '2027-10-03',
  '2027-10-09',
  '2027-12-25',
])

function getKstDateString(d: Date = new Date()): string {
  // KST = UTC+9
  const kst = new Date(d.getTime() + 9 * 3600_000)
  return kst.toISOString().slice(0, 10)
}

function getKstHour(d: Date = new Date()): number {
  const kst = new Date(d.getTime() + 9 * 3600_000)
  return kst.getUTCHours()
}

function getKstDayOfWeek(d: Date = new Date()): number {
  // 0=Sunday, 6=Saturday
  const kst = new Date(d.getTime() + 9 * 3600_000)
  return kst.getUTCDay()
}

export function isKoreanHoliday(d: Date = new Date()): boolean {
  const dateStr = getKstDateString(d)
  return KOREAN_HOLIDAYS_2026.has(dateStr) || KOREAN_HOLIDAYS_2027.has(dateStr)
}

export function isWeekend(d: Date = new Date()): boolean {
  const day = getKstDayOfWeek(d)
  return day === 0 || day === 6
}

export function isBusinessHours(d: Date = new Date(), startHour = 9, endHour = 22): boolean {
  const hour = getKstHour(d)
  return hour >= startHour && hour < endHour
}

export type ScheduleSettings = {
  skip_weekends?: boolean
  skip_holidays?: boolean
  business_hours_only?: boolean
}

/**
 * 자동답글이 지금 실행 가능한지 (사용자 설정 + 현재 시각)
 * Returns { allowed: boolean, reason: string }
 */
export function shouldRunAutoReply(settings: ScheduleSettings, now: Date = new Date()): { allowed: boolean; reason: string } {
  if (settings.skip_weekends && isWeekend(now)) {
    return { allowed: false, reason: 'skip_weekends (KST 주말)' }
  }
  if (settings.skip_holidays && isKoreanHoliday(now)) {
    return { allowed: false, reason: 'skip_holidays (KST 공휴일)' }
  }
  if (settings.business_hours_only && !isBusinessHours(now)) {
    return { allowed: false, reason: 'business_hours_only (09:00~22:00 KST 외)' }
  }
  return { allowed: true, reason: 'ok' }
}
