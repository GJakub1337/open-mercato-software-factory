import type { AwilixContainer } from 'awilix'
import type { EntityManager } from '@mikro-orm/postgresql'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { AgentPrincipal } from '@open-mercato/enterprise/modules/agent_orchestrator/data/entities'
import type { CommandBus, CommandRuntimeContext } from '@open-mercato/shared/lib/commands'
import type { QueryEngine } from '@open-mercato/shared/lib/query/types'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { DEMO_PROJECT_CODE, FACTORY_AGENT_ID } from '../../tasks/lib/demoSetup'
import type { Scope } from './catalogRecord'

export type BoardProduct = { id: string; sku: string | null; title: string }

export type ProductTaskResult =
  | { status: 'delegated' | 'already_delegated'; taskId: string; created: boolean; delegationId: string | null }
  | { status: 'skipped'; reason: 'no_demo_project' | 'no_project_owner' | 'no_factory_agent' | 'not_in_backlog'; taskId: string | null }

const PRODUCT_LINK = /\/backend\/catalog\/products\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

export function productTaskTitle(product: BoardProduct): string {
  return `Opublikuj stronę produktu ${product.sku ?? product.title}`
}

/**
 * The task body carries the catalog link. It is the only product reference the factory run
 * reads back (`readProductIdFromTask`), so a task a person creates by hand with the same link
 * works too (SPEC-004 fallback: „Marek tworzy zadanie ręcznie z linkiem do produktu”).
 */
export function productTaskDescription(product: BoardProduct, appUrl?: string | null): string {
  const base = appUrl ? appUrl.replace(/\/$/, '') : ''
  return [
    `Nowy produkt „Od ręki” w katalogu: ${product.title}${product.sku ? ` (${product.sku})` : ''}.`,
    '',
    `Produkt: ${base}/backend/catalog/products/${product.id}`,
    '',
    'Fabryka dodaje stronę produktu na stronie www jako PR z preview.',
  ].join('\n')
}

export function readProductIdFromTask(description: string | null | undefined): string | null {
  const match = description ? PRODUCT_LINK.exec(description) : null
  return match ? match[1]!.toLowerCase() : null
}

type ProjectRow = { id: string; owner_user_id: string | null }
type TaskRow = { id: string; description: string | null }

/**
 * A command context acting as `userId`, built on a real request container: the tasks commands
 * check optional orchestrator registrations through `container.hasRegistration`.
 */
export function actingContext(container: AwilixContainer, scope: Scope, userId: string): CommandRuntimeContext {
  return {
    container,
    auth: { sub: userId, tenantId: scope.tenantId, orgId: scope.organizationId } as CommandRuntimeContext['auth'],
    organizationScope: null,
    selectedOrganizationId: scope.organizationId,
    organizationIds: [scope.organizationId],
    request: new Request('http://factory.internal/tasks', { method: 'POST' }),
  }
}

async function findFactoryAgentUserId(container: AwilixContainer, scope: Scope): Promise<string | null> {
  const hasRegistration = (container as { hasRegistration?: (name: string) => boolean }).hasRegistration
  if (typeof hasRegistration !== 'function' || !hasRegistration.call(container, 'AgentPrincipal')) return null
  const em = container.resolve<EntityManager>('em').fork()
  const principal = await findOneWithDecryption(em, AgentPrincipal, {
    ...scope, agentDefinitionId: FACTORY_AGENT_ID, enabled: true, deletedAt: null,
  }, {}, scope)
  return principal?.userId ?? null
}

/**
 * Scene 3 intake (SPEC-004): puts the product on the DEMO board as a task and delegates it to
 * the factory agent, which starts `factory.deliver` (tasks' start-factory subscriber). Acts as
 * the DEMO project owner, who becomes the accountable assignee. Idempotent per product: an
 * existing task linking the product is reused, and an active delegation is left alone.
 */
export async function openProductTask(
  container: AwilixContainer,
  scope: Scope,
  product: BoardProduct,
  options: { appUrl?: string | null } = {},
): Promise<ProductTaskResult> {
  const qe = container.resolve<QueryEngine>('queryEngine')
  const bus = container.resolve<CommandBus>('commandBus')

  const projects = await qe.query<ProjectRow>('staff:staff_time_project', {
    fields: ['id', 'owner_user_id'], filters: { code: DEMO_PROJECT_CODE }, page: { page: 1, pageSize: 1 },
    tenantId: scope.tenantId, organizationId: scope.organizationId,
  })
  const project = projects.items[0]
  if (!project) return { status: 'skipped', reason: 'no_demo_project', taskId: null }
  if (!project.owner_user_id) return { status: 'skipped', reason: 'no_project_owner', taskId: null }
  const agentUserId = await findFactoryAgentUserId(container, scope)
  if (!agentUserId) return { status: 'skipped', reason: 'no_factory_agent', taskId: null }
  const ctx = actingContext(container, scope, project.owner_user_id)

  const tasks = await qe.query<TaskRow>('staff:staff_time_task', {
    fields: ['id', 'description'], filters: { time_project_id: project.id }, page: { page: 1, pageSize: 500 },
    tenantId: scope.tenantId, organizationId: scope.organizationId,
  })
  let taskId = tasks.items.find((task) => readProductIdFromTask(task.description) === product.id.toLowerCase())?.id ?? null
  const created = !taskId
  if (!taskId) {
    const { result } = await bus.execute<Record<string, unknown>, { taskId: string }>('staff.timesheets.tasks.create', {
      input: {
        ...scope,
        timeProjectId: project.id,
        title: productTaskTitle(product),
        description: productTaskDescription(product, options.appUrl),
      },
      ctx,
    })
    taskId = result.taskId
  }

  try {
    const { result } = await bus.execute<Record<string, unknown>, { taskId: string; delegationId: string }>('tasks.task.delegate', {
      input: { taskId, agentUserId },
      ctx: actingContext(container, scope, project.owner_user_id),
    })
    return { status: 'delegated', taskId, created, delegationId: result.delegationId }
  } catch (error) {
    const code = isCrudHttpError(error) ? (error.body as { code?: string } | undefined)?.code : undefined
    if (code === 'already_delegated') return { status: 'already_delegated', taskId, created, delegationId: null }
    if (code === 'invalid_transition') return { status: 'skipped', reason: 'not_in_backlog', taskId }
    throw error
  }
}
