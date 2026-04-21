// app/lib/crypto-utils.ts
// ============================================================
// 23차-2: AES-256-GCM 암호화 유틸 (2026-04-21)
//
//   · 2단계 암호화 (DEK + KEK)
//       - DEK (Data Encryption Key): credential 하나당 새로 생성
//       - KEK (Key Encryption Key): 서비스 전체 1개, env 에 저장
//   · DB 유출 시에도 KEK 없이는 복호화 불가능
//   · Worker 프로세스 메모리 상에서만 평문 비밀번호 존재
//
// 환경변수 필수
//   ENCRYPTION_KEK_HEX       : 64자 hex (256비트 KEK)
//   ENCRYPTION_KEK_VERSION   : 'v1' (키 로테이션 시 'v2' 로 증가)
//
// 신규 KEK 생성 방법:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// ============================================================
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12   // GCM 표준
const TAG_LEN = 16  // GCM 표준

export type EncryptedPayload = {
  ciphertext: string   // base64
  iv: string           // base64
  tag: string          // base64
  dek_ciphertext: string
  dek_iv: string
  dek_tag: string
  kek_version: string  // 'v1'
}

// ─────────────────────────────────────────────
// 내부: KEK 로드 + 검증
// ─────────────────────────────────────────────
function loadKek(): { key: Buffer; version: string } {
  const raw = process.env.ENCRYPTION_KEK_HEX
  const version = process.env.ENCRYPTION_KEK_VERSION || 'v1'

  if (!raw) {
    throw new Error('ENCRYPTION_KEK_HEX 환경변수가 설정되지 않음. 암호화 불가.')
  }
  // 30차-1: Vercel/Railway 에 붙여넣기 할 때 생기는 공백·개행·탭 허용
  // 64자 정확한 hex 가 아니면 먼저 공백류만 제거 후 재검증
  let hex = raw.trim()
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    const cleaned = raw.replace(/\s+/g, '')
    if (/^[0-9a-fA-F]{64}$/.test(cleaned)) {
      hex = cleaned
    } else {
      throw new Error(
        `ENCRYPTION_KEK_HEX 형식 오류 — 64자 hex 이어야 함 ` +
        `(원본 ${raw.length}자, 공백제거 후 ${cleaned.length}자, hex 외 문자 ${cleaned.replace(/[0-9a-fA-F]/g, '').length}개). ` +
        `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 로 재생성 후 Vercel/Railway 양쪽에 동일 값 등록.`
      )
    }
  }
  return { key: Buffer.from(hex.toLowerCase(), 'hex'), version }
}

// ─────────────────────────────────────────────
// 내부: AES-256-GCM 단일 암호화/복호화
// ─────────────────────────────────────────────
function aesEncrypt(plaintext: Buffer, key: Buffer): {
  ciphertext: Buffer
  iv: Buffer
  tag: Buffer
} {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return { ciphertext, iv, tag }
}

function aesDecrypt(
  ciphertext: Buffer,
  key: Buffer,
  iv: Buffer,
  tag: Buffer,
): Buffer {
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext
}

// ─────────────────────────────────────────────
// Public: 암호화
// ─────────────────────────────────────────────
/**
 * 평문 비밀번호를 AES-256-GCM 2단 암호화.
 * DEK(32바이트)를 매번 새로 생성하여 plaintext 를 암호화하고,
 * DEK 자체는 KEK 로 다시 감싸서 반환한다.
 *
 * @param plaintext 평문 (비밀번호 또는 기타 민감 문자열)
 * @returns EncryptedPayload — DB 에 저장 가능한 base64 필드들
 */
export function encryptSecret(plaintext: string): EncryptedPayload {
  if (!plaintext) {
    throw new Error('암호화 대상 plaintext 가 비어있음')
  }

  const { key: kek, version: kekVersion } = loadKek()

  // 1) DEK 생성 (32 bytes = 256 bits)
  const dek = randomBytes(32)

  // 2) plaintext 를 DEK 로 암호화
  const p = aesEncrypt(Buffer.from(plaintext, 'utf-8'), dek)

  // 3) DEK 를 KEK 로 암호화
  const d = aesEncrypt(dek, kek)

  // 4) DEK 메모리 wipe (best-effort)
  dek.fill(0)

  return {
    ciphertext:     p.ciphertext.toString('base64'),
    iv:             p.iv.toString('base64'),
    tag:            p.tag.toString('base64'),
    dek_ciphertext: d.ciphertext.toString('base64'),
    dek_iv:         d.iv.toString('base64'),
    dek_tag:        d.tag.toString('base64'),
    kek_version:    kekVersion,
  }
}

// ─────────────────────────────────────────────
// Public: 복호화
// ─────────────────────────────────────────────
/**
 * encryptSecret() 로 암호화된 payload 를 복호화.
 * Worker 프로세스 메모리 상에서만 평문 존재.
 * 사용 후 반드시 참조 해제 + GC 유도.
 *
 * @param payload DB 에서 꺼낸 암호화 필드들
 * @returns 평문 문자열
 */
export function decryptSecret(payload: EncryptedPayload): string {
  const { key: kek, version: currentVersion } = loadKek()

  // 버전 경고 (복호화는 계속 진행 — 키 로테이션 중간 상태 대응)
  if (payload.kek_version && payload.kek_version !== currentVersion) {
    console.warn(
      `[crypto-utils] KEK 버전 불일치 — payload=${payload.kek_version}, env=${currentVersion}. ` +
      `로테이션 진행 중이라면 정상.`
    )
  }

  try {
    // 1) DEK 복호화 (KEK 로)
    const dek = aesDecrypt(
      Buffer.from(payload.dek_ciphertext, 'base64'),
      kek,
      Buffer.from(payload.dek_iv, 'base64'),
      Buffer.from(payload.dek_tag, 'base64'),
    )

    // 2) plaintext 복호화 (DEK 로)
    const plaintext = aesDecrypt(
      Buffer.from(payload.ciphertext, 'base64'),
      dek,
      Buffer.from(payload.iv, 'base64'),
      Buffer.from(payload.tag, 'base64'),
    )

    const result = plaintext.toString('utf-8')

    // 3) 중간 버퍼 wipe
    dek.fill(0)
    plaintext.fill(0)

    return result
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    throw new Error(`복호화 실패: ${msg} (KEK 불일치 또는 페이로드 손상 가능성)`)
  }
}

// ─────────────────────────────────────────────
// Public: KEK 생성 유틸 (CLI 에서 호출)
// ─────────────────────────────────────────────
/**
 * 새 KEK 생성 (64자 hex string).
 * 환경변수 ENCRYPTION_KEK_HEX 초기값으로 사용.
 *
 * 사용 예:
 *   node -e "console.log(require('./app/lib/crypto-utils').generateKek())"
 */
export function generateKek(): string {
  return randomBytes(32).toString('hex')
}

// ─────────────────────────────────────────────
// Public: 문자열 참조 정리 (best-effort)
// ─────────────────────────────────────────────
/**
 * 평문 비밀번호 사용 후 GC 유도.
 * JavaScript 는 진짜 메모리 wipe 는 불가능하지만,
 * 참조를 끊고 큰 블록은 덮어써서 덤프 시점에 노출될 확률을 낮춘다.
 */
export function encouragePlaintextCleanup(refs: Array<string | undefined>): void {
  // no-op: JS 문자열은 immutable + interned 가능하여 실제 wipe 불가
  // 이 함수는 의도 표현용이자 GC hint
  refs.length = 0
  if (global.gc) {
    try { global.gc() } catch { /* --expose-gc 미활성이면 무시 */ }
  }
}

// ─────────────────────────────────────────────
// Public: 자체 무결성 검증
// ─────────────────────────────────────────────
/**
 * 환경변수 + 라이브러리 동작 자체 검증.
 * 배포 직후 health check 또는 CI 에서 호출.
 */
export function selfTest(): { ok: boolean; message: string } {
  try {
    const sample = '테스트_비밀번호_' + Date.now()
    const encrypted = encryptSecret(sample)
    const decrypted = decryptSecret(encrypted)
    if (decrypted !== sample) {
      return { ok: false, message: '복호화 결과 불일치' }
    }
    return { ok: true, message: 'AES-256-GCM 암/복호화 정상 + KEK 로드 정상' }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'unknown error',
    }
  }
}
