/**
 * Columns the factory lifecycle needs on top of staff's default template (SPEC-002 *Status
 * columns*). Staff spaces its defaults 1000 apart (backlog 1000 … done 4000), so these slot in
 * lifecycle order: backlog → queued → in design → in progress → in review → done → closed.
 */
export const FACTORY_COLUMNS = [
  { slug: 'queued', name: 'Queued', isDone: false, position: 1250 },
  { slug: 'in-design', name: 'In design', isDone: false, position: 1500 },
  { slug: 'closed', name: 'Closed', isDone: true, position: 5000 },
] as const
