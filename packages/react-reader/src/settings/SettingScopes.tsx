import { Fieldset, HStack, Tabs } from "@chakra-ui/react"
import { memo, type ReactNode, useEffect, useState } from "react"
import { LuCheck } from "react-icons/lu"
import { Radio, RadioGroup } from "../components/ui/radio"
import {
  getScopeForReference,
  isSettingsScope,
  isSettingsScopeReference,
  type ReactReaderSettingsScope,
  type ReactReaderSettingsScopeReference,
  SETTINGS_SCOPE_REFERENCES,
  SETTINGS_SCOPES,
} from "./types"

/**
 * The scopes of a setting react-reader manages: which one applies to this
 * book, and a tab to edit each one's value. Until the app says which scope
 * applies, only the global value can be edited.
 */
export const SettingScopes = memo(function SettingScopes({
  scopeHelperText,
  activeScope,
  onActiveScopeChange,
  renderScopeValue,
}: {
  scopeHelperText: string
  activeScope: ReactReaderSettingsScopeReference | undefined
  onActiveScopeChange: ((scope: ReactReaderSettingsScope) => void) | undefined
  renderScopeValue: (scope: ReactReaderSettingsScopeReference) => ReactNode
}) {
  const [shownScope, setShownScope] =
    useState<ReactReaderSettingsScopeReference>(activeScope ?? "global")

  useEffect(
    function showActiveScope() {
      setShownScope(activeScope ?? "global")
    },
    [activeScope],
  )

  return (
    <>
      <Fieldset.Root>
        <Fieldset.Legend>Scope</Fieldset.Legend>
        <Fieldset.HelperText>{scopeHelperText}</Fieldset.HelperText>
        <Fieldset.Content>
          <RadioGroup
            value={getScopeForReference(activeScope) ?? "global"}
            disabled={!onActiveScopeChange}
            onValueChange={function selectActiveScope({ value }) {
              if (value !== null && isSettingsScope(value)) {
                onActiveScopeChange?.(value)
              }
            }}
          >
            <HStack gap={2}>
              {SETTINGS_SCOPES.map((scope) => (
                <Radio value={scope} key={scope}>
                  {scope}
                </Radio>
              ))}
            </HStack>
          </RadioGroup>
        </Fieldset.Content>
      </Fieldset.Root>
      <Tabs.Root
        value={shownScope}
        onValueChange={function showScope({ value }) {
          if (isSettingsScopeReference(value)) setShownScope(value)
        }}
        fitted={false}
        size="sm"
      >
        <Tabs.List>
          {SETTINGS_SCOPE_REFERENCES.map((scope) => (
            <Tabs.Trigger
              value={scope}
              key={scope}
              textTransform="capitalize"
              disabled={scope !== "global" && !activeScope}
            >
              {activeScope === scope && <LuCheck />}
              {scope}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {SETTINGS_SCOPE_REFERENCES.map((scope) => (
          <Tabs.Content value={scope} key={scope}>
            {renderScopeValue(scope)}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </>
  )
})
