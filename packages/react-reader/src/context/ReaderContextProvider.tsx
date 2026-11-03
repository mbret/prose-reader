import { isShallowEqual } from "@prose-reader/shared"
import { type ReactNode, useLayoutEffect } from "react"
import { signal, useConstant, useMemoCompare } from "reactjrx"
import {
  type EveryKeyOf,
  getDefaultValue,
  type ProviderContextType,
  ReaderContext,
} from "./context"

export function ReaderContextProvider({
  children,
  zoomMaxScale,
  settings,
  onSettingsChange,
  settingsByScope,
  settingsScopes,
  onSettingsScopesChange,
  annotations,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
}: ProviderContextType & { children?: ReactNode }) {
  const context = useConstant(() => signal({ default: getDefaultValue() }))
  const providerProps = useMemoCompare<EveryKeyOf<ProviderContextType>>(
    {
      zoomMaxScale,
      settings,
      onSettingsChange,
      settingsByScope,
      settingsScopes,
      onSettingsScopesChange,
      annotations,
      onAnnotationCreate,
      onAnnotationUpdate,
      onAnnotationDelete,
    },
    isShallowEqual,
  )

  // A layout effect, so the passive effects of the same commit, the reader's
  // creation among them, read the props it copies.
  useLayoutEffect(
    function copyPropsIntoContext() {
      context.update((old) => ({ ...old, ...providerProps }))
    },
    [context, providerProps],
  )

  return (
    <ReaderContext.Provider value={context}>{children}</ReaderContext.Provider>
  )
}
