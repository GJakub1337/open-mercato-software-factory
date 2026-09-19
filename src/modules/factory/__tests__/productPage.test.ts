import { describe, expect, it } from '@jest/globals'
import {
  buildProductPageChange,
  mapCatalogRecordToSiteProduct,
  parseCapacityLiters,
  patchRegistry,
  productIdentifier,
  ProductMappingError,
  renderPageFile,
  renderProductFile,
  type CatalogRecordView,
} from '../lib/productPage'

function record(overrides: Partial<CatalogRecordView> = {}): CatalogRecordView {
  return {
    id: 'p-1',
    sku: 'ZWP-2000',
    title: 'Zbiornik na wodę pitną 2000 l',
    subtitle: 'Stal nierdzewna 1.4301, atest PZH',
    description:
      'Pionowy zbiornik na wodę pitną o pojemności 2000 l. Stal nierdzewna 1.4301 (AISI 304), atest PZH. Króćce przyłączeniowe DN50, właz rewizyjny DN400.',
    categorySlugs: ['woda-pitna', 'od-reki'],
    metadata: { capacityLiters: 2000, material: '1.4301', orientation: 'vertical', certifications: ['PZH'], inStock: true },
    dimensions: { width: 1200, height: 2100, depth: 1200, unit: 'mm' },
    weightValue: '210',
    weightUnit: 'kg',
    taxRate: '23',
    regularNetPricePln: '14900.0000',
    ...overrides,
  }
}

const REGISTRY = `import { product as zwp2000 } from './zwp-2000/product'
import { product as mx500 } from './mx-500/product'
import type { Product } from '@/lib/product'

/** Every product page, in display order. A new product page must be added here. */
export const products: Product[] = [
  zwp2000,
  mx500,
]
`

describe('mapCatalogRecordToSiteProduct', () => {
  it('renders the seeded ZWP-2000 exactly like the checked-in product.ts', () => {
    const product = mapCatalogRecordToSiteProduct(record())
    expect(renderProductFile(product)).toBe(`import type { Product } from '@/lib/product'

export const product = {
  sku: 'ZWP-2000',
  title: 'Zbiornik na wodę pitną 2000 l',
  subtitle: 'Stal nierdzewna 1.4301, atest PZH',
  category: 'woda-pitna',
  inStock: true,
  capacityLiters: 2000,
  material: '1.4301',
  certifications: ['PZH'],
  dimensionsMm: { width: 1200, height: 2100, depth: 1200 },
  weightKg: 210,
  priceNetPln: 14900,
  vatRate: 23,
  shape: 'vertical',
} satisfies Product
`)
  })

  it('derives capacity, material and certifications from title/subtitle when the UI created the product without metadata (ZWM-1500)', () => {
    const product = mapCatalogRecordToSiteProduct(
      record({
        sku: 'ZWM-1500',
        title: 'Zbiornik mobilny na wodę pitną 1500 l',
        subtitle: 'Stal nierdzewna 1.4301, atest PZH',
        description: null,
        metadata: null,
        dimensions: null,
        weightValue: null,
        weightUnit: null,
        regularNetPricePln: '11900.0000',
      }),
    )
    expect(product).toEqual({
      sku: 'ZWM-1500',
      title: 'Zbiornik mobilny na wodę pitną 1500 l',
      subtitle: 'Stal nierdzewna 1.4301, atest PZH',
      category: 'woda-pitna',
      inStock: true,
      capacityLiters: 1500,
      material: '1.4301',
      certifications: ['PZH'],
      dimensionsMm: null,
      priceNetPln: 11900,
      vatRate: 23,
      shape: 'vertical',
    })
  })

  it('maps underground installation, mixers and price on request', () => {
    const underground = mapCatalogRecordToSiteProduct(
      record({ categorySlugs: ['paliwa'], metadata: { capacityLiters: 10000, material: 'S235JR', orientation: 'horizontal', installation: 'underground' } }),
    )
    expect(underground.shape).toBe('underground')
    expect(underground.inStock).toBe(false)

    const mixer = mapCatalogRecordToSiteProduct(
      record({ sku: 'MX-500', title: 'Mieszalnik procesowy 500 l', subtitle: 'Stal nierdzewna 1.4404', description: null, categorySlugs: ['urzadzenia'], metadata: null, regularNetPricePln: null }),
    )
    expect(mixer.shape).toBe('mixer')
    expect(mixer.priceNetPln).toBeNull()
    expect(mixer.material).toBe('1.4404')
    expect(mixer.certifications).toEqual([])
  })

  it('accepts comma-separated certifications and ignores non-mm dimensions', () => {
    const product = mapCatalogRecordToSiteProduct(
      record({ metadata: { capacityLiters: 2000, material: '1.4301', certifications: 'PZH, UDT' }, dimensions: { width: 1, height: 2, depth: 1, unit: 'cm' } }),
    )
    expect(product.certifications).toEqual(['PZH', 'UDT'])
    expect(product.dimensionsMm).toBeNull()
  })

  it('refuses to guess a missing site category or capacity', () => {
    expect(() => mapCatalogRecordToSiteProduct(record({ categorySlugs: ['od-reki'] }))).toThrow(ProductMappingError)
    expect(() => mapCatalogRecordToSiteProduct(record({ title: 'Zbiornik', subtitle: null, description: null, metadata: null }))).toThrow(
      /Capacity/,
    )
  })
})

describe('parseCapacityLiters', () => {
  it('reads litres, thousands with spaces and cubic metres', () => {
    expect(parseCapacityLiters('Zbiornik mobilny na wodę pitną 1500 l')).toBe(1500)
    expect(parseCapacityLiters('Zbiornik dwupłaszczowy podziemny na olej opałowy 10 000 l')).toBe(10000)
    expect(parseCapacityLiters('Zbiornik przeciwpożarowy 20 m³')).toBe(20000)
    expect(parseCapacityLiters('Zbiornik 2,5 m3')).toBe(2500)
    expect(parseCapacityLiters(null, 'Stal 1.4301')).toBeNull()
  })
})

describe('productIdentifier', () => {
  it('matches the registry naming', () => {
    expect(productIdentifier('ZDP-10000-PZ')).toBe('zdp10000Pz')
    expect(productIdentifier('ZWM-1500')).toBe('zwm1500')
    expect(productIdentifier('1-X')).toBe('p1X')
  })
})

describe('patchRegistry', () => {
  it('adds one import and one array entry, idempotently', () => {
    const patched = patchRegistry(REGISTRY, 'zwm1500', 'zwm-1500')
    expect(patched).toBe(`import { product as zwp2000 } from './zwp-2000/product'
import { product as mx500 } from './mx-500/product'
import { product as zwm1500 } from './zwm-1500/product'
import type { Product } from '@/lib/product'

/** Every product page, in display order. A new product page must be added here. */
export const products: Product[] = [
  zwp2000,
  mx500,
  zwm1500,
]
`)
    expect(patchRegistry(patched, 'zwm1500', 'zwm-1500')).toBe(patched)
  })

  it('fails loudly when the registry lost its anchors', () => {
    expect(() => patchRegistry('export const nothing = []\n', 'x', 'x')).toThrow(/no product imports/)
  })
})

describe('buildProductPageChange', () => {
  it('produces the page files and escapes JSX-sensitive characters in the description', () => {
    const change = buildProductPageChange(record({ description: 'Pierwszy akapit {x} < 5.\n\nDrugi & trzeci.' }))
    expect(change.dir).toBe('zwp-2000')
    expect(change.files.map((file) => file.path)).toEqual(['app/produkty/zwp-2000/product.ts', 'app/produkty/zwp-2000/page.tsx'])
    expect(change.files[1].content).toBe(
      renderPageFile(['Pierwszy akapit {x} < 5.', 'Drugi & trzeci.']),
    )
    expect(change.files[1].content).toContain('<p>Pierwszy akapit &#123;x&#125; &lt; 5.</p>')
    expect(change.files[1].content).toContain('<p>Drugi &amp; trzeci.</p>')
  })

  it('falls back to title and subtitle when there is no description', () => {
    const change = buildProductPageChange(record({ description: null }))
    expect(change.files[1].content).toContain('<p>Zbiornik na wodę pitną 2000 l. Stal nierdzewna 1.4301, atest PZH.</p>')
  })
})
