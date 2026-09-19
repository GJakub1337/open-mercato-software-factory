# SPEC-009: Assigned to: one picker for a person and an agent

**Status**: Draft
**Owner**: HackOn team · **Date**: 2026-09-19 · **Tracker**: —
**Parent**: [SPEC-002](./SPEC-002-2026-09-18-tasks-module.md), whose delegate command, delegation
table and injected widgets this spec builds on and partly replaces.
[SPEC-008](./SPEC-008-2026-09-19-software-engineer-rename.md) renames the agent this picker lists;
neither spec blocks the other.

## TLDR

Who owns a task is `staff`'s assignee `Select` in the drawer's Properties section; who does the
work is our "Agent delegate" section further down, with its own `Select` and its own button.
Handing a task to a colleague *and* to the Software Engineer is two interactions, two round trips
and two audit entries, and neither can be done from the card.

They become **one "Assigned to" picker**: a searchable popover with *People* and *Agents*,
opened by click or `A`, that takes a person, a person **and** an agent, or an agent alone, and
persists whatever it produced through one audited, undoable command. The human stays
accountable — picking an agent alone still records the picker's user as the assignee, and says so
before it happens rather than silently afterwards.

Which agents are pickable comes from an app-owned **roster**: a role, its copy, and the process
its delegation starts. v1 has one row (Software Engineer → `factory.deliver`), so nothing about
today's behaviour changes; the roster is how the second role arrives later.

## Problem Statement

- **Assignment is the act people repeat most, and it costs two of everything.** Two controls in
  two places in the drawer, two requests, two audit entries, two things to undo. In Linear the
  same act is one control, one keystroke, one list — and that is the bar for a board people are
  supposed to live in all day.
- **The card cannot assign at all.** Every assignment means opening the drawer, which is the
  slowest path on the busiest screen.
- **The rules are discovered by failing.** Delegation is allowed only from `backlog`, removal
  after the sizing decision is refused, and an actor without a staff member cannot delegate. The
  current UI offers the action and lets the server answer with a `409` or a `422`; the picker
  should show why something is not available before it is clicked.
- **The agent list is whatever happens to be provisioned.** `GET /api/tasks/agents` returns every
  enabled agent principal in the organization, while exactly one of them has a process behind it.
  Anything else in that list is an offer we cannot honour.

## User Stories

- **Product owner** opens `WEB-12`, presses `A`, types "an", and sees *People* (Ola Nowak, Anna
  Kot) and *Agents* (Software Engineer). They pick Ola **and** Software Engineer, confirm once,
  and the card moves to `Queued` with Ola's avatar and the agent badge showing the run state.
- **Product owner** picks only the Software Engineer. Before confirming, the picker states that
  they will be recorded as the accountable owner; after confirming their avatar is on the card
  next to the agent, exactly as the command has always behaved.
- **Team lead without `tasks.delegate`** opens the same picker and sees only *People*, with one
  line explaining that delegating needs the permission — the control never half-works.
- **Product owner** assigns straight from the board card without opening the drawer, and it is
  one command, one audit entry, one undo.
- **Anyone** opening a task whose run is live sees the *Agents* half read-only: the role, the run
  state, one sentence for why it is locked, and *Remove delegate* as the only way out. After the
  sizing decision, that sentence points at the Caseload instead.
- **Whoever adds the next role** provisions its principal, enables its process and adds one
  roster row with two i18n keys; the picker lists it the next time it loads.

## Proposed Solution

One component, one command, one roster:

- **`AssignedToPicker`** — a searchable popover with two sections, opened by click or `A`,
  navigable by arrows, applied with `Enter`, closed with `Esc`. Its value is the pair
  `{ assigneeStaffMemberId, agentUserId }`. A section the caller may not use is hidden rather
  than disabled.
- **`tasks.task.assign`** — one command behind `POST /api/tasks/assignments` that applies the
  human half through `staff`'s own task update and the agent half through the existing delegation
  path, under one optimistic-lock check, one audit entry and one undo. Either both halves land or
  neither does.
- **The roster** — `tasks/lib/agentRoster.ts`, the list of roles a person may delegate to and the
  process each one starts. It replaces "every provisioned principal" as the source of the
  *Agents* section.

Everything underneath stays: `tasks_delegation`, `tasks.task.delegated` /
`tasks.task.undelegated`, `tasks.view` / `tasks.delegate`, the transition guard and the existing
error codes. The old delegation endpoints remain for the MCP tools and scripts.

### Alternatives considered

- **Widen our sidebar section and leave `staff`'s field alone** — cheapest and needs nothing from
  the framework, but the drawer keeps two ways to set an owner and they drift apart.
- **Our own cross-project board** — full control of card, drawer and picker, but it forks the
  board `staff` maintains for us, and SPEC-002 parked it as "later" for good reasons.
- **Put the agent in the assignee slot** (Jira, Plane) — rejected with SPEC-002's reasoning: the
  accountable human disappears the moment the agent is assigned.

## Design

**Where it renders.** On the card through the published `staff.kanban_card` override (props
contract `staff.kanban_card.props.v1`), which the earlier board prototype already exercised; in
the drawer through the published `detail:staff:staff_time_task:header` injection spot.

**How `staff`'s own field gets out of the way.** `staff` 0.8.0 publishes ten overridable
components (`staff.kanban_card`, `staff.kanban_column`, `staff.project_card`,
`staff.time_entry_dialog`, `staff.timer_bar`, `staff.timesheet_grid|list|calendar`,
`staff.report_sheet`, `staff.entries_summary_footer`) and nine injection spots — and the drawer's
assignee `Select` is none of them. Until it is, our widget ships a scoped DOM rule that hides
that field, and an integration test asserts that exactly one assignment control is visible and
the hidden one is not focusable. That test is also the tripwire for an upstream markup change.

**The roster.** One row per delegatable role:

| Field | Meaning |
|---|---|
| `agentDefinitionId` | the provisioned principal's id — `'factory'` for v1 |
| `labelKey` | i18n key for the name the picker shows (`tasks.agents.softwareEngineer`) |
| `descriptionKey` | one line under the name ("Researches, plans and opens a PR") |
| `processName` | the process a delegation starts — `'factory.deliver'` for v1 |

`GET /api/tasks/agents` returns only roster entries that have both a provisioned, enabled
principal and an enabled process definition; an entry missing its process is reported through the
existing `orchestratorUnavailable` path instead of being offered. `subscribers/start-factory.ts`
stops hard-coding the pair: it looks the entry up by `payload.agentId` and starts that entry's
`processName`, returning early for an id outside the roster — which is today's behaviour for the
one row that exists.

**Two names, one truth.** Our surfaces render the roster's `labelKey`; every surface we do not own
— audit, `staff`, notifications, MCP — reads the principal's `auth.User.name`, which SPEC-008
renames. A new role is one roster row and two i18n keys, not a database change.

**States.** Loading (skeleton in both sections), empty search, no agents in the roster, no
`tasks.delegate` (no *Agents* section, one line of explanation), the confirm line "You will be
recorded as the accountable owner" when an agent is picked with no human, a live run (the
*Agents* half read-only with *Remove delegate*), the sizing decision taken (the same, pointing at
the Caseload), a stale version (`409`, offer to reload), and the orchestrator absent (the *Agents*
section empty with today's message, the *People* half still working).

**Keyboard and a11y.** `A` opens the picker, typing filters, `↑/↓` moves, `Enter` applies, `Esc`
closes; the trigger is a button whose accessible name is the current value; section headers are
real headings; the confirm line and every error are announced. Copy is localized under
`tasks.assign.*`; status colours come from the shared UI tokens.

## Data Models

No schema change. `tasks_delegation` (`task_id`, `delegate_user_id`, `assignee_user_id`,
`delegated_by`, `released_at`, `outcome`, `agent_id`) already carries everything the picker
reads, and the human assignee stays `staff`'s `assigneeStaffMemberId`. The roster is code, not
data, so a role cannot be half-created by an operator.

## API Contracts

| Surface | Shape |
|---|---|
| `POST /api/tasks/assignments` (new) | `{ taskId, assigneeStaffMemberId?: string \| null, agentUserId?: string \| null }` with the `If-Match` optimistic-lock header. `200 { taskId, assigneeStaffMemberId, delegation }`. Errors reuse today's codes: `403` (feature or project access), `409 invalid_transition` (`backlogOnly`, `alreadyDelegated`, `decisionPending`), `409` stale version, `422 assignee_required`, `422 invalid_agent`, `503 orchestrator_unavailable` |
| `GET /api/tasks/agents` | additive: `{ items: [{ userId, agentId, name, label, description }] }`, filtered to roster entries with a provisioned principal and an enabled process. `name` stays the principal's name; `label` is what our surfaces render |
| `GET /api/tasks/assignable-people` (new) | staff members assignable on the task's project, so the *People* section does not read a `staff` internal |
| `POST /api/tasks/delegations`, `DELETE /api/tasks/delegations/{taskId}` | unchanged, kept for the MCP tools and scripts |

Commands: `tasks.task.assign`, audited and undoable — undo restores the previous assignee and
un-delegates, reusing the `beforeUndo` guard that refuses after the sizing decision.

## Implementation Approach

Each step leaves the app working and ends with its own test.

**Phase 1: the roster and the command** (nothing visible changes yet)

1. `tasks/lib/agentRoster.ts` with the v1 row and its two i18n keys; `GET /api/tasks/agents`
   filtered to roster entries with a provisioned principal and an enabled process, returning
   `label` and `description` alongside today's fields. *Tests:* an unrostered principal is not
   returned; a roster entry whose process is disabled is not returned; the existing fields keep
   their shape.
2. `subscribers/start-factory.ts` resolves the roster entry by `payload.agentId` and starts its
   `processName`. *Tests:* the existing suite passes unchanged; an event with an unrostered
   `agentId` starts nothing.
3. `GET /api/tasks/assignable-people`, scoped and ACL-checked like the agents route. *Tests:*
   only the caller's project members; `403` without project access.
4. The `tasks.task.assign` command and `POST /api/tasks/assignments`. *Tests:* person only; agent
   only (the actor becomes assignee); both; a stale version returns `409`; a failing delegation
   rolls the assignee change back; undo restores the assignee and un-delegates; the ACL matrix.

**Phase 2: the picker**

5. `AssignedToPicker` with both sections, search, keyboard and every state from *Design*,
   including the read-only agent half. *Tests:* one per state; keyboard and screen-reader
   assertions; the locked state offers only *Remove delegate*.
6. The card, through the `staff.kanban_card` override, keeping avatar, agent chip and run badge.
   *Test:* the card is unchanged with the picker closed; assigning from it issues one command.
7. The drawer: the picker in `detail:staff:staff_time_task:header` plus the scoped rule that
   hides `staff`'s assignee field. *Test:* integration — exactly one assignment control is
   visible and the hidden field is not focusable.
8. Refresh on `tasks.task.delegated`, `tasks.task.undelegated` and
   `staff.timesheets.time_task.status_changed`, as today's widgets do. *Test:* integration —
   assigning in one tab moves the card in another.

Validation per phase: `yarn generate && yarn typecheck && yarn lint && yarn ds:check && yarn
test`; `yarn test:integration:ephemeral` after steps 7 and 8.

## Key Design Decisions

1. **The human keeps ownership.** Linear's split — the agent is a delegate, the assignee stays
   accountable — is what SPEC-002 already enforces; the picker makes the implicit assignment
   explicit *before* it happens instead of leaving it to be discovered in the audit log.
2. **One command, not two calls from the client.** "Assign" is one act to the person doing it, so
   it is one thing to audit, one thing to undo and one thing to fail atomically.
3. **The roster decides what is pickable, not the principal table.** A delegatable role is a role
   with a process behind it; keeping the pair in one file means a new role cannot be half-added.
4. **Today's rules stay, and become visible.** Delegation from `backlog` only, removal refused
   after the sizing decision: the picker renders them instead of letting the server answer.
5. **The drawer is taken over with the bluntest tool that works.** A scoped DOM rule plus a
   tripwire test, because the alternatives were shipping two assignment controls or waiting on a
   framework release. It is the one place this spec depends on `staff`'s internals, and it is
   fenced by a test.

## Open Questions

- **Will `staff` publish a seam for the drawer's assignee field?** Ask the Open Mercato
  maintainers, and offer the override upstream (`staff.task_assignee_field`, mirroring
  `staff.kanban_card`). When it lands, step 7's DOM rule is replaced and the tripwire test stays.
  Until then the rule ships.
- **Does anything else still write the assignee behind the picker?** The hidden field is hidden,
  not removed, and `staff`'s own API remains open. Confirm in Phase 2, step 7 whether any other
  installed surface renders the same form; if one does, decide then whether to guard the write or
  accept it as an alternative path.
- **When the roster gets its second role, does the picker need grouping?** Two or three roles fit
  a flat list; more than that wants sections or search-by-capability. Resolves when the second
  role is real, not before.

## Changelog

<!-- Record, not state: rows are closed once dated — append, never rewrite. -->

| Date | Change |
|------|--------|
| 2026-09-19 | Split out of the combined rename-plus-picker draft after a scope-cohesion review; this spec is the picker, the roster and the assign command, with the rename in SPEC-008. Decisions carried over: human keeps ownership, curated roster driving the process, today's mid-run rules kept, drawer taken over via the header injection spot plus a scoped DOM rule. |
