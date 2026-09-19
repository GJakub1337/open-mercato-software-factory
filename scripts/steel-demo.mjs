#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'dotenv'

const root = fileURLToPath(new URL('../', import.meta.url))
const stateDir = resolve(root, '.steel-demo')
const stateFile = resolve(stateDir, 'environment.json')
const command = process.argv[2]
function run(program, args, options = {}) {
  const result = spawnSync(program, args, { cwd: root, stdio: 'inherit', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${program} exited ${result.status}`)
  return result
}
function yarn(env, ...args) { run('corepack', ['yarn', ...args], { env: { ...process.env, ...env } }) }
if (command === 'prepare') {
  if (!existsSync(stateFile)) {
    if (existsSync(resolve(root, '.env'))) throw new Error('Existing environment preserved. Use init/seed/start, or prepare in a fresh checkout.')
    const port = Number(process.env.STEEL_DEMO_PORT ?? 5003)
    const postgresPort = Number(process.env.STEEL_DEMO_POSTGRES_PORT ?? 55433)
    for (const value of [port, postgresPort]) if (!Number.isInteger(value) || value < 1024 || value > 65535) throw new Error('Use an unprivileged free port.')
    const suffix = randomBytes(4).toString('hex')
    const state = { port, postgresPort, container: `steel-demo-${suffix}`, database: `steel_demo_${suffix}` }
    const dbPassword = randomBytes(24).toString('hex')
    const loginPassword = randomBytes(18).toString('base64url')
    mkdirSync(stateDir, { mode: 0o700 })
    writeFileSync(stateFile, JSON.stringify(state, null, 2), { mode: 0o600, flag: 'wx' })
    const env = [
      `DATABASE_URL=postgres://postgres:${dbPassword}@127.0.0.1:${postgresPort}/${state.database}`,
      `JWT_SECRET=${randomBytes(32).toString('hex')}`, `APP_URL=http://127.0.0.1:${port}`, `PORT=${port}`,
      'OM_ENABLE_ENTERPRISE_MODULES=true', 'OM_ENABLE_ENTERPRISE_MODULES_AGENTS=true',
      'OM_ENABLE_ENTERPRISE_MODULES_SSO=false', 'OM_ENABLE_ENTERPRISE_MODULES_SECURITY=false',
      'OM_FORCE_LOCALE=pl', 'DEMO_MODE=true', 'CACHE_STRATEGY=memory', 'QUEUE_STRATEGY=local',
      'OM_INIT_SUPERADMIN_EMAIL=marek@stal-zbiorniki.example', `OM_INIT_SUPERADMIN_PASSWORD=${loginPassword}`,
      `OM_INIT_ADMIN_PASSWORD=${randomBytes(18).toString('base64url')}`, `OM_INIT_EMPLOYEE_PASSWORD=${randomBytes(18).toString('base64url')}`,
    ].join('\n') + '\n'
    writeFileSync(resolve(root, '.env'), env, { mode: 0o600, flag: 'wx' })
    const dockerEnv = resolve(stateDir, 'postgres.env')
    writeFileSync(dockerEnv, `POSTGRES_PASSWORD=${dbPassword}\nPOSTGRES_DB=${state.database}\n`, { mode: 0o600, flag: 'wx' })
  }
  const state = JSON.parse(readFileSync(stateFile, 'utf8'))
  const env = parse(readFileSync(resolve(root, '.env')))
  const databaseUrl = new URL(env.DATABASE_URL)
  if (databaseUrl.hostname !== '127.0.0.1' || Number(databaseUrl.port) !== state.postgresPort || databaseUrl.pathname !== `/${state.database}` || !state.container.startsWith('steel-demo-')) throw new Error('Saved environment target differs from the prepared database.')
  run('docker', ['info'], { stdio: 'ignore' })
  const inspection = spawnSync('docker', ['inspect', '--format', '{{.Config.Labels.app}}', state.container], { encoding: 'utf8' })
  if (inspection.error) throw inspection.error
  if (inspection.status === 0) {
    if (inspection.stdout.trim() !== 'steel-demo') throw new Error('Existing container is not a steel-demo environment.')
    run('docker', ['start', state.container])
  } else {
    run('docker', ['run', '-d', '--name', state.container, '--label', 'app=steel-demo', '--env-file', resolve(stateDir, 'postgres.env'), '-p', `127.0.0.1:${state.postgresPort}:5432`, 'postgres:17-alpine'])
  }
  console.log(`Prepared isolated database ${state.container}. Credentials are only in the local .env. Next: node scripts/steel-demo.mjs init`)
} else if (['init', 'seed', 'start'].includes(command)) {
  if (!existsSync(stateFile)) throw new Error('Run prepare in this checkout first.')
  const state = JSON.parse(readFileSync(stateFile, 'utf8'))
  const env = parse(readFileSync(resolve(root, '.env')))
  const url = new URL(env.DATABASE_URL)
  if (url.hostname !== '127.0.0.1' || Number(url.port) !== state.postgresPort || url.pathname !== `/${state.database}` || !state.database.startsWith('steel_demo_')) throw new Error('Database target differs from the prepared isolated environment.')
  const { Client } = await import('pg')
  async function client() { const connection = new Client({ connectionString: env.DATABASE_URL }); await connection.connect(); return connection }
  if (command === 'init') {
    const connection = await client()
    try {
      const result = await connection.query("select count(*)::int as count from information_schema.tables where table_schema='public'")
      if (result.rows[0].count !== 0) throw new Error('Initialization requires the empty database created by prepare. Existing data preserved; use seed.')
    } finally { await connection.end() }
    yarn(env, 'generate')
    yarn(env, 'db:migrate')
    yarn(env, 'mercato', 'init', '--no-examples', '--org=Stal-Zbiorniki Sp. z o.o.')
  } else if (command === 'start') {
    run('node', ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(state.port)], { env: { ...process.env, ...env } })
  } else {
    const connection = await client()
    try {
      const result = await connection.query('select id, tenant_id from organizations where deleted_at is null')
      if (result.rows.length !== 1) throw new Error('Expected exactly one organization in isolated demo; use explicit scoped CLI for other instances.')
      const row = result.rows[0]
      yarn(env, 'mercato', 'demo_fixtures', 'personalize-stal-zbiorniki', '--tenant', row.tenant_id, '--org', row.id)
    } finally { await connection.end() }
  }
} else {
  console.log('Usage: node scripts/steel-demo.mjs prepare|init|seed|start')
  process.exitCode = 1
}
