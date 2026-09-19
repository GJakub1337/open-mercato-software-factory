import { z } from 'zod'
import type { ModuleConfigService } from '@open-mercato/core/modules/configs/lib/module-config-service'
import type { DemoSeedScope } from './stalZbiorniki'

const receiptSchema = z.object({ version: z.literal(1), state: z.literal('complete'), id: z.string().min(1), owned: z.boolean() })
export type SeedRecord = z.infer<typeof receiptSchema>

export async function ensureSeedRecord(
  configs: ModuleConfigService,
  scope: DemoSeedScope,
  key: string,
  find: () => Promise<string | null>,
  create: () => Promise<string>,
): Promise<SeedRecord & { outcome: 'created' | 'preserved' | 'adopted' }> {
  const name = `steel-demo:${scope.organizationId}:${key}`
  await configs.invalidate('demo_fixtures', name, scope)
  const stored = await configs.getRecord('demo_fixtures', name, scope)
  if (stored) {
    if (stored.tenantId !== scope.tenantId || stored.organizationId !== scope.organizationId) {
      throw new Error(`Seed receipt scope mismatch: ${key}`)
    }
    const parsed = receiptSchema.safeParse(stored.value)
    if (!parsed.success) throw new Error(`Unresolved seed receipt: ${key}. Inspect the previous command result before recovery; do not replay it.`)
    return { ...parsed.data, outcome: 'preserved' }
  }
  const existing = await find()
  if (!existing) {
    const pending = await configs.setValue('demo_fixtures', name, { version: 1, state: 'pending' }, scope)
    if (!pending) throw new Error(`Cannot persist seed intent: ${key}`)
  }
  const id = existing ?? await create()
  const receipt: SeedRecord = { version: 1, state: 'complete', id, owned: !existing }
  if (!await configs.setValue('demo_fixtures', name, receipt, scope)) throw new Error(`Cannot persist seed result: ${key}`)
  return { ...receipt, outcome: existing ? 'adopted' : 'created' }
}
