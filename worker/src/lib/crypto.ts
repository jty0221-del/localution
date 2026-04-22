// worker/src/lib/crypto.ts
// ============================================================
// 32차-1 · Worker 전용 AES-256-GCM 복호화
//   · app/lib/crypto-utils.ts 의 decryptSecret 과 동일 알고리즘
//   · Worker 는 복호화만 사용 (암호화는 Vercel 측에서)
// ============================================================
import { createDecipheriv } from 'crypto'

const ALGO = 'aes-256-gcm'

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

function aesDecrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, tag: Buffer): Buffer {
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
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
