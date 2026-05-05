const { execSync } = require('child_process')
const cwd = 'C:\\Users\\pc\\Desktop\\localution'
const run = (cmd) => {
  console.log('> ' + cmd)
  try { console.log(execSync(cmd, { cwd, encoding: 'utf8' })) }
  catch(e) { console.error(e.stdout || e.message) }
}
run('git add worker/src/adapters/coupangeats.ts')
run('git status --short')
run('git commit -m "fix(coupangeats): node-direct fetch primary + browser fallback for API calls"')
run('git push origin main')
console.log('Done.')
