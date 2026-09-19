import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'
import {
  readEnabledWorkflowCommandIds,
  resolveWorkflowCommandConfigService,
  writeEnabledWorkflowCommandIds,
} from '@open-mercato/core/modules/workflows/lib/workflow-command-settings'
import { listWorkflowSafeCommands } from '@open-mercato/core/modules/workflows/lib/workflow-safe-commands'
import { TASK_DELEGATION_WORKFLOW_COMMAND_IDS } from './workflows'
import { seedTaskDelegationDemo } from './lib/demoSetup'

export const setup: ModuleSetupConfig = {
  defaultRoleFeatures: {
    superadmin: ['task_delegation.view', 'task_delegation.delegate'],
    admin: ['task_delegation.view', 'task_delegation.delegate'],
    employee: ['task_delegation.view', 'task_delegation.delegate'],
  },
  seedDefaults: async ({ container, tenantId }) => {
    const config = resolveWorkflowCommandConfigService(container)
    if (!config) throw new Error('[internal] Workflow command settings are unavailable')
    const catalogue = listWorkflowSafeCommands()
    const stored = await readEnabledWorkflowCommandIds(config, tenantId)
    const baseline = stored ?? catalogue
      .filter((command) => command.defaultEnabled === true)
      .map((command) => command.commandId)
    await writeEnabledWorkflowCommandIds(config, tenantId, [...new Set([...baseline, ...TASK_DELEGATION_WORKFLOW_COMMAND_IDS])])
  },
  seedExamples: async ({ container, tenantId, organizationId }) => {
    await seedTaskDelegationDemo(container, { tenantId, organizationId })
  },
}

export default setup
