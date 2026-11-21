import { memo } from "react"
import {
  type ReaderViewProps,
  useReaderViewContext,
} from "../context/ReaderViewContext.ts"
import { useReaderContextValue } from "../context/useReaderContext.ts"
import { BottomBar } from "./BottomBar.tsx"
import { TopBar } from "./TopBar.tsx"

export const QuickMenu = memo(
  ({
    onItemClick,
  }: {
    onItemClick: NonNullable<ReaderViewProps["onItemClick"]>
  }) => {
    const { quickMenuOpen, refitMenuOpen, fontSizeMenuOpen } =
      useReaderViewContext()
    const { selectedHighlight } = useReaderContextValue(["selectedHighlight"])

    return (
      <>
        <TopBar
          open={
            quickMenuOpen &&
            !refitMenuOpen &&
            !fontSizeMenuOpen &&
            !selectedHighlight
          }
          onItemClick={onItemClick}
        />
        <BottomBar
          open={quickMenuOpen && !refitMenuOpen && !fontSizeMenuOpen}
          onItemClick={onItemClick}
        />
      </>
    )
  },
)
