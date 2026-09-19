import { expect, it, jest } from '@jest/globals'
jest.mock('@open-mercato/core/modules/sales/lib/dictionaries', () => ({
  ensureSalesDictionary: jest.fn(async () => ({})),
  seedSalesStatusDictionaries: jest.fn(async () => {}),
  normalizeDictionaryValue: (value: string) => value,
}))
import { seedSuntagoOrder } from '../stalZbiorniki'

it('resolves legacy order products by adopted IDs after their handles change', async () => {
  const find = jest.fn<(entity: unknown, query: unknown) => Promise<unknown[]>>(async () => [])
  const em = { count: jest.fn(async () => 0), find } as unknown as Parameters<typeof seedSuntagoOrder>[0]
  const scope = { tenantId: 'tenant', organizationId: 'org' }
  const ids = new Map([['zppoz-20', 'existing-fire-tank'], ['zch-3000', 'existing-chemical-tank']])
  await expect(seedSuntagoOrder(em, {} as Parameters<typeof seedSuntagoOrder>[1], scope, {} as Parameters<typeof seedSuntagoOrder>[3], ids)).rejects.toThrow('missing products')
  expect(find).toHaveBeenCalledWith(expect.anything(), { ...scope, id: { $in: [...ids.values()] }, deletedAt: null })
})

it('uses renamed existing products in legacy order lines without creating products', async () => {
  const products = [
    { id: 'fire', handle: 'operator-fire', sku: 'ZPPOZ-20', title: 'Operator fire tank' },
    { id: 'chemical', handle: 'operator-chemical', sku: 'ZCH-3000', title: 'Operator chemical tank' },
  ]
  const create = jest.fn()
  const em = { count: jest.fn(async () => 0), find: jest.fn(async () => products), findOne: jest.fn(async () => null), create } as unknown as Parameters<typeof seedSuntagoOrder>[0]
  const calculateDocumentTotals = jest.fn<(input: unknown) => Promise<never>>(async () => { throw new Error('calculation boundary reached') })
  const calculation = { calculateDocumentTotals } as unknown as Parameters<typeof seedSuntagoOrder>[1]
  await expect(seedSuntagoOrder(em, calculation, { tenantId: 'tenant', organizationId: 'org' }, {} as Parameters<typeof seedSuntagoOrder>[3], new Map([['zppoz-20', 'fire'], ['zch-3000', 'chemical']]))).rejects.toThrow('calculation boundary reached')
  expect(calculateDocumentTotals).toHaveBeenCalledWith(expect.objectContaining({ lines: expect.arrayContaining([
    expect.objectContaining({ productId: 'fire', name: 'Operator fire tank' }),
    expect.objectContaining({ productId: 'chemical', name: 'Operator chemical tank' }),
  ]) }))
  expect(create).not.toHaveBeenCalled()
})
