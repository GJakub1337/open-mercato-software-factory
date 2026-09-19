'use client'
import * as React from 'react'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { useBackendChrome } from '@open-mercato/ui/backend/BackendChromeProvider'
import { Button } from '@open-mercato/ui/primitives/button'
import { apiCallOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { APP_EVENT_DOM_NAME } from '@open-mercato/ui/backend/injection/useAppEvent'
import type { AppEventPayload } from '@open-mercato/shared/modules/widgets/injection'
import { useTaskDelegation } from '../../../../tasks/widgets/use-task-delegation'

/**
 * „Zatwierdź i opublikuj” (SPEC-004 scene 3): shown once the factory run linked its website PR
 * on the delegated task. The server re-checks everything (assignee, In review, PR on the site
 * repo) before merging, so this only decides visibility.
 */
export default function TaskApprove({ context }: { context?: { taskId?: string } }) {
  const t = useT()
  const { payload } = useBackendChrome()
  const { item, refresh } = useTaskDelegation(context?.taskId)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)
  const delegation = item?.delegation
  const pr = delegation ? [...delegation.links].reverse().find((link) => link.kind === 'pr') : undefined
  if (!item || !delegation || delegation.releasedAt || !pr?.url?.startsWith('https://github.com/')) {
    return done ? <p className="text-sm text-muted-foreground" role="status">{t('factory.approve.done')}</p> : null
  }

  async function approve() {
    if (!item || saving) return
    setSaving(true)
    setError(null)
    try {
      await apiCallOrThrow(`/api/factory/tasks/${item.taskId}/approve`, { method: 'POST' })
      setDone(true)
      refresh()
      // The staff board refetches on its status-changed app event.
      window.dispatchEvent(new CustomEvent<AppEventPayload>(APP_EVENT_DOM_NAME, { detail: {
        id: 'staff.timesheets.time_task.status_changed',
        payload: { taskId: item.taskId },
        timestamp: Date.now(),
        organizationId: payload?.currentOrganization?.id ?? '',
      } }))
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : t('factory.approve.errors.generic'))
    } finally {
      setSaving(false)
    }
  }

  return <section className="space-y-2" aria-label={t('factory.approve.title')} data-testid="factory-task-approve">
    <h3 className="text-sm font-medium">{t('factory.approve.title')}</h3>
    <p className="text-sm text-muted-foreground">{t('factory.approve.hint')}</p>
    <a className="text-sm text-primary underline" href={pr.url} target="_blank" rel="noopener noreferrer">{t('factory.approve.openPr')}</a>
    <div>
      <Button size="sm" disabled={saving} onClick={() => void approve()}>{saving ? t('factory.approve.working') : t('factory.approve.action')}</Button>
    </div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
  </section>
}
