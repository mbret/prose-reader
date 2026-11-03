import { isShallowEqual } from "@prose-reader/shared"
import { type ComponentProps, memo, useEffect } from "react"
import { signal, useConstant, useMemoCompare } from "reactjrx"
import {
  type EveryKeyOf,
  getDefaultValue,
  type PublicContextType,
  ReaderContext,
} from "./context"

const SignalProvider = ({
  children,
  reader,
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
}: {
  children: React.ReactNode
} & PublicContextType) => {
  const valueSignal = useConstant(() => signal({ default: getDefaultValue() }))
  const providerProps = useMemoCompare<EveryKeyOf<PublicContextType>>(
    {
      reader,
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

  useEffect(
    function copyPropsIntoContext() {
      valueSignal.update((old) => ({ ...old, ...providerProps }))
    },
    [providerProps, valueSignal],
  )

  return (
    <ReaderContext.Provider value={valueSignal}>
      {children}
    </ReaderContext.Provider>
  )
}

export const ReactReaderProvider = memo(
  ({ children, ...props }: ComponentProps<typeof SignalProvider>) => {
    return <SignalProvider {...props}>{children}</SignalProvider>
  },
)
