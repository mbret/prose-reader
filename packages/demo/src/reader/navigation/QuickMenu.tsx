import React, { memo } from "react"
import { useNavigate } from "react-router"
import { Box, IconButton, Stack } from "@chakra-ui/react"
import { ArrowBackIcon, HamburgerIcon } from "@chakra-ui/icons"
import { AppBar } from "../../common/AppBar"
import { useReader } from "../useReader"
import { useObserve, useSignalValue } from "reactjrx"
import { BottomMenu } from "./BottomMenu"
import { isMenuOpenSignal } from "./Menu"
import { isQuickMenuOpenSignal } from "../states"

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
                icon={<ArrowBackIcon />}
                aria-label="back"
                onClick={() => {
                  if (window.history.state === null && window.location.pathname !== `/`) {
                    navigate(`/`)
                  } else {
                    navigate(-1)
                  }
                }}
              />
            </Box>
          }
          rightElement={
            <Stack direction="row" flex={1} justifyContent="flex-end">
              <IconButton
                icon={<HamburgerIcon />}
                onClick={() => {
                  isMenuOpenSignal.setValue(true)
                }}
                aria-label="settings"
              />
            </Stack>
          }
          middleElement={
            <Box overflow="auto" flexGrow={1} textAlign="center">
              {bookTitle}
            </Box>
          }
        />
      )}
      <BottomMenu open={isQuickMenuOpen} />
    </>
  )
})
