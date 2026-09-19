import type { EntityManager } from '@mikro-orm/postgresql'
import {
  CatalogProduct,
  CatalogProductCategoryAssignment,
  CatalogProductPrice,
} from '@open-mercato/core/modules/catalog/data/entities'
import type { CatalogRecordView } from './productPage'

export type Scope = { tenantId: string; organizationId: string }

/** Category slugs assigned to a product, in position order. Scoped; an unknown product yields []. */
export async function loadCategorySlugs(em: EntityManager, scope: Scope, productId: string): Promise<string[]> {
  const assignments = await em.find(
    CatalogProductCategoryAssignment,
    { product: productId, tenantId: scope.tenantId, organizationId: scope.organizationId },
    { populate: ['category'], orderBy: { position: 'asc' } },
  )
  return assignments.map((assignment) => assignment.category?.slug).filter((slug): slug is string => typeof slug === 'string')
}

/** The ORM-free view the page mapper works on. Null when the product is not in scope. */
export async function loadCatalogRecordView(em: EntityManager, scope: Scope, productId: string): Promise<CatalogRecordView | null> {
  const product = await em.findOne(CatalogProduct, {
    id: productId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    deletedAt: null,
  })
  if (!product) return null

  const [categorySlugs, prices] = await Promise.all([
    loadCategorySlugs(em, scope, productId),
    em.find(
      CatalogProductPrice,
      { product: productId, tenantId: scope.tenantId, organizationId: scope.organizationId, currencyCode: 'PLN' },
      { orderBy: { minQuantity: 'asc' } },
    ),
  ])
  const regular = prices.find((price) => price.kind === 'regular') ?? null

  return {
    id: product.id,
    sku: product.sku ?? null,
    title: product.title,
    subtitle: product.subtitle ?? null,
    description: product.description ?? null,
    categorySlugs,
    metadata: (product.metadata as Record<string, unknown> | null) ?? null,
    dimensions: (product.dimensions as Record<string, unknown> | null) ?? null,
    weightValue: product.weightValue ?? null,
    weightUnit: product.weightUnit ?? null,
    taxRate: product.taxRate ?? null,
    regularNetPricePln: regular?.unitPriceNet ?? null,
  }
}
