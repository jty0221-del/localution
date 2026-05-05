'use strict'
const https = require('https')

const SUPABASE_URL = 'agmjplxyviyaspnokbjs.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnbWpwbHh5dml5YXNwbm9rYmpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkxMzcyNCwiZXhwIjoyMDkxNDg5NzI0fQ.5sKPdYwapaCmcMtVRBiHsEuyhQIFdsG77-yXgT1cQSw'
const REVIEW_ID = '69e0633ca681ba3823fd9a4d'

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { headers }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch { resolve(data) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function main() {
  // Check the specific review
  console.log('=== Checking review', REVIEW_ID, '===')
  const review = await httpsGet(
    `https://${SUPABASE_URL}/rest/v1/reviews?select=id,reply_status,reply_text,updated_at,platform_review_id,user_id&id=eq.${REVIEW_ID}`,
    { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
  )
  console.log(JSON.stringify(review, null, 2))

  // Also check recent reviews for user JCuzz7F to see job activity
  console.log('\n=== Recent reviews for user JCuzz7F (last 5) ===')
  const recent = await httpsGet(
    `https://${SUPABASE_URL}/rest/v1/reviews?select=id,reply_status,reply_text,updated_at,platform_review_id&user_id=like.JCuzz7F%25&order=updated_at.desc&limit=5`,
    { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
  )
  console.log(JSON.stringify(recent, null, 2))
}
main().catch(e => { console.error(e); process.exit(1) })
