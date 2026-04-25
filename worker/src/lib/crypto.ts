// worker/src/lib/crypto.ts
// ============================================================
// 32차-1 · Worker 전용 AES-256-GCM
//   · app/lib/crypto-utils.ts 와 동일한 KEK+DEK 2단 구조
//   · 43차-1 · 폼 로그인 성공 후 세션 쿠키 저장에도 사용 → encryptSecret 추가
// ============================================================
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const KEK_VERSION = process.env.ENCRYPTION_KEK_VERSION || 'v1'

export type EncryptedPayload = {
  ciphertext: string
  iv: string
  tag: string
  dek_ciphertext: string
  dek_iv: string
  dek_tag: string
  kek_version?: string
}

function loadKek(): Buffer {
  const raw = process.env.ENCRYPTION_KEK_HEX
  if (!raw) {
    throw new Error('ENCRYPTION_KEK_HEX missing')
  }
  let hex = raw.trim()
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    const cleaned = raw.replace(/\s+/g, '')
    if (/^[0-9a-fA-F]{64}$/.test(cleaned)) {
      hex = cleaned
    } else {
      throw new Error(`ENCRYPTION_KEK_HEX invalid — need 64 hex chars, got ${cleaned.length}`)
    }
  }
  return Buffer.from(hex.toLowerCase(), 'hex')
}

function aesEncrypt(plaintext: Buffer, key: Buffer): { ciphertext: Buffer; iv: Buffer; tag: Buffer } {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return { ciphertext, iv, tag }
}

function aesDecrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, tag: Buffer): Buffer {
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

export function encryptSecret(plaintext: string): EncryptedPayload {
  if (!plaintext) throw new Error('encryptSecret: plaintext empty')
  const kek = loadKek()
  const dek = randomBytes(32)
  const p = aesEncrypt(Buffer.from(plaintext, 'utf-8'), dek)
  const d = aesEncrypt(dek, kek)
  dek.fill(0)
  return {
    ciphertext:     p.ciphertext.toString('base64'),
    iv:             p.iv.toString('base64'),
    tag:            p.tag.toString('base64'),
    dek_ciphertext: d.ciphertext.toString('base64'),
    dek_iv:         d.iv.toString('base64'),
    dek_tag:        d.tag.toString('base64'),
    kek_version:    KEK_VERSION,
  }
}

export function decryptSecret(payload: EncryptedPayload): string {
  const kek = loadKek()
  const dek = aesDecrypt(
    Buffer.from(payload.dek_ciphertext, 'base64'),
    kek,
    Buffer.from(payload.dek_iv, 'base64'),
    Buffer.from(payload.dek_tag, 'base64'),
  )
  const plaintext = aesDecrypt(
    Buffer.from(payload.ciphertext, 'base64'),
    dek,
    Buffer.from(payload.iv, 'base64'),
    Buffer.from(payload.tag, 'base64'),
  )
  const result = plaintext.toString('utf-8')
  dek.fill(0)
  plaintext.fill(0)
  return result
}
