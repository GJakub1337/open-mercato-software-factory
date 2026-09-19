import type { ModuleInfo } from '@open-mercato/shared/modules/registry'
import './commands'

export const metadata: ModuleInfo = {
  name: 'task_delegation',
  title: 'Task delegation',
  version: '0.1.0',
  description: 'Delegates staff tasks to workflow-backed agents.',
  author: 'Open Mercato Team',
  license: 'Proprietary',
}

export { features } from './acl'
export * from './commands/types'
export * from './lib/delegationService'
