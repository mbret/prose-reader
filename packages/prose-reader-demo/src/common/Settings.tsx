import React, { FC, useEffect, useState } from "react"
import RcSlider from "rc-slider"
import "rc-slider/assets/index.css"
import { atom, useRecoilCallback } from "recoil"
import { Reader } from "@prose-reader/core"
import { FormControl, FormHelperText, FormLabel, HStack, Radio, Stack, Checkbox, Box } from "@chakra-ui/react"
import screenfull from "screenfull"

export const Settings: FC<{ open: boolean; onExit: () => void; children: React.ReactNode }> = ({ open, children, onExit }) => {
  const [isFullscreen, setIsFullScreen] = useState(screenfull.isFullscreen)

  useEffect(() => {
    if (screenfull.isEnabled) {
      const cb = () => {
        setIsFullScreen(screenfull.isFullscreen)
      }

      screenfull.on("change", cb)

      return () => {
        screenfull.off(`change`, cb)
      }
    }
  }, [])

  if (!open) return null

  return (
    <Box
      style={{
        height: `100%`,
        width: `100%`,
        position: "absolute",
        backgroundColor: `rgb(0, 0, 0, 0.5)`,
        left: 0,
        top: 0
        // overflow: 'hidden'
      }}
    >
      <Box
        style={{
          position: "absolute",
          height: `100%`,
          width: `100%`,
          left: 0,
          top: 0
        }}
        onClick={onExit}
      />
      <Box
        bg="gray.800"
        padding={4}
        style={{
          height: `40%`,
          width: `100%`,
          position: "absolute",
          bottom: 0,
          overflow: "auto"
        }}
      >
        <FormControl as="fieldset" mb={4}>
          <Box padding={2} borderWidth={1} borderRadius={10} display="flex" flexDirection="row" alignItems="center">
            <Stack>
              <Checkbox
                isChecked={isFullscreen}
                defaultChecked={false}
                onChange={async (e) => {
                  if (screenfull.isEnabled) {
                    if (e.target.checked) {
                      await screenfull.request()
                    } else {
                      await screenfull.exit()
                    }
                  }
                }}
              >
                Use full screen
              </Checkbox>
            </Stack>
          </Box>
        </FormControl>
        {children}
      </Box>
    </Box>
  )
}
