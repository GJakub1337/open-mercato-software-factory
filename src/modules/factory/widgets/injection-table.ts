import type { ModuleInjectionTable } from '@open-mercato/shared/modules/widgets/injection'
export const injectionTable: ModuleInjectionTable = {
  // Below the tasks delegate panel (priority 50) in the task drawer.
  'detail:staff:staff_time_task:sidebar': { widgetId: 'factory.injection.task-approve', priority: 40 },
}
export default injectionTable
