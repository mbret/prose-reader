import type { Reader } from "@prose-reader/core"
import { memo, useEffect, useMemo } from "react"
import { useLiveRef, useSignal, useSubscribe } from "reactjrx"
import { tap } from "rxjs"
import { ReaderContext } from "./context"

export const ReactReaderProvider = memo(
  ({
    children,
    reader,
    quickMenuOpen,
    onQuickMenuOpenChange,
  }: {
    children?: React.ReactNode
    reader: Reader | undefined
    quickMenuOpen: boolean
    onQuickMenuOpenChange: (open: boolean) => void
  }) => {
    const [, quickMenuSignal] = useSignalState(() =>
      signal({
        default: quickMenuOpen,
      }),
    )
    const onQuickMenuOpenChangeLiveRef = useLiveRef(onQuickMenuOpenChange)

    const value = useMemo(
      () => ({
        quickMenuSignal,
        reader,
      }),
      [quickMenuSignal, reader],
    )

    useEffect(() => {
      quickMenuSignal.setValue(quickMenuOpen)
    }, [quickMenuOpen, quickMenuSignal])

    useSubscribe(
      () =>
        quickMenuSignal.subject.pipe(tap(onQuickMenuOpenChangeLiveRef.current)),
      [quickMenuSignal, onQuickMenuOpenChangeLiveRef],
    )

    return (
      <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>
    )
  },
)
