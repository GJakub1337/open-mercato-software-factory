import { registerWorkflowSafeCommands } from '@open-mercato/core/modules/workflows/lib/workflow-safe-commands'

export const TASK_DELEGATION_WORKFLOW_COMMAND_IDS = [
  'task_delegation.task.set_status',
  'task_delegation.task.link',
  'task_delegation.task.create_followup',
] as const

registerWorkflowSafeCommands([
  {
    commandId: 'task_delegation.task.set_status',
    requiredFeatures: ['task_delegation.process'],
    labelKey: 'task_delegation.workflow.setStatus',
  },
  {
    commandId: 'task_delegation.task.link',
    requiredFeatures: ['task_delegation.process'],
    labelKey: 'task_delegation.workflow.link',
  },
  {
    commandId: 'task_delegation.task.create_followup',
    requiredFeatures: ['task_delegation.process'],
    labelKey: 'task_delegation.workflow.createFollowup',
  },
])
