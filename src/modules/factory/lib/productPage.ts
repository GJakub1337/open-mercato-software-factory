/**
 * Pure mapping from an Open Mercato catalog record to the website's product page
 * (`app/produkty/<sku>/product.ts` + `page.tsx` + one registry line), following the
 * mapping table in the site repo's AGENTS.md (SPEC-005 *Model danych*). No I/O here.
 */

export const SITE_CATEGORIES = ['woda-pitna', 'paliwa', 'chemia', 'ppoz', 'urzadzenia'] as const
export type SiteCategory = (typeof SITE_CATEGORIES)[number]
export const IN_STOCK_CATEGORY = 'od-reki'
export const REGISTRY_PATH = 'app/produkty/index.ts'

export type Shape = 'vertical' | 'horizontal' | 'underground' | 'mixer'

export type Dimensions = { width: number; height: number; depth: number }

/** What the mapper needs from the catalog: a flat, ORM-free view of one product. */
export type CatalogRecordView = {
  id: string
  sku: string | null
  title: string
  subtitle: string | null
  description: string | null
  /** Assigned category slugs in position order. */
  categorySlugs: string[]
  metadata: Record<string, unknown> | null
  dimensions: Record<string, unknown> | null
  weightValue: string | number | null
  weightUnit: string | null
  taxRate: string | number | null
  /** `unitPriceNet` of the `regular` PLN price, or null. */
  regularNetPricePln: string | number | null
}

/** Mirrors `Product` in the site repo's `lib/product.ts`. */
export type SiteProduct = {
  sku: string
  title: string
  subtitle?: string
  category: SiteCategory
  inStock: boolean
  capacityLiters: number
  material: string
  certifications: string[]
  dimensionsMm: Dimensions | null
  weightKg?: number
  priceNetPln: number | null
  vatRate: number
  shape: Shape
}

export type ProductPageChange = {
  sku: string
  dir: string
  identifier: string
  product: SiteProduct
  files: Array<{ path: string; content: string }>
}

/** A required value the mapping could not derive. The site's AGENTS.md says: do not guess, ask. */
export class ProductMappingError extends Error {
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(message)
    this.name = 'ProductMappingError'
  }
}

const CERTIFICATIONS = ['PZH', 'UDT', 'CNBOP'] as const
const MATERIAL_RE = /\b(1\.4\d{3}|S\d{3}[A-Z]{0,2}(?:\+Zn)?)\b/
const CAPACITY_RE = /(\d{1,3}(?:[ \u00a0]\d{3})+|\d+)(?:[,.](\d+))?\s*(l|m³|m3)(?![\p{L}\p{N}])/iu

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function parseCapacityLiters(...sources: Array<string | null | undefined>): number | null {
  for (const source of sources) {
    if (!source) continue
    const match = CAPACITY_RE.exec(source)
    if (!match) continue
    const whole = Number(match[1].replace(/[  ]/g, ''))
    const fraction = match[2] ? Number(`0.${match[2]}`) : 0
    const value = whole + fraction
    const unit = match[3].toLowerCase()
    return unit === 'l' ? value : Math.round(value * 1000)
  }
  return null
}

export function parseMaterial(...sources: Array<string | null | undefined>): string | null {
  for (const source of sources) {
    if (!source) continue
    const match = MATERIAL_RE.exec(source)
    if (match) return match[1]
  }
  return null
}

export function parseCertifications(...sources: Array<string | null | undefined>): string[] {
  const haystack = sources.filter(Boolean).join(' ')
  return CERTIFICATIONS.filter((cert) => new RegExp(`\\b${cert}\\b`).test(haystack))
}

function metadataCertifications(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const items = value.map(text).filter(Boolean)
    return items
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return null
}

function mapDimensions(raw: Record<string, unknown> | null): Dimensions | null {
  if (!raw) return null
  const unit = text(raw.unit).toLowerCase()
  if (unit && unit !== 'mm') return null
  const width = toNumber(raw.width)
  const height = toNumber(raw.height)
  const depth = toNumber(raw.depth)
  if (width === null || height === null || depth === null) return null
  return { width, height, depth }
}

function mapShape(metadata: Record<string, unknown>, category: SiteCategory): Shape {
  if (text(metadata.installation).toLowerCase() === 'underground') return 'underground'
  const orientation = text(metadata.orientation).toLowerCase()
  if (orientation === 'vertical' || orientation === 'horizontal' || orientation === 'underground' || orientation === 'mixer') {
    return orientation
  }
  if (category === 'urzadzenia') return 'mixer'
  return 'vertical'
}

export function mapCatalogRecordToSiteProduct(record: CatalogRecordView): SiteProduct {
  const sku = text(record.sku)
  if (!sku) throw new ProductMappingError('sku', 'Product has no SKU; the page directory is the SKU in lowercase.')
  const title = text(record.title)
  if (!title) throw new ProductMappingError('title', 'Product has no title.')
  const subtitle = text(record.subtitle) || undefined
  const description = text(record.description) || null
  const metadata = record.metadata && typeof record.metadata === 'object' ? record.metadata : {}

  const category = record.categorySlugs.find((slug): slug is SiteCategory =>
    (SITE_CATEGORIES as readonly string[]).includes(slug),
  )
  if (!category) {
    throw new ProductMappingError(
      'category',
      `No site category among assigned categories [${record.categorySlugs.join(', ')}]; expected one of ${SITE_CATEGORIES.join(', ')}.`,
    )
  }

  const capacityLiters = toNumber(metadata.capacityLiters) ?? parseCapacityLiters(title, subtitle, description)
  if (capacityLiters === null) {
    throw new ProductMappingError('capacityLiters', 'Capacity not in metadata and not found in title/subtitle/description.')
  }

  const material = text(metadata.material) || parseMaterial(subtitle, description, title)
  if (!material) {
    throw new ProductMappingError('material', 'Material not in metadata and no steel grade found in subtitle/description.')
  }

  const certifications = metadataCertifications(metadata.certifications) ?? parseCertifications(subtitle, description)
  const weightKg =
    record.weightUnit && record.weightUnit.toLowerCase() === 'kg' ? (toNumber(record.weightValue) ?? undefined) : undefined

  return {
    sku,
    title,
    ...(subtitle ? { subtitle } : {}),
    category,
    inStock: record.categorySlugs.includes(IN_STOCK_CATEGORY),
    capacityLiters,
    material,
    certifications,
    dimensionsMm: mapDimensions(record.dimensions),
    ...(weightKg !== undefined ? { weightKg } : {}),
    priceNetPln: toNumber(record.regularNetPricePln),
    vatRate: toNumber(record.taxRate) ?? 23,
    shape: mapShape(metadata, category),
  }
}

/** `zdp-10000-pz` → `zdp10000Pz`, the identifier style the registry already uses. */
export function productIdentifier(sku: string): string {
  const parts = sku.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  const joined = parts.map((part, index) => (index === 0 ? part : part[0].toUpperCase() + part.slice(1))).join('')
  return /^[0-9]/.test(joined) ? `p${joined}` : joined
}

export function productDir(sku: string): string {
  return sku.toLowerCase()
}

function quote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export function renderProductFile(product: SiteProduct): string {
  const lines = [
    `  sku: ${quote(product.sku)},`,
    `  title: ${quote(product.title)},`,
    ...(product.subtitle ? [`  subtitle: ${quote(product.subtitle)},`] : []),
    `  category: ${quote(product.category)},`,
    `  inStock: ${product.inStock},`,
    `  capacityLiters: ${product.capacityLiters},`,
    `  material: ${quote(product.material)},`,
    `  certifications: [${product.certifications.map(quote).join(', ')}],`,
    product.dimensionsMm
      ? `  dimensionsMm: { width: ${product.dimensionsMm.width}, height: ${product.dimensionsMm.height}, depth: ${product.dimensionsMm.depth} },`
      : '  dimensionsMm: null,',
    ...(product.weightKg !== undefined ? [`  weightKg: ${product.weightKg},`] : []),
    `  priceNetPln: ${product.priceNetPln === null ? 'null' : product.priceNetPln},`,
    `  vatRate: ${product.vatRate},`,
    `  shape: ${quote(product.shape)},`,
  ]
  return ["import type { Product } from '@/lib/product'", '', 'export const product = {', ...lines, '} satisfies Product', ''].join('\n')
}

function escapeJsxText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')
}

export function descriptionParagraphs(record: Pick<CatalogRecordView, 'title' | 'subtitle' | 'description'>): string[] {
  const description = text(record.description)
  const paragraphs = description
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  if (paragraphs.length) return paragraphs
  const subtitle = text(record.subtitle)
  return [subtitle ? `${text(record.title)}. ${subtitle}.` : `${text(record.title)}.`]
}

export function renderPageFile(paragraphs: string[]): string {
  return [
    "import { ProductPage, productMetadata } from '@/components/product-page'",
    "import { product } from './product'",
    '',
    'export const metadata = productMetadata(product)',
    '',
    'export default function Page() {',
    '  return (',
    '    <ProductPage product={product}>',
    ...paragraphs.map((paragraph) => `      <p>${escapeJsxText(paragraph)}</p>`),
    '    </ProductPage>',
    '  )',
    '}',
    '',
  ].join('\n')
}

/**
 * Adds one import and one array entry to `app/produkty/index.ts`. Idempotent: a product
 * already registered leaves the source untouched. Throws when the file no longer has the
 * anchors this patch relies on, so a refactored registry fails loudly instead of silently.
 */
export function patchRegistry(source: string, identifier: string, dir: string): string {
  const importLine = `import { product as ${identifier} } from './${dir}/product'`
  if (source.includes(importLine)) return source

  const lines = source.split('\n')
  const lastImport = lines.map((line, index) => (line.startsWith('import { product as ') ? index : -1)).filter((i) => i >= 0).pop()
  if (lastImport === undefined) throw new Error(`${REGISTRY_PATH}: no product imports found`)
  lines.splice(lastImport + 1, 0, importLine)

  const arrayStart = lines.findIndex((line) => line.startsWith('export const products: Product[] = ['))
  if (arrayStart < 0) throw new Error(`${REGISTRY_PATH}: products array not found`)
  const arrayEnd = lines.findIndex((line, index) => index > arrayStart && line.trim() === ']')
  if (arrayEnd < 0) throw new Error(`${REGISTRY_PATH}: products array is not closed`)
  lines.splice(arrayEnd, 0, `  ${identifier},`)

  return lines.join('\n')
}

export function buildProductPageChange(record: CatalogRecordView): ProductPageChange {
  const product = mapCatalogRecordToSiteProduct(record)
  const dir = productDir(product.sku)
  const identifier = productIdentifier(product.sku)
  return {
    sku: product.sku,
    dir,
    identifier,
    product,
    files: [
      { path: `app/produkty/${dir}/product.ts`, content: renderProductFile(product) },
      { path: `app/produkty/${dir}/page.tsx`, content: renderPageFile(descriptionParagraphs(record)) },
    ],
  }
}
