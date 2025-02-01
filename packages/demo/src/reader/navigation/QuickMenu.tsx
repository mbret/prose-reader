import { Box, IconButton, Stack } from "@chakra-ui/react"
import { BottomBar } from "@prose-reader/react-reader"
import { memo } from "react"
import { GiHamburgerMenu } from "react-icons/gi"
import { IoMdArrowRoundBack } from "react-icons/io"
import { useNavigate } from "react-router"
import { useObserve, useSignalValue } from "reactjrx"
import { AppBar } from "../../common/AppBar"
import { isQuickMenuOpenSignal } from "../states"
import { useReader } from "../useReader"
import { BottomMenu } from "./BottomMenu"
import { isMenuOpenSignal } from "./MenuDialog"

export const QuickMenu = memo(() => {
  const isQuickMenuOpen = useSignalValue(isQuickMenuOpenSignal)
  const navigate = useNavigate()
  const { reader } = useReader()
  const { manifest } = useObserve(() => reader?.context.state$, [reader]) || {}
  const { title: bookTitle } = manifest ?? {}

  return (
    <>
      {isQuickMenuOpen && (
        <AppBar
          position="absolute"
          left={0}
          top={0}
          leftElement={
            <Box flex={1}>
              <IconButton
                aria-label="back"
                onClick={() => {
                  if (
                    window.history.state === null &&
                    window.location.pathname !== `/`
                  ) {
                    navigate(`/`)
                  } else {
                    navigate(-1)
                  }
                }}
              >
                <IoMdArrowRoundBack />
              </IconButton>
            </Box>
          }
          rightElement={
            <Stack direction="row" flex={1} justifyContent="flex-end">
              <IconButton
                onClick={() => {
                  isMenuOpenSignal.setValue(true)
                }}
                aria-label="settings"
              >
                <GiHamburgerMenu />
              </IconButton>
            </Stack>
          }
          middleElement={
            <Box overflow="auto" flexGrow={1} textAlign="center">
              {bookTitle}
            </Box>
          }
        />
      )}
      <BottomBar open={isQuickMenuOpen} />
    </>
  )
})
