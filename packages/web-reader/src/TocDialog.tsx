import { ArrowBackIcon, CheckCircleIcon } from '@chakra-ui/icons'
import { IconButton, List, ListIcon, ListItem, Text, Box, Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import React, { useEffect, useState } from 'react'
import { useReader } from './ReaderProvider'
import { useRecoilValue } from 'recoil'
import { currentPageState, manifestState, paginationState } from './state'

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
      <ModalContent>
        <Box style={{
          // position: 'absolute',
          // left: 0,
          // top: 0,
          // height: '100%',
          // width: '100%',
          // backgroundColor: 'white',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Box bg="gray.800" style={{
            width: `100%`,
            height: 60,
            // backgroundColor: 'chocolate',
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
              <h1 style={{ color: 'white' }}>Table Of Content</h1>
            </div>
            <div>
              &nbsp;
            </div>
          </Box>
          <List spacing={3} style={{ paddingTop: 10, paddingBottom: 10 }} overflowY="scroll" height="100%">
            {nav?.toc.map((tocItem, index) => buildTocForItem(tocItem, index, 0))}
          </List>
        </Box>
      </ModalContent>
    </Modal>
  )
}