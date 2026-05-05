'use strict'
const { Queue } = require('./worker/node_modules/bullmq')
const IORedis = require('./worker/node_modules/ioredis')
const https = require('https')

const REDIS_URL = 'rediss://default:gQAAAAAAAWflAAIgcDI3YjVmMmUxOWJjYzc0MTI3YTdiNTY2MTI2Y2Y3ZDExOA@trusty-alpaca-92133.upstash.io:6379'
const SUPABASE_URL = 'agmjplxyviyaspnokbjs.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnbWpwbHh5dml5YXNwbm9rYmpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkxMzcyNCwiZXhwIjoyMDkxNDg5NzI0fQ.5sKPdYwapaCmcMtVRBiHsEuyhQIFdsG77-yXgT1cQSw'

const USER_ID = 'JCuzz7F-HjPxFjcmHl6ouDMjtwnouYQ3rEGRobUzNyA'
const STORE_ID = '1137287126'
const BIZ_ID = '10441797'
const PLATFORM_REVIEW_ID = '69e0633ca681ba3823fd9a4d'
const REPLY_TEXT = '리뷰 감사합니다! 방문해 주셔서 기쁩니다. 다음에도 또 오세요 😊'

function get(url, headers) {
  return new Promise((res, rej) => {
    const req = https.request(url, {headers}, r => {
      let d=''
      r.on('data',c=>d+=c)
      r.on('end',()=>{try{res(JSON.parse(d))}catch{res(d)}})
    })
    req.on('error',rej)
    req.end()
  })
}

async function main() {
  // First check current DB status
  const current = await get(
    `https://${SUPABASE_URL}/rest/v1/platform_reviews?select=id,platform_review_id,reply_status,reply_error,reply_submitted_at,has_reply&user_id=eq.${USER_ID}&platform_review_id=eq.${PLATFORM_REVIEW_ID}`,
    { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
  )
  console.log('Current DB state:')
  console.log(JSON.stringify(current, null, 2))

  // Enqueue the job
  const redis = new IORedis.default(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false, tls: {} })
  const q = new Queue('platform-jobs', { connection: redis })
  const jobId = 'naver_reply_' + Date.now()
  await q.add('naver_place:post_reply', {
    platform: 'naver_place',
    action: 'post_reply',
    userId: USER_ID,
    storeId: STORE_ID,
    payload: {
      biz_id: BIZ_ID,
      platform_review_id: PLATFORM_REVIEW_ID,
      reply_text: REPLY_TEXT,
    }
  }, { jobId })
  console.log('\nEnqueued:', jobId)
  await q.close()
  redis.disconnect()

  // Poll DB for status change (up to 3 minutes)
  console.log('\nPolling DB for status change (up to 3 minutes)...')
  const startMs = Date.now()
  let lastStatus = current?.[0]?.reply_status || 'unknown'

  while (Date.now() - startMs < 180000) {
    await new Promise(r => setTimeout(r, 10000))
    const updated = await get(
      `https://${SUPABASE_URL}/rest/v1/platform_reviews?select=id,platform_review_id,reply_status,reply_error,reply_submitted_at,has_reply&user_id=eq.${USER_ID}&platform_review_id=eq.${PLATFORM_REVIEW_ID}`,
      { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
    )
    const row = updated?.[0]
    const elapsed = Math.round((Date.now() - startMs) / 1000)
    const status = row?.reply_status || 'unknown'
    const error = row?.reply_error || ''
    console.log(`[${elapsed}s] reply_status=${status} has_reply=${row?.has_reply} error=${error.slice(0, 80)}`)

    if (status !== lastStatus) {
      console.log('\n=== STATUS CHANGED ===')
      console.log(JSON.stringify(row, null, 2))
      if (status === 'submitted') {
        console.log('\n✅ SUCCESS! Reply was posted successfully!')
        break
      } else if (status === 'failed') {
        console.log('\n❌ FAILED. Check error above.')
        break
      }
      lastStatus = status
    }
  }

  console.log('\nDone.')
}
main().catch(e => { console.error(e); process.exit(1) })
