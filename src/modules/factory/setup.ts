import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'
import { ensureFactoryProcessDefinition } from './lib/processDefinition'

export const setup: ModuleSetupConfig = {
  // Structural, not demo data: every tenant gets the process the intake starts.
  async seedDefaults({ em, tenantId, organizationId }) {
    await ensureFactoryProcessDefinition(em, { tenantId, organizationId })
  },
}

export default setup
