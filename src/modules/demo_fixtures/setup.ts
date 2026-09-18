import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'
import { seedStalZbiorniki } from './lib/stalZbiorniki'

export const setup: ModuleSetupConfig = {
  async seedExamples({ em, tenantId, organizationId }) {
    await seedStalZbiorniki(em, { tenantId, organizationId })
  },
}

export default setup
