# Marek demo interface

## Goal

Prepare the already prototyped, slim demo interface changes for review as an isolated pull request.
Keep the existing direct chat entry point available by default without configuring a provider or
implementing agent delegation.

## Scope

- Include the accepted Marek demo interface plan and its link from SPEC-004.
- Enable the existing AI assistant shell for users who have no saved visibility preference.
- Preserve an explicit user preference that disables the assistant shell.
- Add a focused regression test for the visibility preference behavior.
- Rebase the review diff conceptually onto the current default branch and run the configured gate.

## Non-goals

- Agent delegation, agent execution, and the website-change review flow.
- AI provider or API-key configuration.
- Persisting the local Marek tenant, role, sidebar, or seeded demo data in shared code.
- Changes to task, factory, or orchestrator modules.

## Risks

- A default visibility write could overwrite an explicit user choice. The implementation and test
  preserve every existing value, including an explicit disabled preference.
- The UI entry point can be visible while the provider is not configured. Provider setup remains an
  explicit deployment concern and is outside this pull request.
- The branch started from an earlier default-branch revision. It will be integrated with the latest
  default branch before validation without rewriting shared history.

## Implementation Plan

### Phase 1: Package the existing UI slice

- Keep the accepted demo plan and SPEC-004 cross-reference in the review diff.
- Add regression coverage for the existing visibility-default implementation.
- Integrate the latest default branch and resolve only conflicts within this pull request's scope.

### Phase 2: Verify and publish for review

- Run the focused component test and the complete configured validation gate.
- Review the final diff for scope, compatibility, security, and accidental secret exposure.
- Publish the pull request with agent delegation explicitly listed as a non-goal.

## Progress

PR: #38

> Convention: `- [ ]` pending, `- [x]` done. Append ` - <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Package the existing UI slice

- [x] 1.1 Preserve the accepted demo plan and SPEC-004 cross-reference - d19e74a
- [x] 1.2 Cover the assistant visibility default with a regression test - 7591339
- [x] 1.3 Integrate the current default branch without scope expansion - 192bb99

### Phase 2: Verify and publish for review

- [x] 2.1 Run focused and full validation - 3abd6f5
- [x] 2.2 Complete the final diff review and publish the PR - 3abd6f5

Review fix: browser-storage failures no longer hide or crash the assistant entry point, and the
demo documentation consistently names `Cmd+J` - 3abd6f5.
