import { isShallowEqual } from "@prose-reader/shared"
import { type ComponentProps, memo, useCallback, useEffect } from "react"
import { signal, useConstant, useMemoCompare, useSignalValue } from "reactjrx"
import {
  getDefaultValue,
  type PrivateContextType,
  type PublicContextType,
  ReaderContext,
} from "./context"

const SignalProvider = ({
  children,
  ...props
}: {
  children: React.ReactNode
} & PublicContextType) => {
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
  const _onQuickMenuOpenChange: PrivateContextType["_onQuickMenuOpenChange"] =
    useCallback(
      (valueOrUpdater: boolean | ((prev: boolean) => boolean)) => {
        valueSignal.update((old) => ({
          ...old,
          _quickMenuOpen:
            typeof valueOrUpdater === "function"
              ? valueOrUpdater(old._quickMenuOpen)
              : valueOrUpdater,
        }))
      },
      [valueSignal],
    )
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

  const memoizedProps = useMemoCompare(props, isShallowEqual)

  useEffect(() => {
    valueSignal.update((old) => ({
      ...old,
      ...memoizedProps,
      onFontSizeMenuOpenChange: uncontrolledOnFontSizeMenuOpenChange,
      fontSizeMenuOpen: uncontrolledFontSizeMenuOpenValue,
      onRefitMenuOpenChange: uncontrolledOnRefitMenuOpenChange,
      refitMenuOpen: uncontrolledRefitMenuOpenValue,
      _onQuickMenuOpenChange,
    }))
  }, [
    memoizedProps,
    _onQuickMenuOpenChange,
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
  ({ children, ...props }: ComponentProps<typeof SignalProvider>) => {
    return <SignalProvider {...props}>{children}</SignalProvider>
  },
)
