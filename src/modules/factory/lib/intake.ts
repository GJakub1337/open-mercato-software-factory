import type { EntityManager } from '@mikro-orm/postgresql'
import type { CommandBus, CommandRuntimeContext } from '@open-mercato/shared/lib/commands'
import type {
  StartProcessExecutionInput,
  StartProcessExecutionResult,
} from '@open-mercato/enterprise/modules/agent_orchestrator/commands/processes'
import type { Scope } from './catalogRecord'
import { ensureFactoryProcessDefinition } from './processDefinition'

export type IntakeProduct = { id: string; sku: string | null; title: string }

export type IntakeTrigger = { kind: 'event'; ref: string } | { kind: 'manual'; ref?: string }

export type IntakeResult = { executionId: string; deduplicated: boolean; processDefinitionId: string }

/** The context shape `agent_orchestrator.processes.startExecution` needs from a non-request caller. */
function systemCommandContext(resolve: (name: string) => unknown, scope: Scope): CommandRuntimeContext {
  return {
    container: {
      resolve,
      cradle: new Proxy({}, { get: (_target, prop: string) => resolve(prop) }),
    } as unknown as CommandRuntimeContext['container'],
    auth: null,
    organizationScope: null,
    selectedOrganizationId: scope.organizationId,
    organizationIds: [scope.organizationId],
  }
}

/**
 * Starts one `factory.publish_product` execution for a product, idempotent per product id
 * (`product:<id>`): a retried event or a second delivery reuses the first execution.
 */
export async function startProductPublish(
  deps: { em: EntityManager; commandBus: CommandBus; resolve: (name: string) => unknown },
  scope: Scope,
  product: IntakeProduct,
  triggeredBy: IntakeTrigger,
): Promise<IntakeResult> {
  const definition = await ensureFactoryProcessDefinition(deps.em, scope)
  const { result } = await deps.commandBus.execute<StartProcessExecutionInput, StartProcessExecutionResult>('agent_orchestrator.processes.startExecution', {
    input: {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      processDefinitionId: definition.id,
      input: { productId: product.id, sku: product.sku, title: product.title, ...scope },
      idempotencyKey: `product:${product.id}`,
      sourceEntityType: 'catalog:product',
      sourceEntityId: product.id,
      triggeredBy,
    },
    ctx: systemCommandContext(deps.resolve, scope),
  })
  return { ...result, processDefinitionId: definition.id }
}
