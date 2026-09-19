import type { EntityManager } from '@mikro-orm/postgresql'
import { ProcessDefinition } from '@open-mercato/enterprise/modules/agent_orchestrator/data/entities'
import type { Scope } from './catalogRecord'
import { FACTORY_PUBLISH_PRODUCT_WORKFLOW_ID, PR_OPEN_MILESTONE } from '../workflows'

export const FACTORY_PUBLISH_PROCESS_NAME = 'Factory: publish product page'

/**
 * The one process definition the intake starts (SPEC-001 *The process*). Declares only a
 * `manual` trigger: the `catalog.product.created` subscriber decides which products qualify
 * and starts executions with an idempotency key, which an `event` trigger could not carry.
 * Idempotent per tenant/organization, so it can run from `setup.seedDefaults` and lazily from
 * the intake on tenants that predate this module.
 */
export async function ensureFactoryProcessDefinition(em: EntityManager, scope: Scope): Promise<ProcessDefinition> {
  const existing = await em.findOne(ProcessDefinition, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    name: FACTORY_PUBLISH_PROCESS_NAME,
    deletedAt: null,
  })
  if (existing) return existing

  const definition = em.create(ProcessDefinition, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    name: FACTORY_PUBLISH_PROCESS_NAME,
    description:
      'A product added to the „Od ręki” category becomes a pull request with its product page in the website repo. Started by the catalog.product.created intake; can also be started by hand with { productId }.',
    workflowId: FACTORY_PUBLISH_PRODUCT_WORKFLOW_ID,
    inputDefaults: null,
    inputSchema: null,
    outcomeSchema: null,
    triggers: [{ kind: 'manual', requireFeatures: [] }],
    milestones: [{ key: PR_OPEN_MILESTONE, label: 'PR open', order: 1 }],
    uiMetadata: { icon: 'globe' },
    enabled: true,
    createdBy: null,
  })
  em.persist(definition)
  await em.flush()
  return definition
}
