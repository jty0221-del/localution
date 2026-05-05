'use strict'
const { createClient } = require('@supabase/supabase-js')
const { Queue } = require('./worker/node_modules/bullmq')
const IORedis = require('./worker/node_modules/ioredis')

const SUPABASE_URL = 'https://agmjplxyviyaspnokbjs.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnbWpwbHh5dml5YXNwbm9rYmpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkxMzcyNCwiZXhwIjoyMDkxNDg5NzI0fQ.5sKPdYwapaCmcMtVRBiHsEuyhQIFdsG77-yXgT1cQSw'
const REDIS_URL = 'rediss://default:gQAAAAAAAWflAAIgcDI3YjVmMmUxOWJjYzc0MTI3YTdiNTY2MTI2Y2Y3ZDExOA@trusty-alpaca-92133.upstash.io:6379'

async function main() {
  const svc = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  const { data: creds } = await svc.from('platform_credentials').select('user_id, platform_store_id, extra_data, account_id').eq('platform', 'naver_place').limit(10)
  const cred = creds.find(c => c.platform_store_id === '1137287126' || (c.user_id && c.user_id.startsWith('JCuzz7F')))
  if (!cred) { console.error('Target user not found'); process.exit(1) }

  const userId = cred.user_id
  const storeId = cred.platform_store_id || 'unknown'
  const bizId = (cred.extra_data && cred.extra_data.smartplace_biz_id) || storeId
  console.log('userId:', userId.slice(0, 15) + '...  storeId:', storeId, ' bizId:', bizId)

  const redis = new IORedis.default(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false, tls: {} })
  const q = new Queue('platform-jobs', { connection: redis })
  const jobId = 'naver_health_' + Date.now()
  await q.add('naver_place:health_check', { platform: 'naver_place', action: 'health_check', userId, storeId, payload: { biz_id: String(bizId) } }, { jobId })
  console.log('Enqueued:', jobId)
  await q.close(); redis.disconnect()

  console.log('Polling Railway logs for 60s...')
  await new Promise(r => setTimeout(r, 60000))
  console.log('Done. Check Railway logs for "naver: login failed page text:"')
}
main().catch(e => { console.error(e); process.exit(1) })
