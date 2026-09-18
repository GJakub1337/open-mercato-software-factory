# SPEC-004: Demo: Stal-Zbiorniki, a steel-tank maker runs its website from Open Mercato

**Status**: Draft
**Owner**: HackOn team · **Date**: 2026-09-18 · **Tracker**: —
**Parent**: [SPEC-001](./SPEC-001-2026-09-18-agentic-software-factory.md) (the business-owner
persona and the business-data scenario), showing [SPEC-002](./SPEC-002-2026-09-18-tasks-module.md)
(delegation on the board) and [SPEC-003](./SPEC-003-2026-09-18-task-change-set.md) (record changes
with before → after).

## TLDR

The Sunday pitch is 5 minutes of presentation and 3 of Q&A. It tells one story about one company.
**Stal-Zbiorniki Sp. z o.o.** is a fictional steel-tank manufacturer modelled on
[metal-zbiorniki.pl](https://metal-zbiorniki.pl/). Its owner, Marek, has no developer and never
reads a diff. From the Open Mercato task board he fixes a wrong product record, gets a new stock
tank onto the website as a reviewed PR with a preview, and sees that a change to the terms waits
for a lawyer. This spec fixes the storyline, the demo data (seeded by the `demo_fixtures` module),
the target website, the fallbacks and the Q&A answers. It adds no product behaviour.

## Open Questions

- **Q1. Target website stack.** (a) WordPress, which is what the real company would have. Its
  pages live in the database, so a per-run preview needs a DB per run. (b) A static site (Astro
  or Next export) where every product is a Markdown file in the repo. A PR is then a readable
  diff and a Vercel or Cloudflare preview comes free. Recommendation: (b), styled like the real
  site and presented as "the company website". WordPress goes on the roadmap slide.
- **Q2. Pitch language.** Polish (the jury and the persona) or English (the Open Mercato
  audience). The slides and on-screen data follow the choice. The seeded catalog is Polish either
  way, because the company is.
- **Q3. Live or recorded agent runs.** The coding run in scene 3 takes minutes. Options: (a) start
  it before the pitch and show the finished PR live; (b) play a recorded 40-second screen capture
  of the run, and show everything else live. Recommendation: (a) with (b) as the backup.

## Problem Statement

SPEC-001's demo so far was generic: "a target repo with one feature request". A jury remembers a
person with a problem, not an architecture. The factory's strongest claim, that the trigger lives
in the company's own system of record, needs a company whose records and website visibly drift
apart. The real metal-zbiorniki.pl shows the pattern well:

- Sales come in through a "Wyślij zapytanie" form, three mailboxes and three phone numbers. Quotes
  live in Excel and email.
- An "Od ręki" (in stock) section lists three ready tanks. When a tank is built or sold, the page
  has to change the same day, or the company quotes tanks it no longer has.
- Products carry technical parameters (capacity, steel grade, PZH and UDT certificates) where a
  wrong number is costly, so changes need a before → after view and an undo.

We use a fictional name so that no real brand appears in the demo without the owner's consent.

## Persona

**Marek, 52, owner of Stal-Zbiorniki** (Wrocław area, founded 2008, ~35 people, 20+ industrial
clients). He runs sales, the catalog and staff in Open Mercato. The company website is a repo
connected as a project. There is no developer on staff. An agency charges him for every change
and takes two weeks to make it. He approves plans and previews but never code. His lawyer reviews
anything in the terms of sale.

## Storyline (5:00)

| Time | Scene | On screen | Proves | Depends on |
|---|---|---|---|---|
| 0:00–0:35 | **1. Hook** | Slide: Marek, the real-looking website, the "Od ręki" section out of date, Excel with quotes | the problem, in one person | nothing |
| 0:35–1:50 | **2. Fix a record** | Marek on the product page, AI assistant: "ZDP-5000 ma 5200 l, nie 5000, i brakuje wymiarów". A task appears, delegated. The Caseload shows one change to *ZDP-5000*: title, description, dimensions before → after. He approves, the record updates, and the task drawer shows `applied`. | plan before action; human gate; compare-and-set; nothing hidden | SPEC-002 chat intake, SPEC-003 Phase 1 |
| 1:50–3:40 | **3. Catalog → website** | Marek adds *ZWM-1500 Zbiornik mobilny na wodę pitną 1500 l* with "Od ręki" ticked. The board shows a new task, delegated, from `catalog.product.created`. We cut to the finished run: the sizer's "single shot", the PR on the site repo, the preview link with the new card in "Od ręki", review route *waiver: new product page*, merged. The live site shows the tank. | the trigger is in the system of record, which repo-only factories cannot see; review routed by change class | SPEC-001 steps 2–3 and the business-data scenario |
| 3:40–4:20 | **4. The contrast** | A task "Wydłuż gwarancję w regulaminie do 5 lat" runs to a PR, and the task sits in `in_review` with "waiting for: legal". The legal reviewer's Caseload item shows the rendered text diff. | low-risk changes merge on policy, legal text never does | SPEC-001 review routing |
| 4:20–5:00 | **5. What's next** | One slide: InboxOps (quote request email → task), WordPress, eval numbers and cost per task from the orchestrator | it generalises beyond code | nothing |

Rules for the live part:

- One browser window with tabs already open: board, product page, Caseload, the PR, the preview,
  the live site. No typing URLs on stage.
- Say "Marek" and "zbiornik", never "entity", "workflow instance" or "effector".
- Every scene ends on a visible state change: a column, a badge, a page.

## Demo data

Seeded by the `demo_fixtures` module (`src/modules/demo_fixtures/lib/stalZbiorniki.ts`):

- Six categories: water, fuels, chemicals, fire-protection, process equipment, and **"Od ręki"**
  (the in-stock list the website renders).
- Seven products with PLN net prices (23% VAT gross), weight, dimensions in mm, and technical
  parameters in `metadata` (`capacityLiters`, `material`, `certifications`, `inStock`).
- **`ZDP-5000` is wrong on purpose.** Its capacity reads 5000 l but the real value is 5200 l, and its
  dimensions are empty. Scene 2 corrects it. The seeder is idempotent by handle and never
  overwrites, so a corrected record stays corrected across re-seeds. To reset between rehearsals,
  re-create the demo tenant.
- **`ZWM-1500` is not seeded.** Marek adds it live in scene 3: title *Zbiornik mobilny na wodę pitną
  1500 l*, SKU `ZWM-1500`, stainless 1.4301, PZH, 1500 l, 11 900 PLN net, in the "Od ręki"
  category.

Seeding writes through the entity manager, the way core's catalog example seeder does, so it emits
no `catalog.product.created` and never starts the factory.

Entry points:

- `yarn initialize` seeds it along with core's examples, which include furniture products. Fine
  for development.
- For the demo instance, `yarn mercato init --no-examples` followed by
  `yarn mercato demo_fixtures seed-stal-zbiorniki --tenant <id> --org <id>` gives a catalog that
  holds only tanks.

The module enables core `catalog` and `sales` (`src/modules.ts`). `sales` is there because core's
catalog example seeder writes a sales channel and tax rates, and SPEC-003 needs `catalog` anyway.

## Target website

A separate repo, `stal-zbiorniki-www`, with the same look as the real site: home, category pages,
"Od ręki", a product page template, and `regulamin` (terms of sale). Its build reads products from
files in the repo (Q1 (b)), so the scene-3 PR adds one file plus an image. It has:

- a preview deployment per PR, which the review route links to;
- a Playwright check that the new product's page renders and appears in "Od ręki". This is the
  "done checks against data" claim from SPEC-001, because the check reads the SKU from the task;
- the GitHub App from SPEC-001 installed, and branch protection with one required check.

## Fallbacks

Each fallback keeps the story. Only the scenes it covers change.

| If this fails by Sunday 11:00 freeze | Scene | Instead |
|---|---|---|
| Chat intake (SPEC-002) | 2 | Marek creates the task on the board by hand and delegates it |
| `record` changes (SPEC-003) | 2 | cut scene 2 and give scene 3 the time |
| Runner does not open PRs | 3 | SPEC-001's runner fallback (Claude Managed Agents); if that fails too, the recorded run (Q3 (b)) |
| Review routing by change class | 4 | say it over the scene-3 PR; show the legal route as one slide |
| Everything with a runner | 3, 4 | SPEC-001's `factory.status` process: a weekly status for Marek, schedule → artifact → approve → post |
| Venue network | all | the recorded full run, narrated live |

## Q&A preparation (3:00)

Likely questions and a two-sentence answer each:

- **"What if the agent is wrong?"** It proposes before it acts. Marek approves a before → after,
  a stale proposal turns `conflict` instead of overwriting, and a record change can be reverted.
  Code only goes out as a PR with a preview and a policy for who reviews it.
- **"Why not Linear, Jira or Copilot agents?"** They see the repo, not the business. Here the task
  starts from a product being added, and "done" is checked against that product.
- **"Who is accountable?"** The human assignee. The agent is a delegate, and each action is in the
  audit log under the person who approved it.
- **"How much does a task cost?"** The orchestrator records cost per run, and we show it on the
  task. Quote the figure measured at the dry run, not an estimate.
- **"Is it open source?"** Open Mercato is MIT. The Agent Orchestrator is source-available: free
  locally, and production needs an enterprise licence. Our modules are plain Open Mercato modules.
- **"Does it work with WordPress?"** Not in the demo. It's the next target, and the runner's
  contract doesn't change.
- **"What about data from email?"** InboxOps is on the roadmap: a quote request email becomes a
  task, matched to catalog products.

## Risks

- **A live LLM on stage.** Mitigated by pre-running scene 3 (Q3) and by keeping every live step a
  single click on a state the dry run already reached.
- **Real-brand confusion.** The name, logo and phone numbers are fictional. The spec cites the
  real site only as research.
- **Seeded furniture on the demo instance.** Use the `--no-examples` entry point.

## Implementation Plan

### Phase 1: Data and script (Friday)

1. `demo_fixtures` module with the Stal-Zbiorniki seed and CLI; enable `catalog` and `sales`.
   *Test:* init a throwaway database; seven PLN products, six categories, `ZDP-5000` without
   dimensions; a second run creates 0 products. **Done.**
2. SPEC-001 and SPEC-003 examples moved to ZDP-5000. **Done.**

### Phase 2: Website (Saturday morning, infra owner)

3. `stal-zbiorniki-www` repo (per Q1), products as files, "Od ręki" and `regulamin` pages,
   preview per PR. *Test:* a hand-made PR adding `ZWM-1500` gets a preview showing it in "Od ręki".
4. Playwright check reading the SKU. *Test:* it fails on `main` and passes on the PR from step 3.

### Phase 3: Wire the scenes (Saturday, with SPEC-001 steps 2–4)

5. Scene 2 end to end on the seeded `ZDP-5000`. *Test:* approve → the record holds 5200 l and
   dimensions; the drawer shows `applied`.
6. Scene 3 end to end from adding `ZWM-1500` in the catalog UI. *Test:* merged PR, live site shows
   the tank, the task in `Done`.
7. Scene 4 legal route. *Test:* a `regulamin` change leaves the task waiting for the legal role.

### Phase 4: Rehearse (Saturday evening, Sunday until 11:00)

8. Slides for scenes 1 and 5; record the backup video of a full run.
9. Two timed dry runs on a fresh tenant with the `--no-examples` entry point. Note the cost per
   task for the Q&A.

## Changelog

<!-- Record, not state: rows are closed once dated — append, never rewrite. -->

| Date | Change |
|------|--------|
| 2026-09-18 | Draft: Stal-Zbiorniki persona and storyline, demo catalog seed (`demo_fixtures`), target website, fallbacks, Q&A. |
