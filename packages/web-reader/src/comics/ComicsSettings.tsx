import React from 'react'
import { Reader } from "@prose-reader/core";
import { Settings } from '../common/Settings';
import { NavigationSettings } from '../common/NavigationSettings';

export const ComicsSettings = ({ reader, open, onExit }: { reader: Reader, open: boolean, onExit: () => void }) => {

  if (!open) return null

  return (
    <Settings open onExit={onExit}>
      <NavigationSettings reader={reader} />
    </Settings>
  )
}