import type { EntityManager } from '@mikro-orm/postgresql'
import type { ModuleCli } from '@open-mercato/shared/modules/registry'
import type { CommandBus } from '@open-mercato/shared/lib/commands'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { CatalogProduct } from '@open-mercato/core/modules/catalog/data/entities'
import { GitHubClient, readGitHubConfigFromEnv } from './lib/github'
import { startProductPublish } from './lib/intake'
import { ensureFactoryProcessDefinition } from './lib/processDefinition'
import { publishProductPage } from './lib/publishProduct'

const USAGE = [
  'Usage:',
  '  mercato factory publish-product --product <productId> --tenant <tenantId> --org <organizationId> [--direct]',
  '  mercato factory ensure-process --tenant <tenantId> --org <organizationId>',
  '',
  '  publish-product  starts the factory.publish_product process for a product (needs the workers running);',
  '                   with --direct it opens the PR in-process instead, for rehearsals and debugging.',
  '  ensure-process   creates the process definition for a tenant seeded before this module existed.',
].join('\n')

function readFlag(args: string[], ...names: string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const [key, inline] = args[i]!.replace(/^--/, '').split('=', 2)
    if (!names.includes(key!)) continue
    return inline ?? args[i + 1]
  }
  return undefined
}

function readScope(rest: string[]): { tenantId: string; organizationId: string } | null {
  const tenantId = readFlag(rest, 'tenant', 'tenantId')
  const organizationId = readFlag(rest, 'org', 'organizationId')
  if (!tenantId || !organizationId) {
    console.error(USAGE)
    return null
  }
  return { tenantId, organizationId }
}

const publishProduct: ModuleCli = {
  command: 'publish-product',
  async run(rest) {
    const scope = readScope(rest)
    const productId = readFlag(rest, 'product', 'productId')
    if (!scope || !productId) {
      console.error(USAGE)
      return
    }
    const container = await createRequestContainer()
    const em = (container.resolve('em') as EntityManager).fork()

    if (rest.includes('--direct')) {
      const github = new GitHubClient(readGitHubConfigFromEnv())
      const result = await publishProductPage({ em, github, appUrl: process.env.APP_URL ?? null }, scope, productId)
      console.log(`${result.reused ? 'Reused' : 'Opened'} ${result.prUrl} (${result.sku}, branch ${result.branch})`)
      return
    }

    const product = await em.findOne(CatalogProduct, { id: productId, ...scope, deletedAt: null })
    if (!product) {
      console.error(`Product ${productId} not found in org=${scope.organizationId}, tenant=${scope.tenantId}`)
      return
    }
    const commandBus = container.resolve('commandBus') as CommandBus
    const result = await startProductPublish(
      { em, commandBus, resolve: (name) => container.resolve(name) },
      scope,
      { id: product.id, sku: product.sku ?? null, title: product.title },
      { kind: 'manual', ref: 'cli' },
    )
    console.log(
      `${result.deduplicated ? 'Existing' : 'Started'} execution ${result.executionId} (process ${result.processDefinitionId}); the orchestrator worker runs it.`,
    )
  },
}

const ensureProcess: ModuleCli = {
  command: 'ensure-process',
  async run(rest) {
    const scope = readScope(rest)
    if (!scope) return
    const container = await createRequestContainer()
    const em = (container.resolve('em') as EntityManager).fork()
    const definition = await ensureFactoryProcessDefinition(em, scope)
    console.log(`Process definition ${definition.id} ("${definition.name}") ready for org=${scope.organizationId}`)
  },
}

const factoryCli: ModuleCli[] = [publishProduct, ensureProcess]

export default factoryCli
