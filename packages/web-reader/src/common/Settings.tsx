import React, { FC, useEffect, useState } from 'react'
import RcSlider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { atom, useRecoilCallback } from 'recoil';
import { Reader } from "@prose-reader/core";
import { FormControl, FormHelperText, FormLabel, HStack, Radio, Stack, Checkbox, Box } from '@chakra-ui/react';
import screenfull from 'screenfull'

export const Settings: FC<{ open: boolean, onExit: () => void }> = ({ open, children, onExit }) => {
  const [isFullscreen, setIsFullScreen] = useState(screenfull.isFullscreen)

  useEffect(() => {
    if (screenfull.isEnabled) {
      const cb = () => {
        setIsFullScreen(screenfull.isFullscreen)
      }

      screenfull.on('change', cb);

      return () => {
        screenfull.off(`change`, cb)
      }
    }
  }, [])

  if (!open) return null

  return (
    <Box style={{
      height: `100%`,
      width: `100%`,
      position: 'absolute',
      backgroundColor: `rgb(0, 0, 0, 0.5)`,
      left: 0,
      top: 0,
      // overflow: 'hidden'
    }} >
      <Box style={{
        position: 'absolute',
        height: `100%`,
        width: `100%`,
        left: 0,
        top: 0,
      }} onClick={onExit} />
      <Box bg="gray.800" padding={4} style={{
        height: `40%`,
        width: `100%`,
        position: 'absolute',
        bottom: 0,
        overflow: 'auto',
      }}>
        {children}
      </Box>
    </Box>
  )
}