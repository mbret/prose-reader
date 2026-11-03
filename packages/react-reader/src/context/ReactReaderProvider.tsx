import { isShallowEqual } from "@prose-reader/shared"
import { type ComponentProps, memo, useEffect } from "react"
import { signal, useConstant, useMemoCompare } from "reactjrx"
import {
  getDefaultValue,
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
  const memoizedProps = useMemoCompare(props, isShallowEqual)

  useEffect(() => {
    valueSignal.update((old) => ({
      ...old,
      ...memoizedProps,
    }))
  }, [memoizedProps, valueSignal])

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
