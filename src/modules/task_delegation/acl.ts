export const features = [
  { id: 'task_delegation.view', title: 'View task delegations', module: 'task_delegation' },
  { id: 'task_delegation.delegate', title: 'Delegate tasks to agents', module: 'task_delegation', dependsOn: ['task_delegation.view'] },
  { id: 'task_delegation.process', title: 'Process delegated tasks', module: 'task_delegation' },
]

export default features
