import { ArrowBackIcon, CheckCircleIcon } from '@chakra-ui/icons'
import { IconButton, List, ListIcon, ListItem, Text } from '@chakra-ui/react'
import React from 'react'
import { useReader } from './ReaderProvider'
import { useRecoilValue } from 'recoil'
import { currentPageState, manifestState, paginationState } from './state'

export const HelpDialog = ({ onExit }: { onExit: () => void }) => {
  const pagination = useRecoilValue(paginationState)

  let currentSubChapter = pagination?.begin.chapterInfo

  while (currentSubChapter?.subChapter) {
    currentSubChapter = currentSubChapter?.subChapter
  }

  return (
    <div style={{
      position: 'absolute',
      left: 0,
      top: 0,
      height: '100%',
      width: '100%',
      backgroundColor: 'white',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        width: `100%`,
        height: 60,
        backgroundColor: 'chocolate',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 10,
        flex: '0 0 auto'
      }}>
        <div style={{
          // justifySelf: 'flex-start'
        }}>
          <IconButton icon={<ArrowBackIcon />} aria-label="back" onClick={onExit} />
        </div>
        <div>
          <h1 style={{ color: 'white' }}>Help</h1>
        </div>
        <div>
          &nbsp;
        </div>
      </div>
      <List spacing={3} style={{ margin: 20 }}>
        <ListItem>
          <ListIcon color="green.500" />
          You can zoom on images by double clicking on it. Double click again to leave the zoom mode.
        </ListItem>
      </List>
    </div >
  )
}