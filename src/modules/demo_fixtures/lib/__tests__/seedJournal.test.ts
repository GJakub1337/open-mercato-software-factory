import { expect, it, jest } from '@jest/globals'
import { ensureSeedRecord } from '../seedJournal'
import type { ModuleConfigService, ModuleConfigRecord } from '@open-mercato/core/modules/configs/lib/module-config-service'

const scope = { tenantId: '123e4567-e89b-42d3-a456-426614174000', organizationId: '123e4567-e89b-42d3-a456-426614174001' }
function store() {
  const rows = new Map<string, ModuleConfigRecord>()
  const configs = {
    invalidate: jest.fn(async () => {}),
    getRecord: jest.fn(async (_module: string, name: string, target: typeof scope) => rows.get(`${target.tenantId}:${name}`) ?? null),
    setValue: jest.fn(async (moduleId: string, name: string, value: unknown, target: typeof scope) => {
      const row = { moduleId, name, value, ...target, source: 'tenant' as const, createdAt: '', updatedAt: '' }
      rows.set(`${target.tenantId}:${name}`, row)
      return row
    }),
  } as unknown as ModuleConfigService
  return { configs, rows }
}

it('does not create again after an operator renames a seeded record', async () => {
  const { configs } = store()
  const find = jest.fn(async () => null)
  const create = jest.fn(async () => 'record-id')
  await ensureSeedRecord(configs, scope, 'customer.brewery', find, create)
  await ensureSeedRecord(configs, scope, 'customer.brewery', find, create)
  expect(create).toHaveBeenCalledTimes(1)
  expect(find).toHaveBeenCalledTimes(1)
})

it('adopts a collision without calling its creation or changing its data', async () => {
  const { configs } = store()
  const create = jest.fn(async () => 'new')
  const result = await ensureSeedRecord(configs, scope, 'product.zwp', async () => 'someone-elses-record', create)
  expect(result).toMatchObject({ id: 'someone-elses-record', owned: false, outcome: 'adopted' })
  expect(create).not.toHaveBeenCalled()
})

it('isolates the same logical key between organizations and tenants', async () => {
  const { configs } = store()
  const create = jest.fn(async () => 'new')
  for (const target of [scope, { ...scope, organizationId: 'other-org' }, { ...scope, tenantId: 'other-tenant' }]) {
    await ensureSeedRecord(configs, target, 'member.owner', async () => null, create)
  }
  expect(create).toHaveBeenCalledTimes(3)
})

it('refuses to replay an uncertain command after a partial failure', async () => {
  const { configs } = store()
  const create = jest.fn(async (): Promise<string> => { throw new Error('connection interrupted after commit') })
  await expect(ensureSeedRecord(configs, scope, 'task.capacity', async () => null, create)).rejects.toThrow('connection interrupted')
  await expect(ensureSeedRecord(configs, scope, 'task.capacity', async () => null, create)).rejects.toThrow('Unresolved seed receipt')
  expect(create).toHaveBeenCalledTimes(1)
})

it('does not resurrect records removed by an operator', async () => {
  const { configs } = store()
  await ensureSeedRecord(configs, scope, 'task.done', async () => null, async () => 'old-id')
  const create = jest.fn(async () => 'resurrected-id')
  expect(await ensureSeedRecord(configs, scope, 'task.done', async () => null, create)).toMatchObject({ id: 'old-id', outcome: 'preserved' })
  expect(create).not.toHaveBeenCalled()
})

it('rejects a global fallback or wrong organization receipt', async () => {
  const { configs } = store()
  jest.spyOn(configs, 'getRecord').mockResolvedValue({ tenantId: null, organizationId: null } as ModuleConfigRecord)
  const create = jest.fn(async () => 'new')
  await expect(ensureSeedRecord(configs, scope, 'key', async () => null, create)).rejects.toThrow('scope mismatch')
  expect(create).not.toHaveBeenCalled()
})
