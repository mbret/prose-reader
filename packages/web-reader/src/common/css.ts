import { useMemo } from "react"

export const useCSS = <T extends React.CSSProperties, K>(css: () => { [key in keyof K]: T }, deps?: React.DependencyList) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(css, deps)
}