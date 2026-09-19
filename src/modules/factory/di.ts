import { asFunction } from 'awilix'
import type { EntityManager } from '@mikro-orm/postgresql'
import type { AppContainer } from '@open-mercato/shared/lib/di/container'
import { registerWorkflowFunctions } from '@open-mercato/core/modules/workflows/lib/workflow-function-registry'
import type { ActivityContext } from '@open-mercato/core/modules/workflows/lib/activity-executor'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { GitHubClient, readGitHubConfigFromEnv } from './lib/github'
import { publishProductPage, type PublishResult } from './lib/publishProduct'
import { OPEN_PRODUCT_PR_FUNCTION } from './workflows'

const logger = createLogger('factory')

registerWorkflowFunctions([
  {
    name: OPEN_PRODUCT_PR_FUNCTION,
    description: 'Render the product page of context.productId from the catalog and open a PR in the website repo.',
  },
])

function readScope(context: ActivityContext): { tenantId: string; organizationId: string } {
  const tenantId = context.workflowInstance.tenantId ?? null
  const organizationId = context.workflowInstance.organizationId ?? null
  if (!tenantId || !organizationId) {
    throw new Error(`${OPEN_PRODUCT_PR_FUNCTION}: workflow instance has no tenant/organization scope`)
  }
  return { tenantId, organizationId }
}

/**
 * `EXECUTE_FUNCTION` handler for `factory.publish_product`. Scope comes from the workflow
 * instance, never from the context payload; the product id comes from the process input.
 */
export function createOpenProductPrFunction(em: EntityManager) {
  return async (_args: Record<string, unknown>, context: ActivityContext): Promise<PublishResult> => {
    const productId = context.workflowContext?.productId
    if (typeof productId !== 'string' || !productId) {
      throw new Error(`${OPEN_PRODUCT_PR_FUNCTION}: context.productId is required`)
    }
    const scope = readScope(context)
    const github = new GitHubClient(readGitHubConfigFromEnv())
    const result = await publishProductPage({ em: em.fork(), github, appUrl: process.env.APP_URL ?? null }, scope, productId)
    logger.info('product page PR ready', { productId, prUrl: result.prUrl, reused: result.reused })
    return result
  }
}

export function register(container: AppContainer) {
  // CLASSIC injection: awilix resolves by parameter name, so `em` is the request-scoped entity manager.
  container.register({
    [`workflowFunction:${OPEN_PRODUCT_PR_FUNCTION}`]: asFunction((em: EntityManager) => createOpenProductPrFunction(em)),
  })
}
