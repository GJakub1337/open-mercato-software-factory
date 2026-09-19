# Hackathon: scene 3 intake (catalog → website PR)

Goal: `catalog.product.created` for a product in „Od ręki” starts a factory process that opens a PR
adding the product page to `jtomaszewski/hackaton-stal-zbiorniki-landing` (SPEC-004 scene 3, SPEC-005 mapping).
No `tasks` module exists yet, so the visible surface is Backend → Processes (ProcessInstance projection).

## Plan

- [x] Module `src/modules/factory` (index, README)
- [x] `lib/productPage.ts`: pure mapping catalog record → `product.ts`, `page.tsx`, registry patch (per landing AGENTS.md table)
- [x] `lib/catalogRecord.ts`: load product + categories + regular PLN price (tenant/org scoped)
- [x] `lib/github.ts`: minimal REST client (ref, contents, tree/commit, branch, PR; idempotent on existing PR)
- [x] `lib/publishProduct.ts`: orchestrates load → map → PR; returns `{ prUrl, prNumber, branch }`
- [x] `workflows.ts`: code workflow `factory.publish_product` (START → EXECUTE_FUNCTION → SET_VARIABLE outcome → END)
- [x] `di.ts`: register `workflowFunction:factory.open_product_pr` + descriptor
- [x] `lib/processDefinition.ts` + `setup.ts`: ensure ProcessDefinition (manual trigger only, per SPEC-001)
- [x] `subscribers/product-created.ts`: filter „od-reki”, `agent_orchestrator.processes.startExecution` with idempotency `product:<id>`
- [x] `cli.ts`: `factory publish-product --product <id> [--direct]` for rehearsal/debug
- [x] `.env.example`: `FACTORY_GITHUB_TOKEN`, `FACTORY_SITE_REPO`, `FACTORY_SITE_BASE_BRANCH`
- [x] Unit tests for mapping + registry patch
- [x] `yarn generate && yarn typecheck && yarn lint && yarn test`
- [x] E2E: seed catalog, create ZWM-1500 through the API, observe process + PR on GitHub, then close PR/delete branch
- [x] Update SPEC-004/SPEC-001 changelog rows; commit

## Review

- Verified end to end on the local tenant: product created through `POST /api/catalog/products` with
  categories `woda-pitna` + `od-reki` → subscriber log `factory intake started` → process instance →
  workflow COMPLETED → PR opened on `jtomaszewski/hackaton-stal-zbiorniki-landing` (three rehearsal
  PRs #2–#4, all closed, branches deleted) → Vercel preview rendered `/produkty/zwm-1500/` with
  `data-price-net="11900"`, `data-in-stock="true"`, listed on `/od-reki/`; `site` check passed.
- Process outcome shows `PR #4 · ZWM-1500` in Backend → Processes (outcome_type `factory:pull_request`).
- Engine findings (0.8.0): step-level async activities are fire-and-forget and their output stays on
  the step instance; transition-level async activities park and merge `<activityId>_result`;
  SET_VARIABLE persists only on transitions. The workflow is shaped accordingly.
- Not done: board card (`tasks` module), waiver/merge, `done` on merge, milestone projection
  (`milestones_reached` stays empty although the step declares `milestone: pr_open`).
