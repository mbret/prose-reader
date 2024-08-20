import React from "react"
import { IconButton, Box, Stack } from "@chakra-ui/react"
import { ArrowBackIcon, ArrowDownIcon, ArrowForwardIcon, ArrowUpIcon } from "@chakra-ui/icons"
import { Scrubber } from "./Scrubber"
import { AppBar } from "../../common/AppBar"
import { useReader } from "../useReader"
import { useObserve } from "reactjrx"
import { NEVER } from "rxjs"
import { PaginationInfoSection } from "./PaginationInfoSection"

export const BottomMenu = ({ open }: { open: boolean }) => {
  const { reader } = useReader()
  const navigation = useObserve(reader?.navigation.state$ ?? NEVER)
  const settings = useObserve(reader?.settings.values$ ?? NEVER)
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
            justifyContent: "space-between"
          }}
          leftElement={
            <IconButton
              icon={isVerticalDirection ? <ArrowUpIcon /> : <ArrowBackIcon />}
              aria-label="back"
              onClick={() =>
                isVerticalDirection ? reader?.navigation.goToTopSpineItem() : reader?.navigation.goToLeftSpineItem()
              }
              isDisabled={!navigation?.canGoLeftSpineItem && !navigation?.canGoTopSpineItem}
            />
          }
          rightElement={
            <IconButton
              icon={isVerticalDirection ? <ArrowDownIcon /> : <ArrowForwardIcon />}
              aria-label="forward"
              isDisabled={!navigation?.canGoRightSpineItem && !navigation?.canGoBottomSpineItem}
              onClick={() => {
                isVerticalDirection ? reader?.navigation.goToBottomSpineItem() : reader?.navigation.goToRightSpineItem()
              }}
            />
          }
          middleElement={
            <Stack
              style={{
                overflow: "hidden",
                textAlign: `center`
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
