import React, { FC, useState } from 'react'
import RcSlider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { atom, useRecoilCallback } from 'recoil';
import { Reader } from "@prose-reader/core";
import { FormControl, FormHelperText, FormLabel, HStack, Radio, RadioGroup, Box } from '@chakra-ui/react';

export const Settings: FC<{ open: boolean, onExit: () => void }> = ({ open, children, onExit }) => {

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