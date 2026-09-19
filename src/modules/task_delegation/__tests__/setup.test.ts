import { beforeEach, expect, it, jest } from '@jest/globals'
import { clearWorkflowSafeCommandsForTests, registerWorkflowSafeCommands } from '@open-mercato/core/modules/workflows/lib/workflow-safe-commands'
import { setup } from '../setup'
import '../workflows'

const getValue = jest.fn<(...args: unknown[]) => Promise<unknown>>()
const setValue = jest.fn<(...args: unknown[]) => Promise<void>>()

beforeEach(() => {
  getValue.mockReset().mockResolvedValue(null)
  setValue.mockReset().mockResolvedValue(undefined)
  clearWorkflowSafeCommandsForTests()
  registerWorkflowSafeCommands([
    { commandId: 'sales.orders.update', requiredFeatures: ['sales.orders.manage'], defaultEnabled: true },
    { commandId: 'task_delegation.task.set_status', requiredFeatures: ['task_delegation.process'] },
    { commandId: 'task_delegation.task.link', requiredFeatures: ['task_delegation.process'] },
    { commandId: 'task_delegation.task.create_followup', requiredFeatures: ['task_delegation.process'] },
  ])
})

it('enables task workflow commands without dropping grandfathered or stored commands', async () => {
  const container = { resolve: () => ({ getValue, setValue }) }
  await setup.seedDefaults?.({ container, tenantId: 'tenant-id', organizationId: 'org-id', em: {} } as never)
  expect(setValue).toHaveBeenCalledWith(
    'workflows',
    'update_entity_enabled_commands',
    ['sales.orders.update', 'task_delegation.task.set_status', 'task_delegation.task.link', 'task_delegation.task.create_followup'],
    { tenantId: 'tenant-id' },
  )

  getValue.mockResolvedValueOnce(['custom.command'])
  await setup.seedDefaults?.({ container, tenantId: 'tenant-id', organizationId: 'org-id', em: {} } as never)
  expect(setValue).toHaveBeenLastCalledWith(
    'workflows',
    'update_entity_enabled_commands',
    ['custom.command', 'task_delegation.task.set_status', 'task_delegation.task.link', 'task_delegation.task.create_followup'],
    { tenantId: 'tenant-id' },
  )
})
