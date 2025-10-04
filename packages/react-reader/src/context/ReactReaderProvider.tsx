import type { Reader } from "@prose-reader/core"
import type { EnhancerAPI as GestureEnhancerAPI } from "@prose-reader/enhancer-gestures"
import { type DependencyList, memo, useCallback, useEffect } from "react"
import { signal, useConstant, useSignalValue } from "reactjrx"
import { SyncFontSettings } from "../fonts/SyncFontSettings"
import {
  getDefaultValue,
  ReaderContext,
  type ReaderContextType,
} from "./context"

type ProviderProps = {
  children: React.ReactNode
  reader: (Reader & GestureEnhancerAPI) | undefined
  quickMenuOpen?: boolean
  onQuickMenuOpenChange?: (open: boolean) => void
} & Pick<
  ReaderContextType,
  "fontSize" | "onFontSizeChange" | "fontSizeScope" | "onFontSizeScopeChange"
>

const SignalProvider = ({
  children,
  onQuickMenuOpenChange,
  quickMenuOpen,
  fontSizeScope,
  onFontSizeScopeChange,
  fontSize,
  onFontSizeChange,
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
      fontSizeScope,
      onFontSizeScopeChange,
      fontSize,
      onFontSizeChange,
    }))
  }, [
    ...(Object.values(props) as DependencyList),
    _quickMenuOpen,
    _onQuickMenuOpenChange,
    fontSizeScope,
    onFontSizeScopeChange,
    fontSize,
    onFontSizeChange,
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
