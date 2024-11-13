import { CfiHandler } from "../../cfi/CfiHandler"

export const generateCfis = ({
  itemId,
  selection,
}: {
  selection: Selection
  itemId: string
}) => {
  const anchorCfi = selection.anchorNode
    ? CfiHandler.generate(
        selection.anchorNode,
        selection.anchorOffset,
        `|[prose~anchor~${encodeURIComponent(itemId)}]`,
      )
    : undefined

  const focusCfi = selection.focusNode
    ? CfiHandler.generate(
        selection.focusNode,
        selection.focusOffset,
        `|[prose~anchor~${encodeURIComponent(itemId)}]`,
      )
    : undefined

  return {
    anchorCfi,
    focusCfi,
  }
}
