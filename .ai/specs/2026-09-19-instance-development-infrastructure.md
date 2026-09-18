# Instance development: specification map

**Date**: 2026-09-19
**Status**: Draft documentation package; no implementation authorized

## Outcome and document boundaries

Software Factory is an installable module that lets an authorized human delegate a task to Open Mercato Developer, inspect the resulting PR diff and running preview inside Open Mercato, and approve deployment to that same instance. The initial installation is local, with a later single-VPS installation. The target is the hosting instance's configured source repository, not an arbitrary unrelated repository.

Decision D-037 accepts two linked specifications:

1. [Execution and verified candidates](2026-09-19-agent-execution-and-preview.md): isolated OpenCode work, budgets, human interaction, review, testing, PRs, and authenticated previews. Independently useful as a task-to-PR module without enabling deployment.
2. [Candidate approval and instance delivery](2026-09-19-instance-delivery-and-recovery.md): consume the verified candidate contract, approve, merge, drain, deploy the exact tested image, verify, roll back, and reconcile Git. Can be installed after the execution capability; does not implement an agent loop.

The [decision ledger](2026-09-19-instance-development-decisions.md) contains all 37 accepted product decisions. Technical defaults in the specifications are proposals derived from these decisions. Documentation does not authorize setup of accounts, paid inference, implementation, publication, or changes to an existing runtime.

## Existing specifications and compatibility deltas

Repository baseline: `f57341d`, root-level standalone application. Existing documents are Draft designs, not evidence that their runtime exists.

| Source | Reuse | Delta required by this package |
|---|---|---|
| [SPEC-001](../../docs/specs/SPEC-001-2026-09-18-agentic-software-factory.md) | Agent Orchestrator process, explicit delegation, grants, durable workflow | Replace GitHub-only review and no-auto-merge assumptions for the instance-development mode; permissioned author approval allowed; change isolation, resource retention, budgets, and delivery boundaries as specified. |
| [SPEC-002](../../docs/specs/SPEC-002-2026-09-18-tasks-module.md) | Staff tasks/projects/comments, delegation, fencing, task commands | In delivery-enabled mode, `done` means verified deployment, not manually marking an externally merged PR done. Review fixes remain attempts of the same task, not automatically delegated finding subtasks. |
| [SPEC-003](../../docs/specs/SPEC-003-2026-09-18-task-change-set.md) | Code change row, run timeline, evidence manifest and task drawer injection | Add an actual diff. Enforce task ACL on every preview request, including localhost. Replace 72-hour retained compute with 30-minute sleeping preview and seven-day terminal cleanup. Raw transcripts are not an ordinary task artifact. |
| [SPEC-004](../../docs/specs/SPEC-004-2026-09-18-demo-stal-zbiorniki.md) | None required | Its business-data/WordPress demo stays outside this scope. |

Do not silently change those documents or installed APIs. The new behavior is an explicit, administrator-enabled instance-development process version. Existing non-code processes remain unchanged. The configured spec location is `.ai/specs`; existing SPEC numbers are not reused.

## Evidence and interpretation

| Reference | Evidence level and use |
|---|---|
| Repository specs above, `.ai/agentic.config.json`, `docker-compose.yml` | Local source inspected. Config requires generate, typecheck, lint, DS check, tests, build. Compose defaults to OpenCode image tag 1.18.3; a tag is not an immutable digest. |
| [OpenCode server](https://opencode.ai/docs/server/) and [CLI](https://opencode.ai/docs/cli/) | Official moving documentation consulted 2026-09-19. Sessions, async prompts, messages, abort, events, export/import support the design. Version-matched conformance remains a release gate; export is not a filesystem checkpoint. |
| [GitHub merge API](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request) | Official API: `sha` compares PR head; the request exposes no expected-base parameter. Post-merge readback is mandatory. |
| [GitHub App permissions](https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps) | Official permission matrix places merge under Contents write. Repository scope alone does not prevent merge. |
| [GitHub installation tokens](https://docs.github.com/en/rest/apps/apps#create-an-installation-access-token-for-an-app) | Official API supports reducing repositories/permissions; tokens expire after one hour. Keep issuance and tokens outside untrusted execution. |
| [GitHub merge queue](https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue) | Official design tests combined queue revisions. Deferred: no native queue dependency in the initial single-instance executor; a repository requiring it needs an adapter and new candidate verification. |
| [OpenHands runtime](https://docs.openhands.dev/openhands/usage/architecture/runtime) | Comparable open-source architecture: external controller and per-run execution containers. Adopt separation and isolated resource allocation; do not adopt its additional harness, editor, or plugin system. Docker is not protection from every kernel exploit. |

## Delivery of this documentation

The two specifications define normative behavior, APIs, ownership, failure handling, phased acceptance, and technical qualification gates. Runtime conformance experiments and integration tests are specified, not executed. No paid inference or deployment was performed to produce these documents. Final readiness also requires explicit implementation authorization, per the repository's spec-delivery guide.

## Installed framework evidence (0.8.0)

Read-only inspection of installed `@open-mercato/core`, `enterprise` and `queue` 0.8.0 informed the bridge requirements. Paths below are package-relative source paths, not proposed application edits. They must be requalified after a framework upgrade.

| Package/source | Observation | Consequence |
|---|---|---|
| enterprise `src/modules/agent_orchestrator/commands/processes.ts:87-172`; API `processes/[id]/executions/route.ts:80-183` | DB idempotency claim precedes enqueue; direct command does not run HTTP feature/mutation guards or compare replay input. | Explicit bridge authority, payload hashes, start reconciliation. |
| enterprise `workers/process-execution-starter.ts:163-217`; core `workflows/lib/workflow-executor.ts:288-308` | Workflow creation precedes back-link to process; correlation key is not unique. | Reconcile correlation under exclusive ownership; ambiguous/multiple matches block. |
| core `src/modules/workflows/lib/owned-definition.ts:107-169`, `definition-grant.ts:163-210` | Owned workflow service provisions execution principal; no equivalent owned process upsert found. | Static reviewed grants and collision-safe app process-definition binding. |
| core `src/modules/workflows/lib/step-handler.ts:1329-1374` | Wait timeout parsed/logged without scheduling enforcement in handler. | Supervisor watchdog owns deadlines. |
| core `src/modules/workflows/lib/signal-handler.ts:97-196,219-323` | Signals require the current paused wait; merge payload and persist SIGNAL_RECEIVED; not a durable inbox. | Receipt-based application relay and event reconciliation, no raw runner-to-core callbacks. |
| queue `src/worker/runner.ts:48-95`, `src/strategies/async.ts:550-579` | Queue shutdown is not business-safe draining. | Explicit admission/fence/checkpoint contract. |

Local Docker metadata identified OpenCode 1.18.3 image digest `sha256:1ccc9d47dd46234dd6a4ad914662a226c96a21413c0d286e61bcc248745917f7`. This identifies the inspected local artifact; API/session conformance against its bytes was not exercised.

## Decision coverage

| Accepted decisions | Specification sections |
|---|---|
| D-001, D-003, D-023 | Execution: TLDR, ownership, installable module and external infrastructure |
| D-002, D-030 | Execution: local topology; delivery: local/VPS qualification |
| D-004, D-005, D-020, D-031 | Delivery: candidate/approval binding, Git consistency and exact-image activation |
| D-006, D-032, D-036 | Execution: deterministic sizing, protected dependencies, decomposition |
| D-007, D-015, D-021 | Delivery: drain, migrations/backup, rollback/revert and recovery block |
| D-008, D-024, D-026 | Execution: consent and isolation/preview; delivery: external protected policy |
| D-009, D-010, D-011, D-029 | Execution: OpenCode, wait/checkpoint/instruction state, orchestration bridge |
| D-012, D-014, D-033, D-034, D-035 | Execution: candidate/review/repair; delivery: stale-base handling |
| D-016, D-025, D-028 | Execution: separate run/preview capacity, sleeping/cleanup; delivery: pins |
| D-017, D-018, D-019, D-027 | Execution: attempt/daily accounting, continuation and manual resume |
| D-013, D-022 | Execution: GitHub broker and frozen profile; delivery: credential boundary |
| D-037 | Two linked documents, execution candidate contract consumed by delivery |

Proposed technical defaults, not additional interview decisions: approval validity 24 hours; drain deadline ten minutes; post-activation observation two minutes; audit retention 90 days; keep two verified releases and at least seven days of backup recovery coverage. Administrators configure these through protected policy. They must be checked against measured local capacity before activation.

## Draft verification

On 2026-09-19, independent architecture/scope and security reviews passed the corrected drafts with no open findings. Corrections covered exhausted-attempt continuation, incident-scoped manual forward recovery, pre-publication CI privileges, snapshot recipients/derivatives, and preview cookie isolation. The check was read-only and did not exercise application behavior.

Local document checks passed: all 37 decisions have coverage, both specifications preserve the required template sections, local links/reference files exist, and whitespace checks pass. Runtime tests, provider calls, image builds, merges, database operations and deployments were not run as part of drafting.
