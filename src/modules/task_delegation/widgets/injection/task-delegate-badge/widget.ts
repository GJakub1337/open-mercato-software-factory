import type { InjectionWidgetModule } from '@open-mercato/shared/modules/widgets/injection'
import TaskDelegateBadge from './widget.client'
const widget: InjectionWidgetModule<{ taskId?: string }> = {
  metadata: { id: 'task_delegation.injection.task-delegate-badge', title: 'task_delegation.delegate.title', features: ['task_delegation.view'], requiredModules: ['staff'], priority: 50 },
  Widget: TaskDelegateBadge,
}
export default widget
