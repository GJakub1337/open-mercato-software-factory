'use client'

import * as React from 'react'

type AiAssistantIntegrationComponent = React.ComponentType<{
  tenantId: string | null
  organizationId: string | null
  children: React.ReactNode
}>

type AiAssistantShellIntegrationProps = {
  tenantId: string | null
  organizationId: string | null
  children: React.ReactNode
}

const AiAssistantIntegrationFallback: AiAssistantIntegrationComponent = ({ children }) => <>{children}</>
const AI_ASSISTANT_VISIBILITY_KEY = 'om:ai-assistant:visibility'

export function AiAssistantShellIntegration({
  tenantId,
  organizationId,
  children,
}: AiAssistantShellIntegrationProps) {
  const [IntegrationComponent, setIntegrationComponent] = React.useState<AiAssistantIntegrationComponent | null>(null)

  React.useEffect(() => {
    if (window.localStorage.getItem(AI_ASSISTANT_VISIBILITY_KEY) !== null) return
    const visibility = { enabled: true }
    window.localStorage.setItem(AI_ASSISTANT_VISIBILITY_KEY, JSON.stringify(visibility))
    window.dispatchEvent(new CustomEvent('om:ai-assistant-visibility-change', { detail: visibility }))
  }, [])

  React.useEffect(() => {
    let cancelled = false
    void import('@open-mercato/ai-assistant/frontend')
      .then((module) => {
        if (cancelled) return
        setIntegrationComponent(() => module.AiAssistantIntegration)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Failed to load AI assistant integration', error)
        setIntegrationComponent(() => AiAssistantIntegrationFallback)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!IntegrationComponent) return null

  return (
    <IntegrationComponent tenantId={tenantId} organizationId={organizationId}>
      {children}
    </IntegrationComponent>
  )
}
