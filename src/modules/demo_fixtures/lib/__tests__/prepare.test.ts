import { expect, it } from '@jest/globals'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

it.each(['daemon', 'port'])('resumes prepare after a Docker %s failure without replacing credentials', (failure) => {
  const root = mkdtempSync(join(tmpdir(), 'steel-prepare-test-'))
  try {
    mkdirSync(join(root, 'scripts'))
    mkdirSync(join(root, 'bin'))
    copyFileSync('scripts/steel-demo.mjs', join(root, 'scripts/steel-demo.mjs'))
    writeFileSync(join(root, 'package.json'), '{"type":"module"}')
    symlinkSync(join(process.cwd(), 'node_modules'), join(root, 'node_modules'), 'dir')
    writeFileSync(join(root, 'bin/docker'), `#!${process.execPath}
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
const state = path.join(process.cwd(), 'docker-created');
if (process.env.TEST_DOCKER_FAILURE === 'daemon') process.exit(1);
if (args[0] === 'inspect') { if (!fs.existsSync(state)) process.exit(1); console.log('steel-demo'); }
if (args[0] === 'run') { if (fs.existsSync(state)) process.exit(2); fs.writeFileSync(state, 'created'); if (process.env.TEST_DOCKER_FAILURE === 'port') process.exit(1); }
`, { mode: 0o700 })
    const env = { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}` }
    const run = (down: boolean) => spawnSync(process.execPath, ['scripts/steel-demo.mjs', 'prepare'], {
      cwd: root, env: { ...env, TEST_DOCKER_FAILURE: down ? failure : '' }, encoding: 'utf8',
    })
    expect(run(true).status).not.toBe(0)
    const credentials = readFileSync(join(root, '.env'), 'utf8')
    const state = readFileSync(join(root, '.steel-demo/environment.json'), 'utf8')
    expect(run(false).status).toBe(0)
    expect(run(false).status).toBe(0)
    expect(readFileSync(join(root, '.env'), 'utf8')).toBe(credentials)
    expect(readFileSync(join(root, '.steel-demo/environment.json'), 'utf8')).toBe(state)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
