import { expect, it, jest } from '@jest/globals'

jest.mock('@open-mercato/shared/lib/di/container', () => ({ createRequestContainer: jest.fn() }))
jest.mock('../personalize', () => ({ personalizeStalZbiorniki: jest.fn() }))

import commands from '../../cli'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { personalizeStalZbiorniki } from '../personalize'

it('runs the complete company seed through the existing command only', async () => {
  expect(commands.map((command) => command.command)).toEqual(['seed-stal-zbiorniki'])
  const scope = { tenantId: '123e4567-e89b-42d3-a456-426614174000', organizationId: '123e4567-e89b-42d3-a456-426614174001' }
  jest.mocked(personalizeStalZbiorniki).mockResolvedValue({ ...scope, created: 0, preserved: 64, adopted: 0, agentUserId: null, projects: {} })
  const log = jest.spyOn(console, 'log').mockImplementation(() => {})
  try {
    await commands[0]!.run(['--tenant', scope.tenantId, '--org', scope.organizationId])
    expect(createRequestContainer).toHaveBeenCalledTimes(1)
    expect(jest.mocked(personalizeStalZbiorniki).mock.calls[0]?.[1]).toEqual(scope)
  } finally { log.mockRestore() }
})
