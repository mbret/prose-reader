import { useAnnotations } from "../useAnnotations"

export const useBookmarks = () => {
  const { data: annotations } = useAnnotations()

  return {
    data: annotations?.filter(
      (annotation) => !annotation.meta.isCfiRange && !annotation.resource.notes,
    ),
  }
}
