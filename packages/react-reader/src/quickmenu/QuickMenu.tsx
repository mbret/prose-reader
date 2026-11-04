import { memo } from "react"
import {
  type ReaderViewProps,
  useReaderViewContext,
} from "../context/ReaderViewContext"
import { useReaderContextValue } from "../context/useReaderContext"
import { BottomBar } from "./BottomBar"
import { TopBar } from "./TopBar"

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
