'use strict'
const { Queue, Job } = require('./worker/node_modules/bullmq')
const IORedis = require('./worker/node_modules/ioredis')

const REDIS_URL = 'rediss://default:gQAAAAAAAWflAAIgcDI3YjVmMmUxOWJjYzc0MTI3YTdiNTY2MTI2Y2Y3ZDExOA@trusty-alpaca-92133.upstash.io:6379'
const USER_ID = 'JCuzz7F-HjPxFjcmHl6ouDMjtwnouYQ3rEGRobUzNyA'
const STORE_ID = '1137287126'
const BIZ_ID = '10441797'

async function main() {
  const redis = new IORedis.default(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false, tls: {} })
  const q = new Queue('platform-jobs', { connection: redis })
  const jobId = 'naver_health_' + Date.now()
  await q.add('naver_place:health_check', {
    platform: 'naver_place',
    action: 'health_check',
    userId: USER_ID,
    storeId: STORE_ID,
    payload: { biz_id: BIZ_ID }
  }, { jobId })
  console.log('Enqueued health_check:', jobId)

  // Poll job state directly
  console.log('Polling for job completion...')
  const start = Date.now()
  while (Date.now() - start < 120000) {
    await new Promise(r => setTimeout(r, 3000))
    const job = await Job.fromId(q, jobId)
    if (!job) { console.log('Job not found'); break }
    const state = await job.getState()
    const elapsed = Math.round((Date.now() - start) / 1000)
    console.log(`[${elapsed}s] state=${state} returnvalue=${JSON.stringify(job.returnvalue || null)}`)
    if (state === 'completed' || state === 'failed') {
      const dur = job.finishedOn - job.processedOn
      console.log('\nJob finished! Duration:', dur, 'ms')
      console.log('Result:', JSON.stringify(job.returnvalue || { failedReason: job.failedReason }))
      break
    }
  }
  await q.close()
  redis.disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
