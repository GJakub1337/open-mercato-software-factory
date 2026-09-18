import { randomUUID } from 'node:crypto'
import type { EntityManager } from '@mikro-orm/postgresql'
import {
  CatalogPriceKind,
  CatalogProduct,
  CatalogProductCategory,
  CatalogProductCategoryAssignment,
  CatalogProductPrice,
} from '@open-mercato/core/modules/catalog/data/entities'
import { rebuildCategoryHierarchyForOrganization } from '@open-mercato/core/modules/catalog/lib/categoryHierarchy'

/**
 * Catalog of Stal-Zbiorniki Sp. z o.o., the fictional steel-tank manufacturer the demo
 * runs on (SPEC-004). Data, not UI copy: product texts are Polish because the company is.
 *
 * `ZDP-5000` is wrong on purpose — its real capacity is 5200 l and its dimensions are
 * empty. That is the record the owner corrects live (SPEC-004 scene 2). The mobile tank
 * `ZWM-1500` is NOT seeded: the owner adds it live (scene 3).
 */

export type DemoSeedScope = { tenantId: string; organizationId: string }

type CategorySeed = { slug: string; name: string; description: string }

type ProductSeed = {
  handle: string
  sku: string
  title: string
  subtitle: string
  description: string
  categories: string[]
  netPricePln: number
  weightKg: number
  dimensionsMm: { width: number; height: number; depth: number } | null
  metadata: Record<string, unknown>
}

const VAT_RATE = 23

export const STAL_ZBIORNIKI_CATEGORIES: CategorySeed[] = [
  { slug: 'woda-pitna', name: 'Zbiorniki na wodę pitną', description: 'Zbiorniki ze stali nierdzewnej z atestem PZH.' },
  { slug: 'paliwa', name: 'Zbiorniki na paliwa i oleje', description: 'Zbiorniki dwupłaszczowe naziemne i podziemne.' },
  { slug: 'chemia', name: 'Zbiorniki na chemikalia', description: 'Zbiorniki ze stali kwasoodpornej.' },
  { slug: 'ppoz', name: 'Zbiorniki ppoż. i na wodę technologiczną', description: 'Zbiorniki przeciwpożarowe i procesowe.' },
  { slug: 'urzadzenia', name: 'Urządzenia technologiczne', description: 'Mieszalniki, reaktory, silosy.' },
  { slug: 'od-reki', name: 'Od ręki', description: 'Gotowe zbiorniki dostępne z magazynu.' },
]

export const STAL_ZBIORNIKI_PRODUCTS: ProductSeed[] = [
  {
    handle: 'zwp-2000',
    sku: 'ZWP-2000',
    title: 'Zbiornik na wodę pitną 2000 l',
    subtitle: 'Stal nierdzewna 1.4301, atest PZH',
    description:
      'Pionowy zbiornik na wodę pitną o pojemności 2000 l. Stal nierdzewna 1.4301 (AISI 304), atest PZH. Króćce przyłączeniowe DN50, właz rewizyjny DN400.',
    categories: ['woda-pitna', 'od-reki'],
    netPricePln: 14900,
    weightKg: 210,
    dimensionsMm: { width: 1200, height: 2100, depth: 1200 },
    metadata: { capacityLiters: 2000, material: '1.4301', orientation: 'vertical', certifications: ['PZH'], inStock: true },
  },
  {
    handle: 'zwp-5000',
    sku: 'ZWP-5000',
    title: 'Zbiornik na wodę pitną 5000 l',
    subtitle: 'Stal nierdzewna 1.4301, atest PZH',
    description:
      'Pionowy zbiornik na wodę pitną o pojemności 5000 l. Stal nierdzewna 1.4301 (AISI 304), atest PZH. Wykonanie na zamówienie, czas realizacji 4–6 tygodni.',
    categories: ['woda-pitna'],
    netPricePln: 27500,
    weightKg: 420,
    dimensionsMm: { width: 1800, height: 2400, depth: 1800 },
    metadata: { capacityLiters: 5000, material: '1.4301', orientation: 'vertical', certifications: ['PZH'], leadTimeWeeks: '4-6' },
  },
  {
    handle: 'zdp-5000',
    sku: 'ZDP-5000',
    title: 'Zbiornik dwupłaszczowy na olej napędowy 5000 l',
    subtitle: 'Naziemny, stal S235JR, dozór UDT',
    description:
      'Naziemny zbiornik dwupłaszczowy na olej napędowy o pojemności 5000 l. Stal S235JR, sonda szczelności przestrzeni międzypłaszczowej, podlega dozorowi UDT.',
    categories: ['paliwa', 'od-reki'],
    netPricePln: 18900,
    weightKg: 980,
    dimensionsMm: null,
    metadata: { capacityLiters: 5000, material: 'S235JR', orientation: 'horizontal', certifications: ['UDT'], inStock: true },
  },
  {
    handle: 'zdp-10000-pz',
    sku: 'ZDP-10000-PZ',
    title: 'Zbiornik dwupłaszczowy podziemny na olej opałowy 10 000 l',
    subtitle: 'Podziemny, izolacja epoksydowa, dozór UDT',
    description:
      'Podziemny zbiornik dwupłaszczowy na olej opałowy o pojemności 10 000 l. Stal S235JR, zewnętrzna izolacja epoksydowa, wskaźnik wycieku, podlega dozorowi UDT.',
    categories: ['paliwa'],
    netPricePln: 38400,
    weightKg: 1850,
    dimensionsMm: { width: 2000, height: 2000, depth: 3700 },
    metadata: { capacityLiters: 10000, material: 'S235JR', orientation: 'horizontal', certifications: ['UDT'], installation: 'underground' },
  },
  {
    handle: 'zch-3000',
    sku: 'ZCH-3000',
    title: 'Zbiornik na kwasy 3000 l',
    subtitle: 'Stal kwasoodporna 1.4571',
    description:
      'Pionowy zbiornik na kwasy i ługi o pojemności 3000 l. Stal kwasoodporna 1.4571 (AISI 316Ti), odpowietrzenie z filtrem, wanna wychwytowa w zestawie.',
    categories: ['chemia'],
    netPricePln: 31200,
    weightKg: 380,
    dimensionsMm: { width: 1500, height: 2200, depth: 1500 },
    metadata: { capacityLiters: 3000, material: '1.4571', orientation: 'vertical', certifications: [] },
  },
  {
    handle: 'zppoz-20',
    sku: 'ZPPOZ-20',
    title: 'Zbiornik przeciwpożarowy 20 m³',
    subtitle: 'Naziemny, stal ocynkowana, izolacja termiczna',
    description:
      'Naziemny zbiornik na wodę przeciwpożarową o pojemności 20 m³. Stal ocynkowana ogniowo, izolacja termiczna z płaszczem, podgrzewanie przeciwzamrożeniowe.',
    categories: ['ppoz', 'od-reki'],
    netPricePln: 64000,
    weightKg: 2600,
    dimensionsMm: { width: 2500, height: 4500, depth: 2500 },
    metadata: { capacityLiters: 20000, material: 'S235JR+Zn', orientation: 'vertical', certifications: ['CNBOP'], inStock: true },
  },
  {
    handle: 'mx-500',
    sku: 'MX-500',
    title: 'Mieszalnik procesowy 500 l',
    subtitle: 'Stal nierdzewna 1.4404, mieszadło ramowe',
    description:
      'Mieszalnik procesowy o pojemności roboczej 500 l. Stal nierdzewna 1.4404 (AISI 316L), mieszadło ramowe z motoreduktorem 1,5 kW, płaszcz grzewczy.',
    categories: ['urzadzenia'],
    netPricePln: 42800,
    weightKg: 320,
    dimensionsMm: { width: 900, height: 1900, depth: 900 },
    metadata: { capacityLiters: 500, material: '1.4404', certifications: [] },
  },
]

function money(value: number): string {
  return value.toFixed(4)
}

async function ensureCategories(em: EntityManager, scope: DemoSeedScope): Promise<Map<string, CatalogProductCategory>> {
  const map = new Map<string, CatalogProductCategory>()
  const now = new Date()
  for (const seed of STAL_ZBIORNIKI_CATEGORIES) {
    let record = await em.findOne(CatalogProductCategory, { ...scope, slug: seed.slug })
    if (!record) {
      record = em.create(CatalogProductCategory, {
        id: randomUUID(),
        ...scope,
        name: seed.name,
        slug: seed.slug,
        description: seed.description,
        parentId: null,
        rootId: null,
        treePath: null,
        depth: 0,
        ancestorIds: [],
        childIds: [],
        descendantIds: [],
        metadata: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      em.persist(record)
    }
    map.set(seed.slug, record)
  }
  await em.flush()
  await rebuildCategoryHierarchyForOrganization(em, scope.organizationId, scope.tenantId)
  return map
}

/**
 * Seeds the Stal-Zbiorniki catalog into one tenant/organization. Idempotent by product
 * handle: existing products are left untouched, so a corrected `ZDP-5000` stays corrected
 * across re-runs. Returns the number of products created.
 *
 * Writes through the entity manager, like core's own catalog example seeder, so seeding
 * emits no `catalog.product.created` and never wakes the factory.
 */
export async function seedStalZbiorniki(em: EntityManager, scope: DemoSeedScope): Promise<number> {
  const regularKind = await em.findOne(CatalogPriceKind, { tenantId: scope.tenantId, code: 'regular', deletedAt: null })
  if (!regularKind) {
    throw new Error('Missing catalog price kind "regular"; run `yarn mercato seed:defaults --module catalog` first.')
  }

  const existing = await em.find(CatalogProduct, {
    ...scope,
    handle: { $in: STAL_ZBIORNIKI_PRODUCTS.map((product) => product.handle) },
  })
  const existingHandles = new Set(existing.map((product) => product.handle))
  const missing = STAL_ZBIORNIKI_PRODUCTS.filter((product) => !existingHandles.has(product.handle))
  if (!missing.length) return 0

  const categories = await ensureCategories(em, scope)
  const now = new Date()

  for (const seed of missing) {
    const product = em.create(CatalogProduct, {
      id: randomUUID(),
      ...scope,
      title: seed.title,
      subtitle: seed.subtitle,
      description: seed.description,
      sku: seed.sku,
      handle: seed.handle,
      productType: 'simple',
      primaryCurrencyCode: 'PLN',
      defaultUnit: 'pc',
      weightValue: String(seed.weightKg),
      weightUnit: 'kg',
      dimensions: seed.dimensionsMm ? { ...seed.dimensionsMm, unit: 'mm' } : null,
      countryOfOriginCode: 'PL',
      metadata: seed.metadata,
      taxRate: String(VAT_RATE),
      isConfigurable: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    em.persist(product)

    seed.categories.forEach((slug, position) => {
      const category = categories.get(slug)
      if (!category) return
      em.persist(
        em.create(CatalogProductCategoryAssignment, {
          id: randomUUID(),
          ...scope,
          product,
          category,
          position,
          createdAt: now,
          updatedAt: now,
        }),
      )
    })

    em.persist(
      em.create(CatalogProductPrice, {
        id: randomUUID(),
        ...scope,
        product,
        priceKind: regularKind,
        currencyCode: 'PLN',
        kind: regularKind.code,
        minQuantity: 1,
        taxRate: String(VAT_RATE),
        unitPriceNet: money(seed.netPricePln),
        unitPriceGross: money(seed.netPricePln * (1 + VAT_RATE / 100)),
        createdAt: now,
        updatedAt: now,
      }),
    )
  }

  await em.flush()
  return missing.length
}
