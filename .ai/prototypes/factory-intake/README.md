# Factory Intake — storyboard

Static, pre-implementation storyboard for `docs/specs/SPEC-002-2026-09-18-tasks-module.md`: one page, every state of the
screen, each at desktop (1280) and mobile (390), generated from one fixture set. Read it top to
bottom; nothing needs clicking. All data is fictional.

## Review

Hosted: when this directory lives under an app's `public/prototypes/`, the PR preview serves it
at `/prototypes/factory-intake/index.html` (link in the preview comment) and production refuses it.

Locally, open `index.html`, or serve the directory when browser automation needs HTTP:

```bash
python3 -m http.server 8899 --bind 127.0.0.1
```

Leave feedback as PR comments naming the screen (`s1`…) and the width. The toolbar's comment
mode keeps threads in your browser until **Export for repository** replaces `comments.js`; the
PR thread is the record. **Presentation** hides the commentary and shows one state at a time —
the screen switcher and `← Back` move between them.

## Regenerating

`index.html` is emitted by `generate.mjs` from one data model. Edit fixtures or renderers there
and run `node generate.mjs`; never edit `index.html` by hand. Screen ids are stable review
anchors once review starts. `generate.mjs` also owns the prototype id: renaming this directory
means changing `PROTOTYPE_ID` there and `prototypeId` in `comments.js` together, or the
generator refuses to run.

`tokens.css` is generated from the Open Mercato app's `globals.css`; regenerate it with the design-storyboard skill's `sync-tokens.mjs` rather than editing it.

## Lifecycle

Frozen once the spec is approved. After implementation, add "implemented in PR #N" here and stop
editing; a later change gets its own storyboard.

## Deliberate prototype differences

Icons are an inline Lucide sprite and copy is hardcoded English; both are forbidden in
production code. The Caseload frame (s10) is the Agent Orchestrator's own page, drawn only so
the flow reads end to end. The chat frames (s13, s14) mirror OM 0.8's `AiDock` + `AiChat` and
its standard mutation-approval card; the only new pieces are the `tasks.intake` agent and the
`tasks_create` tool. No preview environment serves this directory; screenshots are committed
under `screenshots/`.
