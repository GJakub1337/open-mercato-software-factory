import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'
import { ensureFactoryDeliver } from './lib/deliver'

export const setup: ModuleSetupConfig = {
  // Structural, not demo data: every tenant gets the process a delegation to Factory starts.
  async seedDefaults({ container, tenantId, organizationId }) {
    await ensureFactoryDeliver(container, { tenantId, organizationId })
  },
}

export default setup
