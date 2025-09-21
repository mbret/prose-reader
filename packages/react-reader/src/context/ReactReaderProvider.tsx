import type { Reader } from "@prose-reader/core"
import type { EnhancerAPI as GestureEnhancerAPI } from "@prose-reader/enhancer-gestures"
import { type DependencyList, memo, useCallback, useEffect } from "react"
import { signal, useConstant, useSignalValue } from "reactjrx"
import { SyncFontSettings } from "../fonts/SyncFontSettings"
import type { SETTING_SCOPE } from "../settings/types"
import { getDefaultValue, ReaderContext } from "./context"

type ProviderProps = {
  children: React.ReactNode
  reader: (Reader & GestureEnhancerAPI) | undefined
  quickMenuOpen?: boolean
  onQuickMenuOpenChange?: (open: boolean) => void
  onFontSizeValueChange?: (value: number) => void
  onFontSizeScopeValueChange?: (scope: SETTING_SCOPE) => void
  fontSize?: number
  fontSizeScope?: SETTING_SCOPE
}

const SignalProvider = ({
  children,
  onQuickMenuOpenChange,
  quickMenuOpen,
  fontSizeScope,
  onFontSizeScopeValueChange,
  fontSize,
  onFontSizeValueChange,
  ...props
}: { children: React.ReactNode } & ProviderProps) => {
  const valueSignal = useConstant(() => signal({ default: getDefaultValue() }))
  /**
   * font menu open
   */
  const uncontrolledFontSizeMenuOpen = useConstant(() =>
    signal({ default: valueSignal.value.fontSizeMenuOpen }),
  )
  const uncontrolledFontSizeMenuOpenValue = useSignalValue(
    uncontrolledFontSizeMenuOpen,
  )
  const uncontrolledOnFontSizeMenuOpenChange = useCallback(
    (open: boolean) => {
      uncontrolledFontSizeMenuOpen.update(open)
    },
    [uncontrolledFontSizeMenuOpen],
  )
  /**
   * Font size
   */
  const uncontrolledFontSize = useConstant(() =>
    signal({ default: valueSignal.value.fontSize }),
  )
  const uncontrolledFontSizeValue = useSignalValue(uncontrolledFontSize)
  const uncontrolledOnFontSizeValueChange = useCallback(
    (value: number) => {
      uncontrolledFontSize.update(value)
    },
    [uncontrolledFontSize],
  )
  const _fontSizeValue = fontSize ?? uncontrolledFontSizeValue
  const _onFontSizeValueChange =
    onFontSizeValueChange ?? uncontrolledOnFontSizeValueChange
  /**
   * font size scope
   */
  const uncontrolledFontSizeScope = useConstant(() =>
    signal({ default: valueSignal.value.fontSizeScopeValue }),
  )
  const uncontrolledFontSizeScopeValue = useSignalValue(
    uncontrolledFontSizeScope,
  )
  const uncontrolledOnFontSizeScopeChange = useCallback(
    (scope: SETTING_SCOPE) => {
      uncontrolledFontSizeScope.update(scope)
    },
    [uncontrolledFontSizeScope],
  )
  const _fontSizeScopeValue = fontSizeScope ?? uncontrolledFontSizeScopeValue
  const _onFontSizeScopeChange =
    onFontSizeScopeValueChange ?? uncontrolledOnFontSizeScopeChange
  const uncontrolledQuickMenuOpen = useConstant(() =>
    signal({ default: valueSignal.value.quickMenuOpen }),
  )
  const uncontrolledOnQuickMenuOpenChange = useCallback(
    (open: boolean) => {
      uncontrolledQuickMenuOpen.update(open)
    },
    [uncontrolledQuickMenuOpen],
  )
  const uncontrolledQuickMenuOpenValue = useSignalValue(
    uncontrolledQuickMenuOpen,
  )
  const _quickMenuOpen = quickMenuOpen ?? uncontrolledQuickMenuOpenValue
  const _onQuickMenuOpenChange =
    onQuickMenuOpenChange ?? uncontrolledOnQuickMenuOpenChange
  const uncontrolledRefitMenuOpen = useConstant(() =>
    signal({ default: valueSignal.value.refitMenuOpen }),
  )
  const uncontrolledOnRefitMenuOpenChange = useCallback(
    (open: boolean) => {
      uncontrolledRefitMenuOpen.update(open)
    },
    [uncontrolledRefitMenuOpen],
  )
  const uncontrolledRefitMenuOpenValue = useSignalValue(
    uncontrolledRefitMenuOpen,
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: Expected
  useEffect(() => {
    valueSignal.update((old) => ({
      ...old,
      ...props,
      onQuickMenuOpenChange: _onQuickMenuOpenChange,
      quickMenuOpen: _quickMenuOpen,
      onFontSizeMenuOpenChange: uncontrolledOnFontSizeMenuOpenChange,
      fontSizeMenuOpen: uncontrolledFontSizeMenuOpenValue,
      onRefitMenuOpenChange: uncontrolledOnRefitMenuOpenChange,
      refitMenuOpen: uncontrolledRefitMenuOpenValue,
      fontSizeScopeValue: _fontSizeScopeValue,
      onFontSizeScopeValueChange: _onFontSizeScopeChange,
      fontSize: _fontSizeValue,
      onFontSizeValueChange: _onFontSizeValueChange,
    }))
  }, [
    ...(Object.values(props) as DependencyList),
    _quickMenuOpen,
    _onQuickMenuOpenChange,
    _fontSizeScopeValue,
    _onFontSizeScopeChange,
    _fontSizeValue,
    _onFontSizeValueChange,
    valueSignal,
    uncontrolledFontSizeMenuOpenValue,
    uncontrolledOnFontSizeMenuOpenChange,
    uncontrolledRefitMenuOpenValue,
    uncontrolledOnRefitMenuOpenChange,
  ])

  return (
    <ReaderContext.Provider value={valueSignal}>
      {children}
    </ReaderContext.Provider>
  )
}

export const ReactReaderProvider = memo(
  ({
    children,
    ...props
  }: {
    children?: React.ReactNode
  } & ProviderProps) => {
    return (
      <SignalProvider {...props}>
        <SyncFontSettings />
        {children}
      </SignalProvider>
    )
  },
)
