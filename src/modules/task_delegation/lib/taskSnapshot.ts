import { CrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { resolveTranslations } from '@open-mercato/shared/lib/i18n/server'
import type { QueryEngine } from '@open-mercato/shared/lib/query/types'

export type TaskSnapshot = Readonly<{
  taskId: string
  timeProjectId: string
  tenantId: string
  organizationId: string
  parentTaskId: string | null
  updatedAt: string
  taskStatusId: string
  statusSlug: string
  assigneeStaffMemberId: string | null
  assigneeUserId: string | null
  childTaskIds: readonly string[]
}>

type TaskRow = {
  id: string
  time_project_id: string
  parent_task_id: string | null
  updated_at: Date | string
  task_status_id: string
  assignee_staff_member_id: string | null
}

/**
 * Reads a staff task with its column slug, assignee user and child ids through staff's query
 * surface. Nothing is locked: staff 0.8.0 commits each of its commands on its own, so concurrent
 * writers are caught by the optimistic version check and the active-delegation unique index.
 */
export async function readTaskSnapshot(
  queryEngine: QueryEngine,
  scope: { tenantId: string; organizationId: string },
  input: { taskId: string; includeChildren?: boolean; includeDeleted?: boolean },
): Promise<TaskSnapshot> {
  const base = { tenantId: scope.tenantId, organizationId: scope.organizationId, withDeleted: input.includeDeleted ?? false }
  const taskFields = ['id', 'time_project_id', 'parent_task_id', 'updated_at', 'task_status_id', 'assignee_staff_member_id']
  const tasks = await queryEngine.query<TaskRow>('staff:staff_time_task', {
    ...base, fields: taskFields, filters: { id: input.taskId }, page: { page: 1, pageSize: 1 },
  })
  const task = tasks.items[0]
  if (!task) {
    const { translate } = await resolveTranslations()
    throw new CrudHttpError(404, { error: translate('task_delegation.errors.taskNotFound', 'Task not found.') })
  }
  const [status, assignee, children] = await Promise.all([
    queryEngine.query<{ slug: string }>('staff:staff_time_task_status', {
      ...base, withDeleted: true, fields: ['slug'], filters: { id: task.task_status_id }, page: { page: 1, pageSize: 1 },
    }),
    task.assignee_staff_member_id
      ? queryEngine.query<{ user_id: string | null }>('staff:staff_team_member', {
        ...base, withDeleted: false, fields: ['user_id'], filters: { id: task.assignee_staff_member_id }, page: { page: 1, pageSize: 1 },
      })
      : null,
    input.includeChildren
      ? queryEngine.query<{ id: string }>('staff:staff_time_task', {
        ...base, fields: ['id'], filters: { parent_task_id: task.id }, page: { page: 1, pageSize: 500 },
      })
      : null,
  ])
  return Object.freeze({
    taskId: task.id,
    timeProjectId: task.time_project_id,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    parentTaskId: task.parent_task_id ?? null,
    updatedAt: new Date(task.updated_at).toISOString(),
    taskStatusId: task.task_status_id,
    statusSlug: status.items[0]?.slug ?? '',
    assigneeStaffMemberId: task.assignee_staff_member_id ?? null,
    assigneeUserId: assignee?.items[0]?.user_id ?? null,
    childTaskIds: Object.freeze((children?.items ?? []).map((child) => child.id)),
  })
}
