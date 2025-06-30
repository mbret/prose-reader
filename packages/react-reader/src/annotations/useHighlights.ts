import { useAnnotations } from "./useAnnotations"

export const useHighlights = () => {
  const { data: annotations } = useAnnotations()

  return {
    data: annotations?.filter((annotation) => annotation.meta.isCfiRange),
  }
}
