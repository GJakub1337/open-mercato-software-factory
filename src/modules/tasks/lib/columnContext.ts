import type { CommandRuntimeContext } from '@open-mercato/shared/lib/commands'

type ColumnContextState = {
  createdColumns: WeakMap<CommandRuntimeContext, Map<string, string>>
  internalTransitions: WeakMap<CommandRuntimeContext, Map<string, string>>
}

// The generator inlines this file into more than one bundle (commands and command interceptors),
// so module-level maps would be separate copies: the guard would never see what the delegate
// command authorized. Keep one registry per process instead.
const STATE_KEY = Symbol.for('open-mercato.tasks.column-context')
const globalState = globalThis as typeof globalThis & { [STATE_KEY]?: ColumnContextState }
const state = (globalState[STATE_KEY] ??= { createdColumns: new WeakMap(), internalTransitions: new WeakMap() })
const { createdColumns, internalTransitions } = state

export function rememberCreatedTaskColumn(ctx: CommandRuntimeContext, id: string, slug: string): void {
  const columns = createdColumns.get(ctx) ?? new Map<string, string>()
  columns.set(id, slug)
  createdColumns.set(ctx, columns)
}

export function createdTaskColumnSlug(ctx: CommandRuntimeContext, id: string): string | null {
  return createdColumns.get(ctx)?.get(id) ?? null
}

export function authorizeInternalTaskTransition(ctx: CommandRuntimeContext, taskId: string, slug: string): void {
  const transitions = internalTransitions.get(ctx) ?? new Map<string, string>()
  transitions.set(taskId, slug)
  internalTransitions.set(ctx, transitions)
}

export function consumeInternalTaskTransition(ctx: CommandRuntimeContext, taskId: string, slug: string): boolean {
  const transitions = internalTransitions.get(ctx)
  if (transitions?.get(taskId) !== slug) return false
  transitions.delete(taskId)
  return true
}
