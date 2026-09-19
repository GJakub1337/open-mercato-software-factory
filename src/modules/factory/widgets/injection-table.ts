import type { ModuleInjectionTable } from '@open-mercato/shared/modules/widgets/injection'
export const injectionTable: ModuleInjectionTable = {
  // Directly under `task_delegation`'s run-status bar (priority 20) in the drawer header, because
  // the bar tells the owner the change is ready and this panel is where they act on it. It used to
  // sit in the `:sidebar` spot, below staff's tags, which is not where anyone looked.
  'detail:staff:staff_time_task:header': { widgetId: 'factory.injection.task-approve', priority: 30 },
}
export default injectionTable
