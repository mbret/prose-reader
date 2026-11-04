import { isShallowEqual } from "@prose-reader/shared"
import { memo, type ReactNode, useEffect } from "react"
import { signal, useConstant, useMemoCompare } from "reactjrx"
import {
  getDefaultValue,
  type PublicContextType,
  ReaderContext,
} from "./context"

export const ReaderContextProvider = memo(function ReaderContextProvider({
  children,
  ...props
}: {
  children: ReactNode
} & PublicContextType) {
  const valueSignal = useConstant(() => signal({ default: getDefaultValue() }))
  const memoizedProps = useMemoCompare(props, isShallowEqual)

  useEffect(
    function replacePropsInContext() {
      // A prop the app stops passing must not keep its last value.
      valueSignal.update(
        ({
          uncontrolledSettings,
          notificationsSubject,
          quickMenuBottomBarBoundingBoxSignal,
          selectedHighlight,
        }) => ({
          uncontrolledSettings,
          notificationsSubject,
          quickMenuBottomBarBoundingBoxSignal,
          selectedHighlight,
          ...memoizedProps,
        }),
      )
    },
    [memoizedProps, valueSignal],
  )

  return (
    <ReaderContext.Provider value={valueSignal}>
      {children}
    </ReaderContext.Provider>
  )
})
