import { asFunction, asValue } from 'awilix'
import type { AppContainer } from '@open-mercato/shared/lib/di/container'
import { TaskDelegation, TaskProcessWrite } from './data/entities'
import { createTaskDelegationService, TASK_DELEGATION_SERVICE } from './lib/delegationService'

// The app container injects CLASSIC (by parameter name); the service takes a `{ em }` cradle, so it resolves through a proxy.
export function register(container: AppContainer): void {
  container.register({
    TaskDelegation: asValue(TaskDelegation),
    TaskProcessWrite: asValue(TaskProcessWrite),
    [TASK_DELEGATION_SERVICE]: asFunction(createTaskDelegationService).proxy().scoped(),
  })
}
