# Scene 3 on the board: catalog → DEMO task → Factory → website PR → Marek approves

Goal (SPEC-004 scene 3): a product created in „Od ręki” shows up on the DEMO board as a task
delegated to Factory; the factory run opens the website PR, links it on the task and moves the
task to In review; Marek approves from the drawer, which merges the PR and closes the task.

## Plan

- [x] Land the factory module (commit 53bd842) on main
- [x] `lib/board.ts`: product ↔ task description link; `openProductTask` finds or creates the DEMO
      task and delegates it to the factory agent (acting as the DEMO project owner)
- [x] `factory.deliver`: DB-owned workflow `factory.deliver_product` with a least-privilege grant
      (`tasks.view`, `tasks.process`) + ProcessDefinition `factory.deliver` (manual trigger)
- [x] `factory.deliver_product_pr` function: process from the engine's workflow instance id →
      task → product → in_progress → PR → link + in_review, through the tasks commands; any
      error closes the task as failed (engine emits no instance.failed for async failures)
- [x] Intake subscriber and CLI switch to the board path; old direct process removed
- [x] Approval: `POST /api/factory/tasks/:id/approve` + drawer widget (merge at checked head → Done)
- [x] Unit tests (board, deliver incl. failure/retry, approve rules)
- [x] Ephemeral run: product → task delegated → real PR #8 (closed) → In review; approve against a
      fake GitHub → merged + Done; GitHub down → Closed with reason
- [x] Docs: factory README, SPEC-004 state
- [x] Gate: generate, typecheck, lint, ds:check, test (143), build

## Review

- Real GitHub was used only for opening one rehearsal PR (closed, branch deleted); the merge was
  exercised on a local fake so the live site keeps its pre-pitch state.
- Framework gap noted in the README: when an async activity fails, 0.8.0 marks the workflow FAILED
  without `workflows.instance.failed`, so the orchestrator process stays `running`.
- Still open for the demo: a real rehearsal with Marek's click on the landing repo (then reset
  the site), and the agent runner in place of the deterministic page generator (SPEC-001).
