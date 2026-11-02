import { useCallback } from "react"
import { useReader } from "../context/useReader"
import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import type {
  ManagedSettingName,
  ManagedSettingValues,
  ReactReaderSettings,
} from "./managedSettings"
import {
  getAppSettingValueWhenScopeInEffect,
  getInheritedSettingValueForScope,
  getOwnSettingValueForScope,
  getSettingScopeReferenceInEffect,
  getSettingValueForScope,
  withUncontrolledSettingChangesForScope,
} from "./settingValues"
import type {
  ReactReaderSettingsScope,
  ReactReaderSettingsScopeReference,
} from "./types"
import { useScreenSettingsScopeReference } from "./useScreenSettingsScopeReference"

/**
 * What a menu needs to edit a setting react-reader manages: its scopes, the
 * value of each, and a change. A change is reported to the app and, when the
 * app gives no value with that scope in effect, kept as react-reader's own.
 * `undefined` sets a scope back to the value it inherits.
 */
export const useManagedSetting = <Name extends ManagedSettingName>(
  name: Name,
) => {
  const context = useReaderContext()
  const reader = useReader()
  const screen = useScreenSettingsScopeReference()
  const settingSources = useReaderContextValue([
    "settings",
    "settingsByScope",
    "settingsScopes",
    "defaultSettings",
    "onSettingsScopesChange",
    "uncontrolledSettingsByScope",
  ])
  const readerDefaultSettingValues = reader?.settings.defaults

  /** `undefined` when the scope takes the value it inherits. */
  const getOwnValueForScope = (scope: ReactReaderSettingsScopeReference) =>
    getOwnSettingValueForScope(settingSources, name, scope)

  const getInheritedValueForScope = (
    scope: ReactReaderSettingsScopeReference,
  ) =>
    getInheritedSettingValueForScope(
      settingSources,
      name,
      scope,
      readerDefaultSettingValues,
    )

  /** The value the setting takes when the scope is in effect. */
  const getValueForScope = (scope: ReactReaderSettingsScopeReference) =>
    getSettingValueForScope(
      settingSources,
      name,
      scope,
      readerDefaultSettingValues,
    )

  const changeValueForScope = useCallback(
    function changeValueForScope(
      scope: ReactReaderSettingsScopeReference,
      value: ManagedSettingValues[Name] | undefined,
    ) {
      const changes: ReactReaderSettings = {}
      const isInheritedValuePicked = value === undefined
      const hasAppValueWithScopeInEffect =
        getAppSettingValueWhenScopeInEffect(context.value, name, scope) !==
        undefined

      changes[name] = value

      if (isInheritedValuePicked || !hasAppValueWithScopeInEffect) {
        context.update(withUncontrolledSettingChangesForScope(scope, changes))
      }

      context.value.onSettingsChange?.(changes, scope)
    },
    [name, context],
  )

  const changeScope = useCallback(
    function changeScope(scope: ReactReaderSettingsScope) {
      const changes: Partial<
        Record<ManagedSettingName, ReactReaderSettingsScope>
      > = {}

      changes[name] = scope
      context.value.onSettingsScopesChange?.(changes)
    },
    [name, context],
  )

  return {
    activeScope: settingSources.settingsScopes
      ? getSettingScopeReferenceInEffect(settingSources, name, screen)
      : undefined,
    onActiveScopeChange: settingSources.onSettingsScopesChange
      ? changeScope
      : undefined,
    getOwnValueForScope,
    getInheritedValueForScope,
    getValueForScope,
    changeValueForScope,
  }
}
