import type { EntityManager } from '@mikro-orm/postgresql'
import { loadCatalogRecordView, type Scope } from './catalogRecord'
import { GitHubClient } from './github'
import { buildProductPageChange, REGISTRY_PATH, patchRegistry, type ProductPageChange } from './productPage'

export type PublishResult = {
  prNumber: number
  prUrl: string
  /** Short label for the process outcome, e.g. `PR #12 · ZWM-1500`. */
  prLabel: string
  branch: string
  sku: string
  pagePath: string
  /** True when an open PR for this product already existed and was reused. */
  reused: boolean
}

export function branchNameFor(change: Pick<ProductPageChange, 'dir'>): string {
  return `factory/produkt-${change.dir}`
}

function formatPln(value: number | null): string {
  return value === null ? 'cena na zapytanie' : `${new Intl.NumberFormat('pl-PL').format(value)} PLN netto`
}

export function pullRequestText(change: ProductPageChange, opts: { productId: string; appUrl?: string | null }) {
  const { product } = change
  const recordLink = opts.appUrl ? `[${opts.productId}](${opts.appUrl.replace(/\/$/, '')}/backend/catalog/products/${opts.productId})` : `\`${opts.productId}\``
  const title = `feat(produkty): ${product.sku} – ${product.title}`
  const body = [
    `Nowy produkt z katalogu Open Mercato: **${product.title}** (\`${product.sku}\`).`,
    '',
    `Rekord katalogu: ${recordLink}. Strona wygenerowana z rekordu, klasa zmiany \`content\` (tylko \`app/produkty/**\`).`,
    '',
    `- Strona: \`/produkty/${change.dir}/\``,
    `- Kategoria: \`${product.category}\``,
    `- Od ręki: ${product.inStock ? 'tak' : 'nie'}`,
    `- Pojemność: ${product.capacityLiters} l · materiał ${product.material}${product.certifications.length ? ` · atesty ${product.certifications.join(', ')}` : ''}`,
    `- Cena: ${formatPln(product.priceNetPln)}`,
    '',
    'Otwarte przez fabrykę Open Mercato (`factory.publish_product`). Wartości na stronie sprawdza check `site`.',
  ].join('\n')
  return { title, body }
}

/**
 * The effector for `factory.publish_product`: loads the product in tenant scope, renders its
 * page files and opens one PR against the site repo. Idempotent per product: an open PR for
 * the product's branch is reused rather than duplicated.
 */
export async function publishProductPage(
  deps: { em: EntityManager; github: GitHubClient; appUrl?: string | null },
  scope: Scope,
  productId: string,
): Promise<PublishResult> {
  const record = await loadCatalogRecordView(deps.em, scope, productId)
  if (!record) throw new Error(`Product ${productId} not found in organization ${scope.organizationId}`)

  const change = buildProductPageChange(record)
  const branch = branchNameFor(change)
  const pagePath = `/produkty/${change.dir}/`
  const label = (number: number) => `PR #${number} · ${change.sku}`

  const existing = await deps.github.findOpenPullRequest(branch)
  if (existing) {
    return { prNumber: existing.number, prUrl: existing.htmlUrl, prLabel: label(existing.number), branch, sku: change.sku, pagePath, reused: true }
  }

  const baseSha = await deps.github.getBranchSha(deps.github.baseBranch)
  if (!baseSha) throw new Error(`Base branch ${deps.github.baseBranch} not found in ${deps.github.repo}`)
  const registry = await deps.github.getFileText(REGISTRY_PATH, baseSha)
  const files = [...change.files, { path: REGISTRY_PATH, content: patchRegistry(registry, change.identifier, change.dir) }]

  const { title, body } = pullRequestText(change, { productId, appUrl: deps.appUrl })
  const commitSha = await deps.github.createCommit({ parentSha: baseSha, files, message: title })
  await deps.github.upsertBranch(branch, commitSha)
  const pr = await deps.github.createPullRequest({ title, body, head: branch })

  return { prNumber: pr.number, prUrl: pr.htmlUrl, prLabel: label(pr.number), branch, sku: change.sku, pagePath, reused: false }
}
