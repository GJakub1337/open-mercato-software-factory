import type { ModuleCli } from '@open-mercato/shared/modules/registry'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { personalizeStalZbiorniki } from './lib/personalize'
import { personalizationScopeSchema } from './data/validators'

const USAGE = 'Usage: mercato demo_fixtures seed-stal-zbiorniki --tenant <tenantId> --org <organizationId>'

function readFlag(args: string[], ...names: string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const [key, inline] = args[i]!.replace(/^--/, '').split('=', 2)
    if (!names.includes(key!)) continue
    return inline ?? args[i + 1]
  }
  return undefined
}

const seedDemo: ModuleCli = {
  command: 'seed-stal-zbiorniki',
  async run(rest) {
    const tenantId = readFlag(rest, 'tenant', 'tenantId')
    const organizationId = readFlag(rest, 'org', 'organizationId')
    if (!tenantId || !organizationId) {
      console.error(USAGE)
      return
    }
    const scope = personalizationScopeSchema.parse({ tenantId, organizationId })
    const result = await personalizeStalZbiorniki(await createRequestContainer(), scope)
    console.log(JSON.stringify(result, null, 2))
  },
}

export default [seedDemo]
