# SPEC-002: Tasks module: board, projects and agent delegation

**Status**: Draft
**Owner**: HackOn team · **Date**: 2026-09-18 · **Tracker**: —
**Parent**: [SPEC-001](./SPEC-001-2026-09-18-agentic-software-factory.md), which consumes this
module's `tasks.task.delegated` event and its three workflow-safe commands.

## TLDR

`tasks` is where work enters the factory and where people watch it happen. A task has a human
**assignee**, who is accountable for it, and may get an agent **delegate**, who does the work.
Setting the delegate emits `tasks.task.delegated`, and that event is SPEC-001's only start path.
After that, the factory's process owns the task's status. The card shows the linked run's live
state, the PR and the pending decision, and people discuss the task in plain comments.
Tasks belong to a **project** that gives them a frozen reference (`WEB-12`), so "Fixes WEB-12"
in a PR is unambiguous.

The MVP is **manual only**: a person creates the task and a person delegates it. Webhooks
(Sentry, GitHub), MCP intake and domain-event intake come later; the schema already has room
for them. The MVP deliberately isn't a project-management tool: it has no cycles, roadmap,
estimates, labels, relations or custom statuses.

## Problem Statement

SPEC-001 needs one event and three commands from `tasks`. People need more than that:

- **Ownership.** When an agent works a task, someone must still answer for it. With a single
  assignee slot that holds either a human or an agent, the owner disappears the moment the
  agent is assigned.
- **Liveness.** After delegation, the card has to show within seconds that something picked
  the task up. Otherwise people delegate twice or assume it's broken. Linear enforces a
  10-second acknowledgement from agents for this reason.
- **Traceability.** A PR, a Caseload decision and a run must all point back to one task by a
  name that humans can type.
- **Discussion.** The Caseload holds decisions. Context for the task ("the customer meant the
  EU site") needs a place on the task itself.

## User Stories

- **Product owner** creates a task in project `WEB` with a title and body. It becomes
  `WEB-12`, assigned to them, in `open`. They set the delegate to "Factory agent", and within
  a second the card reads `queued`, then shows the pending Caseload decision. They remain the
  assignee throughout. A user without `tasks.delegate` sees the delegate picker disabled, with
  the reason.
- **Engineer** opens `WEB-12` from a PR titled "Fixes WEB-12". The drawer shows the status
  timeline, the run link, the PR, the Caseload item, the parent task and the comments.
- **Team lead** opens the board. Columns are statuses; filters are project, assignee, "has
  delegate" and priority. Each card shows the reference, priority, assignee avatar, a delegate
  badge with the live run state, and the PR link.
- **Product owner** removes the delegate before the sizer decides. The run is cancelled and
  the task goes back to `open`. Removing it after the sizer has decided is refused: the card
  points to the Caseload, where the decision now sits. When a run fails, the task shows
  `failed` with the reason, and the owner can reopen it and delegate again.
- **Product owner** sees the PR merge in GitHub and closes the `in_review` task as `done`.
  The MVP has no merge hook, so the assignee is allowed to make this one move while the task
  is still delegated.
- **Reviewer agent** (SPEC-001) produces findings. They appear as child tasks with the same
  assignee and no delegate, and wait there until a human delegates them.

Empty board: one project-less state with a "Create project" call to action. Once a project
exists: an empty column set with "New task".

## Proposed Solution

### What the prior art settled

Researched 2026-09-18. Every source below was opened, and the quotes are verbatim; the full
record is in `.context/prior-art/`. The question that sorts the evidence is whether the tracker
runs the agent or only shows an agent that runs elsewhere. Ours only shows it, because
SPEC-001's orchestrator runs it. That makes **Linear** the comparable system. Jira + Rovo,
Plane and It's a Plan run their own agents and serve as contrasts.

- **Assignee plus delegate.** Linear: assigning an issue to an agent "sets it as the
  `delegate`, not the `assignee`—so humans maintain ownership while agents act on their
  behalf." Jira ("An agent shows up as an assignee"), Plane and It's a Plan put the agent in
  the assignee slot, for familiarity. We take Linear's split, because SPEC-001's identity model
  already separates the initiator from the actor.
- **Fixed meanings, named statuses.** Linear keeps statuses within fixed categories ("the
  categories themselves stay in a fixed order"). Plane: "The group is the meaning Plane
  attaches to the state; the name is your label for it." We fix both the set and the meaning
  for the MVP, because the process writes them, and we map each status to a category so labels
  can open up later.
- **Sessions vs derived state.** Linear models agent work as sessions with six states and
  typed activities. We already have the orchestrator's instance, Caseload and traces, so the
  card derives its state from those instead of storing a second copy.
- **PR linking by key.** It's a Plan: "'Fixes KEY-42' links the pull request to the issue".
  This is why projects exist in the MVP.

### Not built on the core `staff` board

`@open-mercato/core` 0.8.0 ships a Kanban task board in the `staff` time-tracking suite. We
don't extend it. Its tasks must belong to a time project, its assignee is a staff member
(`assigneeStaffMemberId`) rather than a user or agent principal, and its statuses are
user-editable per project, whereas the factory writes statuses by slug. Its UI is reachable only
through the package's `./*` wildcard export, which isn't a stable API. We copy three things
it has already solved: race-safe reference allocation (`lib/timesheets-tasks/taskReference.ts`:
unique index plus retry, gaps never reclaimed), gap-based card positions
(`statusPositions.ts`), and the card and drawer extension-point layout.

### The module

`apps/mercato/src/modules/tasks`, an ordinary app module. It has three entities (project,
task, comment), one board page with a task drawer, one project settings page, commands,
events, ACL features, read-only AI tools, and the workflow-safe commands SPEC-001 calls.

**Delegation** is the whole trigger contract:

1. Delegating requires `tasks.delegate` and a task in `open`. The server checks that the
   delegate is a `kind='agent'` user and the assignee a human. If the task has no assignee,
   the delegating user becomes the assignee in the same command, so a delegated task
   always has an owner. If the `factory.deliver` process definition is missing or disabled,
   delegation is refused with `503 orchestrator_unavailable`, so no task can wait for a run
   that will never start.
2. The command sets `delegate_user_id` (the agent principal's `auth.User` id),
   `delegated_by`, a fresh `delegation_id`, and the status `queued`. It then emits
   `tasks.task.delegated` after commit.
3. SPEC-001's `start-factory` subscriber starts `factory.deliver` with the idempotency key
   `task:{taskId}:{delegationId}`, passing `delegationId` in the instance input. The process
   calls `tasks.task.link` with the instance. SPEC-001's first `set_status → queued` is a
   no-op, because a transition to the current status is accepted and changes nothing.
4. **Un-delegating** is allowed until the linked instance reaches SPEC-001's `sized`
   milestone. Before an instance is linked, it is always allowed. It clears the delegate,
   emits `tasks.task.undelegated` (SPEC-001 cancels the instance), and returns the task to
   `open`. After `sized`, it is refused with `409 decision_pending`, and the response
   carries the instance link, because the decision now sits in the Caseload.
5. **Stale writes are dropped.** Every workflow-safe command carries the `delegationId` from
   the instance input. A write whose `delegationId` no longer matches the task (the task was
   un-delegated, or re-delegated since) is a logged no-op. A cancelled run therefore cannot
   move a task someone has since taken back.
6. **The delegate is released at the end.** When the task reaches `done`, `rejected` or
   `failed`, by the process or by a person, `delegate_user_id` is cleared in the same command.
   The delegation stays in the audit log and in `delegation_id`/`delegated_by` until the next
   delegation. A released task is an ordinary task again: a person can reopen a `failed` task
   to `open` and delegate it again, which gives it a new `delegation_id` and therefore a new
   run.
7. **Safety net.** A subscriber on `workflows.instance.failed` and
   `workflows.instance.cancelled` (for the instance linked to a still-delegated task, with a
   matching `delegationId`) sets `failed` with the instance's error as `close_reason`. A crash
   or a cancel from the orchestrator's UI therefore cannot leave a task stuck in `started`.

**Who writes status.** A person changes status through `tasks.task.change_status`; the process
uses `tasks.task.set_status`. Both go through one transition validator. `tasks.task.move` only
reorders within a column.

| From → To | Process (`set_status`) | Person, no delegate | Person, delegate set |
|---|---|---|---|
| `open` → `queued` | — | — (only via delegate) | — |
| `queued` → `open` | — | — | only via un-delegate |
| `queued` → `in_design` / `in_progress` / `rejected` | ✓ | ✓ | — |
| `in_design` → `in_progress` / `rejected` | ✓ | ✓ | — |
| `in_progress` → `in_review` / `failed` / `rejected` | ✓ | ✓ | — |
| `in_review` → `done` / `rejected` / `failed` / `in_progress` (fix round) | ✓ | ✓ | `done` and `rejected` only, by the assignee |
| any started → `failed` | ✓ | — | — |
| `open` → `in_progress` / `done` / `rejected` | — | ✓ (human work) | — |
| `done` / `rejected` / `failed` → `open` | — | ✓ (reopen) | n/a (released) |
| X → X | no-op | no-op | no-op |

Anything else returns `409 invalid_transition`. A person's move on a delegated card returns
`409 process_owned`, and board drag is disabled on those cards, except the assignee closing an
`in_review` task. That exception exists because the MVP has no PR-merged hook: the assignee
sees the merge in GitHub and closes the task, which releases the delegate. `rejected` and
`failed` require a `close_reason`. The workflow-safe commands can't be undone by people, since
undo would bypass the process guard. Only principals holding `tasks.process` can undo them.

**The run state on the card** is derived at read time by a response enricher. For the
delegated tasks on a page, it loads the linked instances and their pending proposals and user
tasks in **one batched lookup** through the orchestrator's API or DI service. It never uses an
ORM relation across modules.

| Derived state | When |
|---|---|
| `starting` | delegate set, no instance linked yet |
| `stalled` | `starting` for more than 60 s: the start subscriber or `startExecution` failed; the card offers un-delegate |
| `running` | instance running with nothing pending on a human |
| `awaiting_decision` | the instance has a pending proposal or user task (the Caseload) |
| `failed` | instance failed or cancelled, or task `failed` |
| `complete` | instance completed |

The card refreshes on these client-broadcast events: `tasks.task.status_changed`,
`workflows.instance.{started,completed,failed,cancelled}` and
`agent_orchestrator.proposal.{created,disposed}`. If the orchestrator is absent or the lookup
fails, the badge falls back to the task status alone, and the board still renders.

**Follow-ups** (`tasks.task.create_followup`) create a child task in the parent's project.
The child inherits the parent's assignee and gets no delegate. Delegation is the only trigger,
so the factory can't feed itself: SPEC-001's rule still holds, without leaving follow-ups
ownerless.

**Comments** are plain text from people with `tasks.manage`. There are no @mentions and no
agent authors. Agents write to the task through links and follow-ups only. Comments reach
agents through `tasks_get`, so, like the body, they are **untrusted prompt input**.

**Concurrent edits.** Process writes bump `updated_at`. A person editing in the open drawer
while the process moves the task gets the standard 409 and a reload prompt; nothing is merged
silently.

### Out of scope (MVP), with the seam left for each

| Later | Seam already in place |
|---|---|
| Sentry and GitHub webhook intake, MCP `tasks_create` / `factory_send_task`, domain-event intake | `source` + `source_ref` with a unique index; one `create` command every intake calls |
| PR-merged hook setting `done` | the assignee closes `in_review` by hand; the hook will call `set_status` |
| @mention an agent in a comment to trigger it | the comment entity; the delegate command is the only trigger |
| Custom status labels per project | status→category map in code |
| Labels, relations (blocks, duplicate), estimates, cycles, roadmap | none; deliberately |
| Cost per task on the card | `process_instance_id`; traces are queried per instance |

## Design

- **Board** (`/backend/tasks`): project switcher, a filter bar (assignee, has delegate,
  priority), and one column per status in lifecycle order. `rejected` and `failed` are
  collapsed into one "Closed" column with a toggle. A card shows the reference, title,
  priority icon, assignee avatar, delegate badge (agent icon plus derived run state) and a PR
  chip. Keyboard: arrows move focus, Enter opens the card, and `D` opens the delegate picker.
  Uses shared UI tokens, with status colours from tokens rather than hard-coded values.
- **Drawer**: title and body (editable while `open`), a sidebar with project, assignee,
  delegate, priority, parent and created-by, then a links list, the status timeline (from the
  audit log) and comments. Extension spots mirror the staff board's layout: header, sidebar,
  tabs and footer, plus card badges and card footer.
- **New task dialog**: `CrudForm` with project, title, body, priority and an optional assignee
  (defaulting to the current user or the project default).
- **Projects** (`/backend/tasks/projects`): `DataTable` plus `CrudForm` for key, name,
  default assignee and repo URL (display only; the credential bundle is SPEC-001's `factory`
  module). The key is immutable once tasks exist.
- States covered: loading (skeleton columns), empty, error (retry), a 409 conflict on a stale
  `updated_at` (reload prompt), and orchestrator-absent (plain status badge).

## Data Models

All tables are tenant- and organization-scoped, with standard `created_at`, `updated_at` and
`deleted_at` columns. `updated_at` is used for optimistic locking on editable records.

`tasks_project`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `key` | text | `^[A-Z][A-Z0-9]{1,9}$`, unique per org over all rows, deleted ones included, so references never repeat; immutable once a task exists; this is SPEC-001's `projectKey`. A project with tasks cannot be deleted |
| `name` | text | |
| `default_assignee_user_id` | uuid, nullable | used by later intake; the MVP uses it as the dialog default |
| `repo_url` | text, nullable | display only |

`tasks_task`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `project_id` | uuid | |
| `sequence_number` | int | unique per (org, project) among live rows; allocated as in staff `taskReference.ts` |
| `reference` | text | `{key}-{n}`, frozen at creation, unique per org over all rows |
| `title`, `body` | text | the body is untrusted input to prompts |
| `priority` | enum | `none \| low \| medium \| high \| urgent`, default `none` |
| `status` | enum | `open \| queued \| in_design \| in_progress \| in_review \| done \| rejected \| failed` |
| `close_reason` | text, nullable | required for `rejected` and `failed` |
| `assignee_user_id` | uuid, nullable | a human `auth.User`, accountable |
| `delegate_user_id` | uuid, nullable | an agent principal's `auth.User` (`kind='agent'`) |
| `delegation_id` | uuid, nullable | new per delegation; part of the idempotency key; stale-write guard for workflow-safe commands |
| `delegated_by` | uuid, nullable | the initiator; SPEC-001's `triggeredBy` |
| `parent_id` | uuid, nullable | follow-ups |
| `source` | enum | `manual \| followup` in the MVP; `sentry \| github \| mcp \| event` later |
| `source_ref` | text, nullable | unique per org with `source` among live rows; null in the MVP |
| `process_instance_id` | uuid, nullable | set by `tasks.task.link` |
| `links` | jsonb | `[{ kind: 'pr' \| 'caseload' \| 'artifact' \| 'instance', ref, url, addedAt }]` |
| `position` | int | gap grid within a status column |
| `created_by` | uuid | |

Indexes: `(org, project_id, status, position)` for the board, `(org, assignee_user_id)`,
`(org, delegate_user_id)` and `(org, parent_id)`.

`tasks_comment`: `id`, `task_id`, `body`, `author_user_id`, with index
`(org, task_id, created_at)`.

This replaces SPEC-001's `assignee_kind`, `assignee_id`, `assignment_id`, `assigned_by`
and free-text `project_key`.

## API Contracts

ACL features: `tasks.view`, `tasks.manage` (create, edit, comment, human status moves),
`tasks.delegate`, `tasks.projects.manage`, and `tasks.process`. `tasks.process` is held only
by the workflow's execution principal (SPEC-001 *Starting and seeding*).

Routes (`makeCrudRoute`, per-method `metadata` and `openApi`):

- `GET|POST|PUT|DELETE /api/tasks/projects`
- `GET|POST|PUT|DELETE /api/tasks/tasks`: list filters `projectId`, `status[]`,
  `assigneeUserId`, `hasDelegate`, `priority[]`, `parentId`. The response is enriched with
  `runState` and `reference`. Delete is allowed only while the task is `open` with no
  delegate.
- `PATCH /api/tasks/tasks/{id}/status { status, reason?, updatedAt }` runs
  `tasks.task.change_status` and returns `409 invalid_transition` or `409 process_owned` per the
  matrix.
- `POST /api/tasks/tasks/{id}/delegate { agentUserId, updatedAt }` → `422` when the target is
  not an agent, `503 orchestrator_unavailable` when `factory.deliver` is missing or disabled.
  `DELETE /api/tasks/tasks/{id}/delegate { updatedAt }` → `409 decision_pending` after
  `sized`.
- `GET|POST /api/tasks/tasks/{id}/comments`; `DELETE` by the author only.
- `GET /api/tasks/agents`: agent principals the caller may delegate to, for the picker.

Commands are undoable, audited, and carry the acting principal: `tasks.project.{create,update,delete}`,
`tasks.task.{create,update,delete,move,change_status}`, `tasks.task.{delegate,undelegate}`,
`tasks.comment.{create,delete}`. `move` only reorders. Undoing a delegation is un-delegation,
with the same guard.

Workflow-safe commands (SPEC-001, `requiredFeatures: ['tasks.process']`), idempotent on
`(taskId, processInstanceId, stepId)`. A mismatched `delegationId` makes the command a logged
no-op. People can't undo these commands. Each validates against the matrix:

- `tasks.task.set_status { taskId, delegationId, status, reason?, processInstanceId, stepId }`
- `tasks.task.link { taskId, delegationId, kind, ref, url?, processInstanceId, stepId }`
- `tasks.task.create_followup { parentId, delegationId, title, body, priority?, processInstanceId, stepId }`

Subscriber `fail-on-instance-end` on `workflows.instance.{failed,cancelled}`: see the safety
net under *Delegation*.

Events (after commit; scope in the emit options as well as the payload, per SPEC-001
constraint 4):

- `tasks.task.created { taskId, reference, projectKey, source }`
- `tasks.task.delegated { taskId, reference, delegationId, delegateUserId, agentId,
  assigneeUserId, delegatedBy, projectKey, source, title }`: persistent. `agentId` is the agent
  definition id resolved from the principal. **Replaces SPEC-001's `tasks.task.assigned`
  trigger.**
- `tasks.task.undelegated { taskId, delegationId, processInstanceId? }`
- `tasks.task.assigned { taskId, assigneeUserId, previousAssigneeUserId }`: human assignment
  only; triggers nothing.
- `tasks.task.status_changed { taskId, from, to, reason? }`: `clientBroadcast`.
- `tasks.comment.created { taskId, commentId }`

AI tools (read-only, for SPEC-001's research agent): `tasks_get { reference | taskId }`, which
returns the task, parent, links and comments, and `tasks_search { projectKey, query?, status? }`.

## Implementation Approach

Each step leaves the app working and ends with its own test. The module-data steps
follow `om-module-scaffold`. Run `yarn db:generate`, review the SQL, and ask before applying.

**Phase 1: records and commands** (the SPEC-001 chain can start after this phase)

1. Scaffold the module: `index.ts`, `acl.ts` (five features), `setup.ts` role defaults and a
   seeded `DEMO` project, then `yarn generate`. *Test:* the module loads and the ACL syncs.
2. Entities and migration for project, task and comment, with the indexes above. *Test:*
   migration SQL reviewed; the entity round-trips.
3. `tasks.project.*` and `tasks.task.{create,update,delete,move}` with reference allocation
   (a port of `taskReference.ts`). *Tests:* concurrent creates get distinct references; a
   gap after rollback is accepted; undo restores.
4. `tasks.task.{delegate,undelegate,change_status}`, the events, and SPEC-001's
   `start-factory` subscriber switched to `tasks.task.delegated` with the key
   `task:{taskId}:{delegationId}`, so the chain keeps starting. *Tests:* delegate without an
   assignee makes the actor the assignee; a non-agent delegate returns 422; a missing
   definition returns 503; un-delegate before `sized` emits `undelegated`, and after it returns
   `decision_pending`; the payload carries scope in the options; every row of the matrix.
5. Workflow-safe `set_status`, `link` and `create_followup` in `workflows.ts`, enabled in the
   seed, plus the `fail-on-instance-end` subscriber. *Tests:* replay idempotency; a stale
   `delegationId` is a no-op; terminal states release the delegate; reopen and re-delegate
   gives a new `delegationId`; the follow-up inherits the assignee and gets no delegate; an
   instance cancelled from the orchestrator marks the task `failed`.

**Phase 2: API and board**

6. CRUD routes, the status and delegate endpoints, and the agents list, with OpenAPI.
   *Tests:* the ACL matrix; a stale `updatedAt` returns 409.
7. Projects page (`DataTable` + `CrudForm`). *Test:* key immutability once tasks exist.
8. Board page with columns, cards, filters, drag (disabled for delegated cards) and keyboard
   navigation. *Test:* integration: create, drag, and a refused drag on a delegated card.
9. Task drawer with sidebar, links, the status timeline from the audit log, and comments.
   *Test:* integration: comment round-trip.

**Phase 3: live run state**

10. Batched response enricher for `runState`, with graceful degradation when the orchestrator
    is absent. *Tests:* each derived state, including `stalled`; a single lookup per page;
    orchestrator-absent falls back to the status badge.
11. Client-broadcast refresh on `tasks.task.status_changed`, `workflows.instance.*` and
    `agent_orchestrator.proposal.*`. *Test:* integration: delegate → the card reads `starting`
    then `running` without a reload.
12. Read-only AI tools `tasks_get` and `tasks_search`. *Test:* Playground call returns scoped
    data only.

**Phase 4: end to end**

13. The SPEC-001 stub chain with the board: delegate → `queued` → Caseload approve →
    `in_review` with the PR link → the assignee closes `done` → the delegate is released.
    *Test:* one integration run, kept green as the smoke test.

Validation per phase: `yarn generate && yarn typecheck && yarn lint && yarn ds:check && yarn
test`; `yarn test:integration:ephemeral` after steps 8, 9, 11 and 13.

## Key Design Decisions

1. **Assignee plus delegate, not one assignee slot.** This keeps the accountable human a
   column, not a join, and it matches SPEC-001's separation of initiator and actor. The cost
   is a second field in the UI; the delegate badge on the card keeps that small. Naming note:
   the orchestrator also has *delegation grants* (`agentDelegationGrantService`, OAuth on
   behalf of a user). Task delegation is unrelated, and code and docs say "task delegate" to
   avoid confusion.
2. **A fixed lifecycle, with a category mapping.** The process writes statuses by name, so
   the MVP can't let users rename or add them. The category map is the seam for later.
3. **The run state is derived, not stored.** No agent-session table. The orchestrator is the
   single source of what a run is doing.
4. **Projects are records.** They are needed for references and PR linking. They are not
   planning objects: a project has no dates, goals or members.
5. **Manual triggers only.** The only way work starts is a person setting a delegate. Intake
   routes add sources later without changing the trigger.
6. **A separate module, not the staff board**, for the reasons in *Not built on the core
   `staff` board*.

## Open Questions

- **Is a generic task board planned upstream?** If Open Mercato plans one, align with it
  after the hackathon rather than fork. Ask the maintainers at the event.
- **Batch reads from the orchestrator.** Confirm that pending proposals, user tasks and
  milestones can be read for N instances in one call (for `awaiting_decision` and the
  un-delegate guard). If they can't, the guard reads one instance on demand and the board
  enricher drops `awaiting_decision`. Resolves in Phase 1, step 4.

## Changelog

<!-- Record, not state: rows are closed once dated — append, never rewrite. -->

| Date | Change |
|------|--------|
| 2026-09-18 | Skeleton with Open Questions Q1–Q4. |
| 2026-09-18 | Gate resolved (assignee + delegate; manual triggers only; projects as records; plain comments); full draft. |
| 2026-09-18 | Fresh-context review applied: delegate released at terminal states, reopen and re-delegate, assignee closes `in_review`, stale-write guard on `delegationId`, explicit transition matrix, un-delegate guard on the `sized` milestone, real event names, trigger switch moved into Phase 1. |
