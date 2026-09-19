# factory

The software factory's first slice (SPEC-001, SPEC-004 scene 3, SPEC-005): a catalog product
created in the „Od ręki” category becomes a pull request with its product page in the website
repo.

```
catalog.product.created ─▶ subscribers/product-created.ts (is it in „Od ręki”?)
  └─▶ agent_orchestrator.processes.startExecution  (idempotency product:<id>, definition "Factory: publish product page")
        └─▶ workflow factory.publish_product: EXECUTE_FUNCTION factory.open_product_pr ─▶ outcome = PR
              └─▶ lib/publishProduct.ts: catalog record ─▶ product.ts + page.tsx + registry line ─▶ GitHub PR
```

- `lib/productPage.ts` is the pure mapping (the table in the site repo's AGENTS.md); tests live in `__tests__/`.
- The process definition declares only a `manual` trigger (SPEC-001): the subscriber filters and
  dedups, so a workflow-level event trigger would double-start.
- Env: `FACTORY_GITHUB_TOKEN` (contents + pull requests on the site repo), `FACTORY_SITE_REPO`
  (default `jtomaszewski/hackaton-stal-zbiorniki-landing`), `FACTORY_SITE_BASE_BRANCH` (default `main`).
- Rehearsal: `yarn mercato factory publish-product --product <id> --tenant <t> --org <o> --direct`
  opens the PR without the queue; without `--direct` it starts the process for the workers.
