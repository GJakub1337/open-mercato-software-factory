import { createModuleEvents } from '@open-mercato/shared/modules/events'

const events = [
  { id: 'task_delegation.task.delegated', label: 'Task delegated', entity: 'task', category: 'lifecycle' },
  { id: 'task_delegation.task.undelegated', label: 'Task undelegated', entity: 'task', category: 'lifecycle' },
  { id: 'task_delegation.task.linked', label: 'Task process linked', entity: 'task', category: 'lifecycle' },
  { id: 'task_delegation.task.changed', label: 'Task delegation changed', entity: 'task', category: 'lifecycle', clientBroadcast: true },
] as const

export const eventsConfig = createModuleEvents({ moduleId: 'task_delegation', events })
export const emitTaskDelegationEvent = eventsConfig.emit
export default eventsConfig
