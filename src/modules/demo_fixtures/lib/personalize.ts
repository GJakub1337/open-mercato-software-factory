import type { AppContainer } from '@open-mercato/shared/lib/di/container'
import type { CommandBus } from '@open-mercato/shared/lib/commands'
import type { QueryEngine } from '@open-mercato/shared/lib/query/types'
import type { EntityManager } from '@mikro-orm/postgresql'
import type { ModuleConfigService } from '@open-mercato/core/modules/configs/lib/module-config-service'
import type { SalesCalculationService } from '@open-mercato/core/modules/sales/services/salesCalculationService'
import { Organization } from '@open-mercato/core/modules/directory/data/entities'
import { User } from '@open-mercato/core/modules/auth/data/entities'
import { findWithDecryption, findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { seedTaskDelegationDemo } from '../../task_delegation/lib/demoSetup'
import { systemContext } from '../../task_delegation/lib/systemContext'
import { FACTORY_AGENT_ID, FACTORY_AGENT_DISPLAY_NAME } from '../../task_delegation/lib/agentIdentity'
import { personalizationScopeSchema } from '../data/validators'
import { seedParkOfPoland, seedSuntagoOrder, STAL_ZBIORNIKI_CATEGORIES, STAL_ZBIORNIKI_PRODUCTS, type DemoSeedScope } from './stalZbiorniki'
import { ensureSeedRecord, type SeedRecord } from './seedJournal'
import { DEMO_COMPANY_NAME, DEMO_CUSTOMERS, DEMO_NOTICE, DEMO_PEOPLE, DEMO_PROJECTS, DEMO_TASKS, DEMO_TEAMS } from './companyStory'

type Row = { id: string; [field: string]: unknown }
type PrincipalService = { provision(scope: DemoSeedScope, input: { agentDefinitionId: string; displayName: string; roleFeatures: string[] }): Promise<{ userId: string }> }

export async function personalizeStalZbiorniki(container: AppContainer, input: DemoSeedScope) {
  const scope = personalizationScopeSchema.parse(input)
  const em = container.resolve<EntityManager>('em').fork()
  const organization = await findOneWithDecryption(em, Organization, { id: scope.organizationId, tenant: scope.tenantId, deletedAt: null }, {}, scope)
  if (!organization) throw new Error('Organization does not belong to the supplied tenant or is deleted.')
  const users = await findWithDecryption(em, User, { ...scope, deletedAt: null }, { orderBy: { createdAt: 'asc' } }, scope)
  const owner = users.find((user) => user.kind !== 'agent')
  if (!owner) throw new Error('An existing human owner in this organization is required. Run init first.')

  const connection = em.getConnection()
  return connection.transactional(async (transaction) => {
    const locks: Array<{ acquired: boolean }> = await connection.execute(
      'select pg_try_advisory_xact_lock(hashtext(?), hashtext(?)) as acquired',
      ['demo_fixtures.steel-demo', `${scope.tenantId}:${scope.organizationId}`],
      'all', transaction,
    )
    if (!locks[0]?.acquired) throw new Error('Another personalization run owns this tenant/organization. No changes made.')
    return seedCompany(container, scope, owner.id, organization)
  })
}

async function seedCompany(container: AppContainer, scope: DemoSeedScope, ownerUserId: string, organization: Organization) {
  const configs = container.resolve<ModuleConfigService>('moduleConfigService')
  const bus = container.resolve<CommandBus>('commandBus')
  const query = container.resolve<QueryEngine>('queryEngine')
  const ctx = { ...systemContext(container, scope), bulkImport: { skipEvents: true, skipNotifications: true } }
  const counts = { created: 0, preserved: 0, adopted: 0 }

  async function rows(entity: string, filters: Record<string, unknown>, fields: string[] = []): Promise<Row[]> {
    const result: Row[] = []
    for (let page = 1; ; page += 1) {
      const batch = await query.query<Row>(entity, { fields: ['id', ...fields], filters, ...scope, page: { page, pageSize: 100 } })
      result.push(...batch.items)
      if (batch.items.length < 100) return result
    }
  }
  async function find(entity: string, filters: Record<string, unknown>): Promise<string | null> {
    return (await rows(entity, filters))[0]?.id ?? null
  }
  async function execute(command: string, resultKey: string, data: Record<string, unknown>): Promise<string> {
    const { result } = await bus.execute<Record<string, unknown>, Record<string, unknown>>(command, { input: { ...scope, ...data }, ctx })
    const id = result[resultKey]
    if (typeof id !== 'string' || !id) throw new Error(`Missing ${resultKey} from ${command}`)
    return id
  }
  async function ensure(key: string, lookup: () => Promise<string | null>, create: () => Promise<string>): Promise<SeedRecord> {
    const record = await ensureSeedRecord(configs, scope, key, lookup, create)
    counts[record.outcome] += 1
    return record
  }
  function required(records: Map<string, SeedRecord>, key: string): SeedRecord {
    const record = records.get(key)
    if (!record) throw new Error(`Missing seed dependency: ${key}`)
    return record
  }

  if (organization.name === DEMO_COMPANY_NAME) {
    await ensure('branding.organization', async () => organization.logoUrl ? organization.id : null, async () => {
      const baseUrl = new URL(process.env.APP_URL ?? 'http://localhost:3000')
      if (!['http:', 'https:'].includes(baseUrl.protocol)) throw new Error('APP_URL must use http or https.')
      return execute('directory.organizations.update', 'id', {
        id: organization.id, parentId: organization.parentId, childIds: organization.childIds,
        logoUrl: new URL('/brand/stal-zbiorniki-icon.png', baseUrl).href, logoPreserveAspectRatio: true,
      })
    })
  }

  const priceKindId = await find('catalog:catalog_price_kind', { code: 'regular' })
  if (!priceKindId) throw new Error('Missing regular price kind. Initialize catalog defaults first.')
  const categories = new Map<string, SeedRecord>()
  for (const category of STAL_ZBIORNIKI_CATEGORIES) {
    categories.set(category.slug, await ensure(`category.${category.slug}`,
      () => find('catalog:catalog_product_category', { slug: category.slug }),
      () => execute('catalog.categories.create', 'categoryId', { ...category, isActive: true })))
  }
  const products = new Map<string, SeedRecord>()
  for (const product of STAL_ZBIORNIKI_PRODUCTS) {
    const record = await ensure(`product.${product.handle}`,
      async () => await find('catalog:catalog_product', { handle: product.handle }) ?? await find('catalog:catalog_product', { sku: product.sku }),
      () => execute('catalog.products.create', 'productId', {
        title: product.title, subtitle: product.subtitle, description: `${product.description}\n\n${DEMO_NOTICE}`,
        sku: product.sku, handle: product.handle, productType: 'simple', primaryCurrencyCode: 'PLN', defaultUnit: 'pc',
        weightValue: product.weightKg, weightUnit: 'kg', dimensions: product.dimensionsMm ? { ...product.dimensionsMm, unit: 'mm' } : null,
        taxRate: 23, countryOfOriginCode: 'PL', metadata: { ...product.metadata, demo: true },
        categoryIds: product.categories.map((slug) => required(categories, slug).id), isActive: true,
      }))
    products.set(product.handle, record)
    if (record.owned) {
      await ensure(`price.${product.handle}`, () => find('catalog:catalog_product_price', { product_id: record.id }),
        () => execute('catalog.prices.create', 'priceId', { productId: record.id, priceKindId, currencyCode: 'PLN', unitPriceNet: product.netPricePln, taxRate: 23, minQuantity: 1 }))
    }
  }
  const customers = new Map<string, SeedRecord>()
  for (const customer of DEMO_CUSTOMERS) {
    customers.set(customer.key, await ensure(`customer.${customer.key}`,
      async () => (await rows('customers:customer_entity', { kind: 'company' }, ['display_name'])).find((row) => row.display_name === customer.displayName)?.id ?? null,
      () => execute('customers.companies.create', 'entityId', {
        displayName: customer.displayName, legalName: customer.displayName, description: `${customer.description}\n\n${DEMO_NOTICE}`,
        domain: customer.domain, websiteUrl: `https://${customer.domain}/`, primaryEmail: `kontakt@${customer.domain}`,
        industry: customer.industry, source: 'steel-demo', lifecycleStage: customer.key === 'transport' ? 'lead' : 'customer',
      })))
  }
  const teams = new Map<string, SeedRecord>()
  for (const team of DEMO_TEAMS) {
    teams.set(team.key, await ensure(`team.${team.key}`,
      () => find('staff:staff_team', { name: team.name }),
      () => execute('staff.teams.create', 'teamId', { name: team.name, description: `${team.description} ${DEMO_NOTICE}` })))
  }
  const people = new Map<string, SeedRecord>()
  for (const person of DEMO_PEOPLE) {
    people.set(person.key, await ensure(`person.${person.key}`,
      async () => (person.key === 'owner' ? await find('staff:staff_team_member', { user_id: ownerUserId }) : null)
        ?? (await rows('staff:staff_team_member', {}, ['display_name'])).find((row) => row.display_name === person.name)?.id ?? null,
      () => execute('staff.team-members.create', 'memberId', {
        displayName: person.name, teamId: required(teams, person.team).id, description: `${person.role}. Osoba fikcyjna.`,
        ...(person.key === 'owner' ? { userId: ownerUserId } : {}),
      })))
  }
  const projects = new Map<string, SeedRecord>()
  for (const project of DEMO_PROJECTS) {
    const record = await ensure(`project.${project.key}`, () => find('staff:staff_time_project', { code: project.code }),
      () => execute('staff.timesheets.time_projects.create', 'timeProjectId', {
        name: project.name, code: project.code, description: `${project.description} ${DEMO_NOTICE}`,
        customerId: required(customers, project.customer).id, ownerUserId, currencyCode: 'PLN', billableByDefault: false,
      }))
    projects.set(project.key, record)
    if (record.owned) {
      for (const person of project.people) {
        const staffMemberId = required(people, person).id
        await ensure(`membership.${project.key}.${person}`,
          () => find('staff:staff_time_project_member', { time_project_id: record.id, staff_member_id: staffMemberId }),
          () => execute('staff.timesheets.time_project_members.assign', 'timeProjectMemberId', { timeProjectId: record.id, staffMemberId, assignedStartDate: '2026-01-01' }))
      }
    }
  }
  for (const task of DEMO_TASKS) {
    const project = required(projects, task.project)
    if (!project.owned) continue
    await ensure(`task.${task.key}`, () => find('staff:staff_time_task', { time_project_id: project.id, title: task.title }), async () => {
      const taskStatusId = await find('staff:staff_time_task_status', { time_project_id: project.id, slug: task.status })
      if (!taskStatusId) throw new Error(`Project ${task.project} no longer has column ${task.status}. Preserve edits and resolve manually.`)
      return execute('staff.timesheets.tasks.create', 'taskId', {
        timeProjectId: project.id, title: task.title, description: `${task.description}\n\n${DEMO_NOTICE}`,
        taskStatusId, assigneeStaffMemberId: required(people, task.person).id,
      })
    })
  }
  await ensure('order.water', () => find('sales:sales_order', { order_number: 'SZ-DEMO-0042' }),
    () => execute('sales.orders.create', 'orderId', {
      orderNumber: 'SZ-DEMO-0042', customerEntityId: required(customers, 'water').id, currencyCode: 'PLN', placedAt: '2026-09-01',
      expectedDeliveryAt: '2026-09-25', comments: `Aqua Dolina: komplet zbiorników do instalacji technologicznej. ${DEMO_NOTICE}`,
      lines: [{ handle: 'zppoz-20', quantity: 1 }, { handle: 'zch-3000', quantity: 2 }].map((line) => {
        const product = STAL_ZBIORNIKI_PRODUCTS.find((item) => item.handle === line.handle)!
        return { productId: required(products, line.handle).id, name: product.title, kind: 'product', quantity: line.quantity,
          quantityUnit: 'pc', currencyCode: 'PLN', unitPriceNet: product.netPricePln, taxRate: 23 }
      }),
    }))
  await ensure('legacy.company', () => find('sales:sales_order', { order_number: 'SO-2026-0042' }), async () => {
    const em = container.resolve<EntityManager>('em')
    const customer = await seedParkOfPoland(em, scope)
    await seedSuntagoOrder(em, container.resolve<SalesCalculationService>('salesCalculationService'), scope, customer,
      new Map([...products].map(([handle, record]) => [handle, record.id])))
    return scope.organizationId
  })
  await ensure('legacy.board', async () => null, async () => {
    const board = await seedTaskDelegationDemo(container, scope)
    return board.projectId
  })
  let agentUserId: string | null = null
  if (container.hasRegistration('agentPrincipalService')) {
    const record = await ensure('agent.factory', async () => null, async () => {
      const principal = await container.resolve<PrincipalService>('agentPrincipalService').provision(scope, {
        agentDefinitionId: FACTORY_AGENT_ID, displayName: FACTORY_AGENT_DISPLAY_NAME, roleFeatures: ['task_delegation.view', 'task_delegation.process'],
      })
      return principal.userId
    })
    agentUserId = record.id
  }
  return { ...scope, ...counts, agentUserId, projects: Object.fromEntries([...projects].map(([key, value]) => [key, value.id])) }
}
