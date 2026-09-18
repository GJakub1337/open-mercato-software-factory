import type { EntityManager } from '@mikro-orm/postgresql'
import type { ModuleCli } from '@open-mercato/shared/modules/registry'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { seedStalZbiorniki } from './lib/stalZbiorniki'

const USAGE = 'Usage: mercato demo_fixtures seed-stal-zbiorniki --tenant <tenantId> --org <organizationId>'

function readFlag(args: string[], ...names: string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const [key, inline] = args[i]!.replace(/^--/, '').split('=', 2)
    if (!names.includes(key!)) continue
    return inline ?? args[i + 1]
  }
  return undefined
}

// For a demo instance initialised with `--no-examples`: seeds only the Stal-Zbiorniki
// catalog, without core's furniture examples.
const seedCatalog: ModuleCli = {
  command: 'seed-stal-zbiorniki',
  async run(rest) {
    const tenantId = readFlag(rest, 'tenant', 'tenantId')
    const organizationId = readFlag(rest, 'org', 'organizationId')
    if (!tenantId || !organizationId) {
      console.error(USAGE)
      return
    }
    const container = await createRequestContainer()
    const em = container.resolve('em') as EntityManager
    const created = await seedStalZbiorniki(em, { tenantId, organizationId })
    console.log(`Stal-Zbiorniki: ${created} products created for org=${organizationId}, tenant=${tenantId}`)
  },
}

export default [seedCatalog]
