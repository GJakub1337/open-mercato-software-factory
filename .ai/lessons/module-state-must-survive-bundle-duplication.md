---
title: "Keep cross-module runtime registries on globalThis, and verify them in the built app"
modules: ["task_delegation"]
areas: ["debugging", "testing"]
topics: ["generated-files", "command-transactions", "di"]
---

# Keep cross-module runtime registries on globalThis, and verify them in the built app

**Context**: Task delegation passed 65 mocked unit tests, then failed on every request in the built app. The generated commands and interceptors bundles each inlined `tasks/lib/columnContext.ts`, and the Next server chunks each inlined `@open-mercato/shared` `commands/transaction.js`. Each copy kept its own module-level `WeakMap`, so state written by one command was invisible to the guard or service reading it. The same run also exposed CLASSIC DI injection ignoring a destructured `{ em }` factory, and subscribers reading a `hasRegistration` the event bus never passes.

**Problem**: A Jest module graph has one instance per file, and mocks supply whatever shape the test author assumed. So neither module duplication nor a wrong runtime contract shows up until the real bundles run.

**Rule**: Keep state that one module writes and another reads (a per-context registry, a transaction map) under `globalThis[Symbol.for('<owner>.<name>')]`, and test it with `jest.isolateModules` loading two copies. Register `{ deps }`-style DI factories with `.proxy()`. In subscriber tests, build the context the event bus really passes (`{ resolve }`). Before calling delegation or command work done, click through it on `yarn test:integration:ephemeral:start:verbose`; the verbose mode is the one that shows server stack traces.

**Applies to**: `src/modules/*/lib` state shared between commands, interceptors, and subscribers; `.yarn/patches` for `@open-mercato/shared`; `di.ts` registrations; subscriber tests.
