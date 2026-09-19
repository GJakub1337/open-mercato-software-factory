/** @jest-environment jsdom */

import { afterEach, beforeEach, expect, it, jest } from '@jest/globals'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

import { AiAssistantShellIntegration } from '../AiAssistantShellIntegration'

const VISIBILITY_KEY = 'om:ai-assistant:visibility'
const VISIBILITY_EVENT = 'om:ai-assistant-visibility-change'

jest.mock('@open-mercato/ai-assistant/frontend', () => ({
  AiAssistantIntegration: ({ children }: { children: ReactNode }) => children,
}))

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

it('enables the assistant shell when no visibility preference exists', async () => {
  const onVisibilityChange = jest.fn<(event: Event) => void>()
  window.addEventListener(VISIBILITY_EVENT, onVisibilityChange)

  render(
    <AiAssistantShellIntegration tenantId="tenant" organizationId="organization">
      <span>Chat entry point</span>
    </AiAssistantShellIntegration>,
  )

  expect(await screen.findByText('Chat entry point')).toBeInTheDocument()
  expect(JSON.parse(window.localStorage.getItem(VISIBILITY_KEY) ?? '{}')).toEqual({ enabled: true })
  expect(onVisibilityChange).toHaveBeenCalledTimes(1)
  expect((onVisibilityChange.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ enabled: true })

  window.removeEventListener(VISIBILITY_EVENT, onVisibilityChange)
})

it('preserves an explicit disabled visibility preference', async () => {
  const disabledPreference = JSON.stringify({ enabled: false })
  window.localStorage.setItem(VISIBILITY_KEY, disabledPreference)
  const onVisibilityChange = jest.fn<(event: Event) => void>()
  window.addEventListener(VISIBILITY_EVENT, onVisibilityChange)

  render(
    <AiAssistantShellIntegration tenantId="tenant" organizationId="organization">
      <span>Chat entry point</span>
    </AiAssistantShellIntegration>,
  )

  expect(await screen.findByText('Chat entry point')).toBeInTheDocument()
  expect(window.localStorage.getItem(VISIBILITY_KEY)).toBe(disabledPreference)
  expect(onVisibilityChange).not.toHaveBeenCalled()

  window.removeEventListener(VISIBILITY_EVENT, onVisibilityChange)
})
