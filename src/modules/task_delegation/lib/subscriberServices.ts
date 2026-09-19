/**
 * Whether an optional service (here: the enterprise orchestrator's registrations) is available to a
 * subscriber. The event bus hands subscribers `{ resolve }` only, without `hasRegistration`, so an
 * unregistered name is detected by its resolution error.
 */
export function canResolve(context: { resolve: <T>(name: string) => T; hasRegistration?: (name: string) => boolean }, name: string): boolean {
  if (typeof context.hasRegistration === 'function') return context.hasRegistration(name)
  try {
    return context.resolve<unknown>(name) != null
  } catch {
    return false
  }
}
