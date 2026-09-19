import { asValue } from 'awilix'
import type { AppContainer } from '@open-mercato/shared/lib/di/container'
import { registerWorkflowFunctions } from '@open-mercato/core/modules/workflows/lib/workflow-function-registry'
import { createDeliverFunction, DELIVER_FUNCTION } from './lib/deliver'

registerWorkflowFunctions([
  {
    name: DELIVER_FUNCTION,
    description: 'Open the website PR for the product linked from the delegated board task, then link it and move the task to review.',
  },
])

export function register(container: AppContainer) {
  // The function builds its own request container per run, so it holds no scoped services.
  container.register({ [`workflowFunction:${DELIVER_FUNCTION}`]: asValue(createDeliverFunction()) })
}
