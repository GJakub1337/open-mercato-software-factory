import type { EntityManager } from '@mikro-orm/postgresql'
import type { CommandBus } from '@open-mercato/shared/lib/commands'
import { CatalogProduct } from '@open-mercato/core/modules/catalog/data/entities'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { loadCategorySlugs } from '../lib/catalogRecord'
import { startProductPublish } from '../lib/intake'
import { IN_STOCK_CATEGORY } from '../lib/productPage'

const logger = createLogger('factory').child({ subscriber: 'product-created' })

export const metadata = {
  event: 'catalog.product.created',
  persistent: true,
  id: 'factory:product-created',
}

type ProductCreatedPayload = { id?: string }

type SubscriberContext = {
  resolve: <T = unknown>(name: string) => T
  eventName?: string
  tenantId?: string | null
  organizationId?: string | null
}

/**
 * Scene 3 intake (SPEC-004): a product created in „Od ręki” starts `factory.publish_product`.
 * Fires after the create command committed, with the category assignments already synced.
 * Scope comes only from the event-bus options the emitter attached; a product outside
 * „Od ręki” is ignored. The seeder writes through the entity manager and never emits this event.
 */
export default async function handle(payload: ProductCreatedPayload, ctx: SubscriberContext): Promise<void> {
  const productId = typeof payload?.id === 'string' ? payload.id : null
  const tenantId = typeof ctx.tenantId === 'string' && ctx.tenantId ? ctx.tenantId : null
  const organizationId = typeof ctx.organizationId === 'string' && ctx.organizationId ? ctx.organizationId : null
  if (!productId || !tenantId || !organizationId) return
  const scope = { tenantId, organizationId }

  try {
    const em = (ctx.resolve('em') as EntityManager).fork()
    const slugs = await loadCategorySlugs(em, scope, productId)
    if (!slugs.includes(IN_STOCK_CATEGORY)) return

    const product = await em.findOne(CatalogProduct, { id: productId, ...scope, deletedAt: null })
    if (!product) return

    const commandBus = ctx.resolve('commandBus') as CommandBus
    const result = await startProductPublish(
      { em, commandBus, resolve: ctx.resolve },
      scope,
      { id: product.id, sku: product.sku ?? null, title: product.title },
      { kind: 'event', ref: metadata.event },
    )
    logger.info('factory intake started', { productId, sku: product.sku, ...result })
  } catch (error) {
    logger.error('factory intake failed', { productId, error: error instanceof Error ? error.message : String(error) })
  }
}
