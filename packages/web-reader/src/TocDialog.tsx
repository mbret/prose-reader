import { ArrowBackIcon, CheckCircleIcon } from '@chakra-ui/icons'
import { IconButton, List, ListIcon, ListItem, Text, Box, Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import React, { useEffect, useState } from 'react'
import { useReader } from './ReaderProvider'
import { useRecoilValue } from 'recoil'
import { currentPageState, manifestState, paginationState } from './state'
import { AppBar } from './common/AppBar'

export const TocDialog = ({ onExit, isOpen }: { onExit: () => void, isOpen: boolean }) => {
  const reader = useReader()
  const { nav } = useRecoilValue(manifestState) || {}
  const pagination = useRecoilValue(paginationState)
  const toc = nav?.toc || []
  const currentPage = useRecoilValue(currentPageState) || 0
  const [currentSubChapter, setCurrentSubChapter] = useState<NonNullable<typeof pagination>['begin']['chapterInfo'] | undefined>()

  const buildTocForItem = (tocItem: typeof toc[number], index: number, lvl: number) => (
    <React.Fragment key={index}>
      <ListItem
        style={{
          paddingLeft: 10 + (lvl * 20),
          display: 'flex',
          alignItems: 'center'
        }}
        onClick={() => {
          onExit()
          reader?.goToUrl(tocItem.href)
        }}
      >
        {currentSubChapter?.path === tocItem.path && <ListIcon as={CheckCircleIcon} />}
        {currentSubChapter?.path !== tocItem.path && <ListIcon as={CheckCircleIcon} style={{ visibility: 'hidden' }} />}
        <div>
          {tocItem.title || 'unknown'}
          {currentSubChapter?.path === tocItem.path && (
            <>
              <br /> <Text style={{ fontSize: `0.8rem`, color: `rgba(0, 0, 0, 0.54)` }}>{`Currently on page ${currentPage + 1}`}</Text>
            </>
          )}
        </div>
      </ListItem>
      {tocItem.contents.length > 0 && (
        <List component="div" spacing={2}>
          {tocItem.contents.map((tocItem, index) => buildTocForItem(tocItem, index, lvl + 1))}
        </List>
      )}
    </React.Fragment>
  )

  useEffect(() => {
    if (isOpen) {
      let currentSubChapter = pagination?.begin.chapterInfo

      while (currentSubChapter?.subChapter) {
        currentSubChapter = currentSubChapter?.subChapter
      }

      setCurrentSubChapter(currentSubChapter)
    } else {
      setCurrentSubChapter(undefined)
    }
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} size="full" autoFocus={false} onClose={onExit}>
      <ModalOverlay />
      <ModalContent height="100%">
        <Box style={{
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <AppBar
            leftElement={<IconButton icon={<ArrowBackIcon />} aria-label="back" onClick={onExit} />}
            middleElement="Table Of Content"
          />
          <List spacing={3} style={{ paddingTop: 10, paddingBottom: 10 }} overflowY="scroll" height="100%">
            {nav?.toc.map((tocItem, index) => buildTocForItem(tocItem, index, 0))}
          </List>
        </Box>
      </ModalContent>
    </Modal>
  )
}