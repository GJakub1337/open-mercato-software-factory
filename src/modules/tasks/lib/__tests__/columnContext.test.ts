import { describe, expect, it, jest } from '@jest/globals'
import type { CommandRuntimeContext } from '@open-mercato/shared/lib/commands'
import { authorizeInternalTaskTransition, consumeInternalTaskTransition, rememberCreatedTaskColumn, createdTaskColumnSlug } from '../columnContext'

const context = {} as CommandRuntimeContext

describe('tasks transaction-local column context', () => {
  it('tracks a newly created column without exposing an input bypass flag', () => {
    rememberCreatedTaskColumn(context, 'status-id', 'queued')
    expect(createdTaskColumnSlug(context, 'status-id')).toBe('queued')
  })

  it('authorizes one exact internal move and consumes it', () => {
    authorizeInternalTaskTransition(context, 'task-id', 'queued')
    expect(consumeInternalTaskTransition(context, 'task-id', 'in-design')).toBe(false)
    expect(consumeInternalTaskTransition(context, 'task-id', 'queued')).toBe(true)
    expect(consumeInternalTaskTransition(context, 'task-id', 'queued')).toBe(false)
  })

  it('shares authorizations between separately bundled copies of the module', () => {
    // Generated bundles inline this file into both the commands and the interceptors output.
    let commandsCopy!: typeof import('../columnContext')
    let interceptorsCopy!: typeof import('../columnContext')
    jest.isolateModules(() => { commandsCopy = require('../columnContext') })
    jest.isolateModules(() => { interceptorsCopy = require('../columnContext') })
    expect(commandsCopy).not.toBe(interceptorsCopy)
    commandsCopy.authorizeInternalTaskTransition(context, 'bundled-task', 'queued')
    expect(interceptorsCopy.consumeInternalTaskTransition(context, 'bundled-task', 'queued')).toBe(true)
  })
})
