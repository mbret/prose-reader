import type { Reader } from "@prose-reader/core"
import type { EnhancerAPI as GestureEnhancerAPI } from "@prose-reader/enhancer-gestures"
import { memo, useEffect, useMemo } from "react"
import { signal, useConstant, useLiveRef, useSubscribe } from "reactjrx"
import { Subject, tap } from "rxjs"
import type { ReaderNotification } from "../notifications/types"
import { ReaderContext } from "./context"

export const ReactReaderProvider = memo(
  ({
    children,
    reader,
    quickMenuOpen,
    onQuickMenuOpenChange,
  }: {
    children?: React.ReactNode
    reader: (Reader & GestureEnhancerAPI) | undefined
    quickMenuOpen: boolean
    onQuickMenuOpenChange: (open: boolean) => void
  }) => {
    const quickMenuSignal = useConstant(() =>
      signal({
        default: quickMenuOpen,
      }),
    )
    const notificationsSubject = useConstant(
      () => new Subject<ReaderNotification>(),
    )
    const refitMenuSignal = useConstant(() =>
      signal({
        default: false,
      }),
    )
    const onQuickMenuOpenChangeLiveRef = useLiveRef(onQuickMenuOpenChange)

    const value = useMemo(
      () => ({
        quickMenuSignal,
        reader,
        notificationsSubject,
        refitMenuSignal,
      }),
      [quickMenuSignal, reader, notificationsSubject, refitMenuSignal],
    )

    useEffect(() => {
      quickMenuSignal.next(quickMenuOpen)
    }, [quickMenuOpen, quickMenuSignal])

    useSubscribe(
      () => quickMenuSignal.pipe(tap(onQuickMenuOpenChangeLiveRef.current)),
      [quickMenuSignal, onQuickMenuOpenChangeLiveRef],
    )

    return (
      <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>
    )
  },
)
