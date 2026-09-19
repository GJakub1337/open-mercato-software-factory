import { createWorkflowsModuleConfig, defineWorkflow } from '@open-mercato/shared/modules/workflows'
import type { ActivityType } from '@open-mercato/shared/modules/workflows'

export const FACTORY_PUBLISH_PRODUCT_WORKFLOW_ID = 'factory.publish_product'
export const OPEN_PRODUCT_PR_FUNCTION = 'factory.open_product_pr'
export const PR_OPEN_MILESTONE = 'pr_open'

/**
 * Scene 3 of the demo (SPEC-004): a product added to „Od ręki” becomes a PR on the website.
 * Started only through the `factory` process definition (`lib/processDefinition.ts`), never by
 * a workflow-level event trigger: the intake subscriber decides whether a product qualifies and
 * claims an idempotency key per product, which event triggers cannot carry (SPEC-001).
 *
 * How outputs reach the persisted context in 0.8.0 (and therefore the process outcome):
 * a step's activity outputs stay on the step instance and a step never waits for its own
 * async activities, but TRANSITION activities do both: an async one parks the transition
 * until the job completes and its output is merged under `<activityId>_result`, and a
 * SET_VARIABLE on a transition lands at its path. So the effector is the async activity of
 * the transition into `pr_open`, and the outcome is a SET_VARIABLE on the transition to `end`.
 */
const publishProduct = defineWorkflow({
  workflowId: FACTORY_PUBLISH_PRODUCT_WORKFLOW_ID,
  workflowName: 'Factory: publish product page',
  description: 'Opens a pull request in the website repo with the product page of a catalog product.',
  metadata: { category: 'Factory', tags: ['factory', 'catalog', 'website'], icon: 'globe' },
  steps: [
    {
      stepId: 'start',
      stepName: 'Product added',
      stepType: 'START',
      description: 'Input: { productId, sku, title } from the catalog.product.created intake.',
    },
    {
      stepId: 'settle',
      stepName: 'Wait for the record to settle',
      stepType: 'AUTOMATED',
      description:
        'The catalog create form writes prices and custom fields in follow-up calls after the product exists, so the intake event arrives before the price. A short settle window lets the effector read the complete record.',
      activities: [
        {
          activityId: 'settle_wait',
          activityName: 'settle_wait',
          activityType: 'WAIT',
          config: { duration: '10s' },
        },
      ],
    },
    {
      stepId: 'pr_open',
      stepName: 'Website PR open',
      stepType: 'AUTOMATED',
      description: 'Reached once the transition from `settle` has opened the PR (see t_open_pr).',
      config: { milestone: PR_OPEN_MILESTONE },
    },
    {
      stepId: 'end',
      stepName: 'PR open',
      stepType: 'END',
      description: 'The PR is open; review and merge happen in GitHub.',
    },
  ] as const,
  transitions: [
    { transitionId: 't_settle', transitionName: 'Settle', fromStepId: 'start', toStepId: 'settle', trigger: 'auto', priority: 100 },
    {
      transitionId: 't_open_pr',
      transitionName: 'Open PR',
      // Renders the product page from the catalog record and opens one PR in the site repo.
      fromStepId: 'settle',
      toStepId: 'pr_open',
      trigger: 'auto',
      priority: 100,
      activities: [
        {
          activityId: 'open_product_pr',
          activityName: 'open_product_pr',
          activityType: 'EXECUTE_FUNCTION',
          config: { functionName: OPEN_PRODUCT_PR_FUNCTION, args: {} },
          async: true,
          retryPolicy: { maxAttempts: 2, initialIntervalMs: 5000, backoffCoefficient: 2, maxIntervalMs: 30000 },
        },
      ],
    },
    {
      transitionId: 't_done',
      transitionName: 'Declare outcome',
      fromStepId: 'pr_open',
      toStepId: 'end',
      trigger: 'auto',
      priority: 100,
      activities: [
        {
          activityId: 'declare_outcome',
          activityName: 'declare_outcome',
          // The engine supports SET_VARIABLE; the shared builder's ActivityType union lags behind it.
          activityType: 'SET_VARIABLE' as ActivityType,
          config: {
            assignments: [
              {
                path: 'outcome',
                value: {
                  type: 'factory:pull_request',
                  id: '{{context.open_product_pr_result.result.prUrl}}',
                  label: '{{context.open_product_pr_result.result.prLabel}}',
                },
              },
            ],
          },
        },
      ],
    },
  ],
})

export const workflowsConfig = createWorkflowsModuleConfig({
  moduleId: 'factory',
  workflows: [publishProduct],
})

export default workflowsConfig
