#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { parse } from 'dotenv'
import { Client } from 'pg'

const root = fileURLToPath(new URL('../', import.meta.url))
const state = JSON.parse(readFileSync(new URL('../.steel-demo/environment.json', import.meta.url), 'utf8'))
const env = parse(readFileSync(new URL('../.env', import.meta.url)))
const url = new URL(env.DATABASE_URL)
assert.equal(url.hostname, '127.0.0.1')
assert.equal(Number(url.port), state.postgresPort)
assert.equal(url.pathname, `/${state.database}`)
assert.ok(state.database.startsWith('steel_demo_'))
const client = new Client({ connectionString: env.DATABASE_URL })
await client.connect()
try {
  const scope = (await client.query('select id, tenant_id, name, logo_url, logo_preserve_aspect_ratio from organizations where deleted_at is null')).rows
  assert.equal(scope.length, 1)
  assert.equal(scope[0].name, 'Stal-Zbiorniki Sp. z o.o.')
  assert.equal(scope[0].logo_url, new URL('/brand/stal-zbiorniki-icon.png', env.APP_URL).href)
  assert.equal(scope[0].logo_preserve_aspect_ratio, true)
  const logo = readFileSync(new URL('../public/brand/stal-zbiorniki-icon.png', import.meta.url))
  assert.deepEqual(logo.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'Sidebar logo must be a PNG')
  const { id: org, tenant_id: tenant } = scope[0]
  const tables = ['catalog_products', 'catalog_product_categories', 'catalog_product_variant_prices', 'customer_entities', 'customer_companies', 'customer_addresses', 'customer_person_company_links', 'sales_document_addresses', 'staff_teams', 'staff_team_members', 'staff_time_projects', 'staff_time_project_members', 'staff_time_task_statuses', 'staff_time_tasks', 'sales_orders', 'sales_order_lines']
  async function snapshot() {
    const result = {}
    for (const table of tables) result[table] = (await client.query(`select * from ${table} where tenant_id=$1 and organization_id=$2 order by id`, [tenant, org])).rows
    return result
  }
  const before = await snapshot()
  assert.equal(before.catalog_products.length, 7)
  assert.equal(before.customer_entities.length, 7)
  assert.equal(before.staff_team_members.length, 6)
  assert.equal(before.staff_time_projects.length, 3)
  assert.equal(before.staff_time_tasks.length, 12)
  assert.equal(before.staff_time_task_statuses.length, 12)
  assert.equal(before.sales_orders.length, 2)
  assert.ok(before.sales_orders.some((order) => order.order_number === 'SO-2026-0042'), 'Existing demo order must remain available')
  assert.equal(Number(before.sales_orders.find((order) => order.order_number === 'SZ-DEMO-0042').grand_total_net_amount), 126400)
  assert.equal(before.catalog_products.some((product) => product.sku === 'ZWM-1500'), false)
  const tank = before.catalog_products.find((product) => product.sku === 'ZDP-5000')
  assert.equal(tank.metadata.capacityLiters, 5000)
  assert.equal(tank.dimensions, null)
  for (const project of before.staff_time_projects) {
    assert.deepEqual(before.staff_time_task_statuses.filter((row) => row.time_project_id === project.id).map((row) => row.slug).sort(), ['backlog', 'done', 'in-progress', 'in-review'])
  }
  const seed = spawnSync('node', ['scripts/steel-demo.mjs', 'seed'], { cwd: root, encoding: 'utf8' })
  writeFileSync(new URL('../.steel-demo/seed-repeat.log', import.meta.url), `${seed.stdout}\n${seed.stderr}`, { mode: 0o600 })
  assert.equal(seed.status, 0, 'Repeated seed must succeed; see .steel-demo/seed-repeat.log')
  assert.deepEqual(await snapshot(), before, 'Repeated seed changed business records')
  assert.deepEqual((await client.query('select id, tenant_id, name, logo_url, logo_preserve_aspect_ratio from organizations where deleted_at is null')).rows, scope, 'Repeated seed changed organization branding')
  const pending = (await client.query("select count(*)::int as count from module_configs where module_id='demo_fixtures' and tenant_id=$1 and organization_id=$2 and value_json->>'state'='pending'", [tenant, org])).rows[0].count
  assert.equal(pending, 0)
  const processes = await client.query("select tablename from pg_tables where schemaname='public' and tablename like '%process_instance%'")
  for (const { tablename } of processes.rows) {
    const count = (await client.query(`select count(*)::int as count from ${tablename}`)).rows[0].count
    assert.equal(count, 0, `${tablename}: seeding must not start an agent`)
  }
  const report = { verifiedAt: new Date().toISOString(), firstSeedCounts: Object.fromEntries(Object.entries(before).map(([table, rows]) => [table, rows.length])), repeatUnchanged: true, pending, processesStarted: 0, totalNetPln: 126400 }
  writeFileSync(new URL('../.steel-demo/verification.json', import.meta.url), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally { await client.end() }
