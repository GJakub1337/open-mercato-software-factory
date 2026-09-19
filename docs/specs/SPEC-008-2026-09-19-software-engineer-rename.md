# SPEC-008: Software Engineer: the delegatable agent gets a role name

**Status**: Draft
**Owner**: HackOn team · **Date**: 2026-09-19 · **Tracker**: —
**Parent**: [SPEC-002](./SPEC-002-2026-09-18-tasks-module.md), whose delegate picker, card badge
and drawer section render this name. [SPEC-009](./SPEC-009-2026-09-19-assignment-picker.md) turns
the single agent into a roster and depends on this rename only for its copy.

## TLDR

The one agent a person can hand a task to is provisioned as **`Factory`** — the machine's name,
not the job's. It becomes **Software Engineer** everywhere a human reads it: the delegate picker,
the card badge, the drawer, the two CLI outputs and the prose of SPEC-001 and SPEC-002.

Identifiers do not move. `FACTORY_AGENT_ID = 'factory'`, `factory.deliver`, `FACTORY_COLUMNS`, the
`factory/catalog-match` check and the product's own name stay exactly as they are; this is a
naming change where people read, not a refactor.

One catch decides the shape of the work: the agent's name is written **only when the principal is
created**, so no code change and no re-provision renames the agent in a database that already ran
the setup. That needs its own step.

## Problem Statement

- **The name describes the machine, not the job.** People assign work to a role they can reason
  about — "who is going to do this?". `Factory` answers with infrastructure: it sets no
  expectation of what comes back, and it reads oddly next to the human names in the same picker.
- **One word, three meanings.** "Factory" is the product (the agentic software factory), the
  module's internals (`factory.deliver`, `FACTORY_COLUMNS`) and the name of the only agent a
  person can pick. Only the third is wrong, and it is the one everybody sees.
- **The roster is about to grow.** SPEC-009 turns the single delegate into a list of roles. A list
  reading "Factory, Reviewer, Researcher" mixes a machine with two jobs; "Software Engineer,
  Reviewer, Researcher" reads like a team.

## User Stories

- **Product owner** opens the delegate picker on `WEB-12` and picks **Software Engineer**. The
  card badge, the drawer and the notification that follows all say the same thing.
- **Team lead** reads an audit entry for a delegated task and sees Software Engineer there too,
  because the name is the agent principal's own `auth.User.name` and not a label our UI paints on
  top of it.
- **Whoever runs the demo** on a database seeded before this change runs one CLI step, and the
  agent is renamed there as well — no reset, no re-seed, the same `userId` and delegation history.

## Proposed Solution

Three edits and one migration step:

1. The provisioned display name in `tasks/lib/demoSetup.ts` becomes `Software Engineer`, with
   `FACTORY_AGENT_ID` untouched, so every id, role, email and process binding stays valid.
2. The two CLI outputs and the one test fixture that spell the visible name follow it.
3. The prose in SPEC-001 and SPEC-002 says Software Engineer where it said factory agent.
4. A CLI step renames the agent principal in databases that already have one — see *Data Models*
   for why provisioning cannot do it.

The word stays where it names the product or an identifier. That line is drawn in *Design*, hit by
hit, so the next person does not have to re-derive it.

## Design

**In scope — what a human reads** (verified by `grep -rniI factory src scripts docs` on `b4c3e7d`):

| File:line | Today | Becomes | Kind |
|---|---|---|---|
| `src/modules/tasks/lib/demoSetup.ts:127` | `displayName: 'Factory'` | `'Software Engineer'` | seed data; the name in the picker, card and drawer |
| `src/modules/tasks/cli.ts:31` | `` `factory agent ${…}` `` | `` `Software Engineer agent ${…}` `` | CLI output |
| `src/modules/demo_fixtures/cli.ts:40` | `…, factory agent ${…}` | `…, Software Engineer agent ${…}` | CLI output |
| `src/modules/tasks/lib/__tests__/delegationService-degradation.test.ts:26` | `name: 'Factory'` | `name: 'Software Engineer'` | test fixture on the visible name |
| `docs/specs/SPEC-001…md:59,828,832,842` | "the factory agent" | "the Software Engineer" | spec prose |
| `docs/specs/SPEC-002…md:77,99,274` | `"Factory agent"` | `"Software Engineer"` | spec prose |

**Borderline — recommended to leave.** `tasks/i18n/en.json:29` and its three code fallbacks
(`commands/tasks.ts:179,203,275`) read "The factory orchestrator is unavailable." That "factory"
is the *product*, not the agent, and the product keeps its name. Changing it is a one-line call
either way; see *Open Questions*.

**Out of scope — identifiers and internals:** `FACTORY_AGENT_ID = 'factory'` and every
`agentDefinitionId: 'factory'` comparison (`demoSetup.ts:21,126`, `delegationService.ts:121`,
`commands/tasks.ts:202`, `start-factory.ts:31,46`), `factory.deliver` (`commands/tasks.ts:200`,
`start-factory.ts:50,53`), `FACTORY_COLUMNS` and `lib/factoryColumns.ts`, `FactoryTaskColumn` and
`ensureFactoryColumns` (`transitionPolicy.ts`, `commands/tasks.ts:70-92`), the subscriber id
`tasks:start-factory` with its tests, code comments, the CI status `factory/catalog-match`, and
the product's own name in the README and SPEC-001's title.

The agent's generated email (`agent+factory+<organizationId>@agent.internal`) is an identifier and
stays too — it is never shown in the board's surfaces.

## Data Models

No schema change, and exactly one stored value moves: the agent principal's `auth.User.name`,
encrypted at rest like every other user name.

It does not move by itself. `provisionAgentPrincipal` (enterprise `agent_orchestrator`) sets
`name: displayName ?? agentDefinitionId` **only on the branch that creates the user**; for an
existing principal it reconciles the role, the ACL and the user-role link and never touches the
name. So on any database that already ran `tasks setup` — including the demo — the agent stays
`Factory` until something updates that row explicitly. Hence step 4: an update through the auth
command with decryption, never raw SQL, addressed by the principal's `userId`.

## API Contracts

No contract changes shape. `GET /api/tasks/agents` keeps returning
`{ items: [{ userId, agentId, name }] }`; `agentId` stays `'factory'` and only the `name` value
differs. Consumers that match on the id — the `start-factory` subscriber, `task_tools`, the
orchestrator's process binding — are unaffected by design; anything that matched on the string
"Factory" was already reading a display value.

## Implementation Approach

Each step leaves the app working and ends with its own test.

**Phase 1: the rename**

1. `displayName: 'Software Engineer'` in `tasks/lib/demoSetup.ts`, `FACTORY_AGENT_ID` unchanged.
   *Test:* the `demoSetup` test asserts the new display name and the unchanged
   `agentDefinitionId`.
2. A CLI step that renames an existing agent principal: resolve the principal for
   `agentDefinitionId: 'factory'` in the scope, update its `auth.User.name` through the auth
   command, report when there is nothing to do. *Test:* run against a database seeded as
   `Factory` leaves one principal, renamed, with the same `userId`, role links and delegation
   rows; a second run is a no-op.
3. The two CLI output strings and the test fixture from *Design*. *Test:* `yarn test` green;
   `grep -rni "factory agent" src` returns nothing.
4. The prose in SPEC-001 and SPEC-002. *Test:* none (docs); the inventory above is the evidence.

Validation: `yarn generate && yarn typecheck && yarn lint && yarn ds:check && yarn test`. The
rename step is exercised against the demo database before the demo, not during it.

## Key Design Decisions

1. **The rename stops at what people read.** Renaming `factory.*` would touch the orchestrator's
   process binding, the seeded rows, the CI status and SPEC-001's contract for no visible gain,
   and every one of those is a place where a half-applied rename fails silently.
2. **The name lives on the principal, not as a label in our UI.** Audit entries, notifications,
   `staff` and the MCP tools all read `auth.User.name`; painting "Software Engineer" over
   `Factory` in our components only would make those surfaces disagree with the board.
   SPEC-009 adds a roster label for our own surfaces and keeps the two in sync deliberately.
3. **Existing databases get an explicit step.** Provisioning is create-only, so "just re-run
   setup" would look like it worked and change nothing — the step is small, and it is the
   difference between a renamed demo and a demo that still says Factory on stage.

## Open Questions

- **Does "The factory orchestrator is unavailable." change too?** It names the product, which
  keeps its name, so the recommendation is to leave it. Change it only if the goal is zero
  occurrences of the word on screen. Resolves before Phase 1 step 3 — it is one string plus three
  fallbacks.
- **Do we want the same rename upstream?** If the Open Mercato maintainers ever ship a default
  agent roster, the display name is theirs to pick. Worth one question at the event.

## Changelog

<!-- Record, not state: rows are closed once dated — append, never rewrite. -->

| Date | Change |
|------|--------|
| 2026-09-19 | Split out of the combined rename-plus-picker draft after a scope-cohesion review; this spec is the rename only, the picker is SPEC-009. |
