import { IconButton, Stack } from "@chakra-ui/react"
import { IoMdArrowRoundBack } from "react-icons/io"
import { IoMdArrowRoundForward } from "react-icons/io"
import { IoMdArrowDown } from "react-icons/io"
import { IoMdArrowUp } from "react-icons/io"
import { Scrubber } from "./Scrubber"
import { AppBar } from "../../common/AppBar"
import { useReader } from "../useReader"
import { useObserve } from "reactjrx"
import { PaginationInfoSection } from "./PaginationInfoSection"

export const BottomMenu = ({ open }: { open: boolean }) => {
  const { reader } = useReader()
  const navigation = useObserve(() => reader?.navigation.state$, [reader])
  const settings = useObserve(() => reader?.settings.values$, [reader])
  const isVerticalDirection = settings?.computedPageTurnDirection === "vertical"

  return (
    <>
      {open && (
        <AppBar
          position="absolute"
          left={0}
          bottom={0}
          height="auto"
          minHeight={140}
          style={{
            justifyContent: "space-between",
          }}
          leftElement={
            <IconButton
              aria-label="back"
              onClick={() =>
                isVerticalDirection
                  ? reader?.navigation.goToTopSpineItem()
                  : reader?.navigation.goToLeftSpineItem()
              }
              disabled={
                !navigation?.canGoLeftSpineItem &&
                !navigation?.canGoTopSpineItem
              }
            >
              {isVerticalDirection ? <IoMdArrowUp /> : <IoMdArrowRoundBack />}
            </IconButton>
          }
          rightElement={
            <IconButton
              aria-label="forward"
              disabled={
                !navigation?.canGoRightSpineItem &&
                !navigation?.canGoBottomSpineItem
              }
              onClick={() => {
                isVerticalDirection
                  ? reader?.navigation.goToBottomSpineItem()
                  : reader?.navigation.goToRightSpineItem()
              }}
            >
              {isVerticalDirection ? (
                <IoMdArrowDown />
              ) : (
                <IoMdArrowRoundForward />
              )}
            </IconButton>
          }
          middleElement={
            <Stack
              style={{
                overflow: "hidden",
                textAlign: `center`,
              }}
              flex={1}
              p={2}
              px={8}
              maxW={400}
              gap={3}
            >
              <PaginationInfoSection />
              <Scrubber />
            </Stack>
          }
        />
      )}
    </>
  )
}
