import React from 'react'
import { useNavigate } from 'react-router'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { IconButton, Text, Box } from "@chakra-ui/react"
import { ArrowBackIcon, ArrowForwardIcon, SettingsIcon, SearchIcon, HamburgerIcon, QuestionOutlineIcon } from "@chakra-ui/icons"
import { useToggleSettings } from './Settings'
import { useReader } from './ReaderProvider'
import { Scrubber } from './Scrubber'
import { bookTitleState, isComicState, isHelpOpenState, isSearchOpenState, isTocOpenState, manifestState, paginationState } from './state'

export const QuickMenu = ({ open, isComics }: {
  open: boolean,
  isComics: boolean,
}) => {
  const navigate = useNavigate()
  const reader = useReader()
  const bookTitle = useRecoilValue(bookTitleState)
  const manifest = useRecoilValue(manifestState)
  const setIsSearchOpen = useSetRecoilState(isSearchOpenState)
  const setIsTocOpenState = useSetRecoilState(isTocOpenState)
  const setIsHelpOpenState = useSetRecoilState(isHelpOpenState)
  const numberOfSpineItems = manifest?.spineItems.length ?? 0
  const pagination = useRecoilValue(paginationState)
  const [pageIndex, endPageIndex] = [
    (pagination?.begin.pageIndexInChapter || 0) + 1,
    (pagination?.end.pageIndexInChapter || 0) + 1
  ].sort((a, b) => a - b)
  const beginAndEndAreDifferent =
    (pagination?.begin.pageIndexInChapter !== pagination?.end.pageIndexInChapter)
    || (pagination?.begin.readingItemIndex !== pagination?.end.readingItemIndex)
  const hasOnlyOnePage = pagination?.numberOfTotalPages === 1
  const isComic = useRecoilValue(isComicState)
  // theses are mostly webtoon so we don't need pages, it would be weird
  // const shouldHidePages = manifest?.renditionLayout === `reflowable` && manifest.renditionFlow === `scrolled-continuous`
  const shouldHidePages = false
  const currentBeginReadingItemIndex = pagination?.begin.readingItemIndex || 0
  const [absoluteBeginPageIndex = 0, absoluteEndPageIndex = 0] = [pagination?.begin.absolutePageIndex, pagination?.end.absolutePageIndex].sort()
  const toggleSettings = useToggleSettings()

  const buildTitleChain = (chapterInfo: NonNullable<typeof pagination>['begin']['chapterInfo']): string => {
    if (chapterInfo?.subChapter) {
      return `${chapterInfo.title} / ${buildTitleChain(chapterInfo.subChapter)}`
    }
    return chapterInfo?.title || ''
  }

  const chapterTitle = buildTitleChain(pagination?.begin.chapterInfo)

  const onSearchClick = () => {
    setIsSearchOpen(true)
  }

  const onTocClick = () => {
    setIsTocOpenState(true)
  }

  const onHelpClick = () => {
    setIsHelpOpenState(true)
  }

  return (
    <>
      {open && (
        <Box bg="gray.800" style={{
          position: `absolute`,
          left: 0,
          top: 0,
          width: `100%`,
          height: 70,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 10,
          paddingRight: 10,
        }}>
          <div style={{}}>
            <IconButton icon={<ArrowBackIcon />} aria-label="back" onClick={() => {
              if (window.history.state === null && window.location.pathname !== `/`) {
                navigate(`/`)
              } else {
                navigate(-1)
              }
            }} />
          </div>
          <div style={{
            color: 'white',
            overflow: 'hidden',
            paddingLeft: 10,
            paddingRight: 10,
          }}>
            <Text isTruncated={true}>{bookTitle}</Text>
          </div>
          <div style={{
            display: 'flex'
          }}>
            {!isComics && <IconButton icon={<QuestionOutlineIcon />} aria-label="help" onClick={onHelpClick} marginRight={1} />}
            {!isComics && <IconButton icon={<HamburgerIcon />} aria-label="toc" onClick={onTocClick} marginRight={1} />}
            {!isComics && <IconButton icon={<SearchIcon />} aria-label="search" onClick={onSearchClick} marginRight={1} />}
            <IconButton icon={<SettingsIcon />} onClick={toggleSettings} aria-label="settings" />
          </div>
        </Box>
      )}
      {open && (
        <Box bg="gray.800"  style={{
          position: `absolute`,
          left: 0,
          bottom: 0,
          width: `100%`,
          height: 100,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            paddingLeft: 10
          }}>
            {(
              (manifest?.readingDirection === 'ltr' && currentBeginReadingItemIndex > 0)
              || (manifest?.readingDirection !== 'ltr' && (pagination?.begin.readingItemIndex || 0) < numberOfSpineItems - 1)
            ) ? (
              <IconButton icon={<ArrowBackIcon />} aria-label="back" onClick={_ => reader?.goToLeftSpineItem()} />
            )
              : (
                <IconButton icon={<ArrowBackIcon />} aria-label="back" disabled style={{
                  ...hasOnlyOnePage && {
                    opacity: 1
                  }
                }} />
              )}
          </div>
          <div style={{
            width: `100%`,
            paddingLeft: 20,
            paddingRight: 20,
            overflow: 'hidden',
          }}>
            <div style={{
              color: 'white'
            }}>
              {`Progression: ${Math.round((pagination?.percentageEstimateOfBook || 0) * 100)}%`}
            </div>
            <div style={{
              color: 'white',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}>
              {chapterTitle ? `Chapter ${chapterTitle}` : ``}
            </div>
            {!isComic && !hasOnlyOnePage && (
              <div style={{
                color: 'white'
              }}>
                {beginAndEndAreDifferent && (
                  <>{`page ${pageIndex} - ${endPageIndex} of ${pagination?.begin.numberOfPagesInChapter}`}</>
                )}
                {!beginAndEndAreDifferent && (
                  <>{`page ${pageIndex} of ${pagination?.begin.numberOfPagesInChapter}`}</>
                )}
              </div>
            )}
            {isComic && !hasOnlyOnePage && (
              <div style={{
                color: 'white'
              }}>
                {beginAndEndAreDifferent && (
                  <>
                    {`page ${absoluteBeginPageIndex + 1} - ${absoluteEndPageIndex + 1} of ${pagination?.numberOfTotalPages}`}
                  </>
                )}
                {!beginAndEndAreDifferent && (
                  <>
                    {`page ${absoluteBeginPageIndex + 1} of ${pagination?.numberOfTotalPages}`}
                  </>
                )}
              </div>
            )}
            <Scrubber />
          </div>
          <div style={{
            paddingRight: 10
          }}>
            {(
              (manifest?.readingDirection === 'ltr' && (pagination?.end.readingItemIndex || 0) < numberOfSpineItems - 1)
              || (manifest?.readingDirection !== 'ltr' && currentBeginReadingItemIndex > 0)
            ) ? (
              <IconButton icon={<ArrowForwardIcon />} onClick={_ => {
                reader?.goToRightSpineItem()
              }} aria-label="forward" />
            ) : (
              <IconButton icon={<ArrowForwardIcon />} aria-label="forward" disabled style={{
                ...hasOnlyOnePage && {
                  opacity: 1
                }
              }} />
            )}
          </div>
        </Box>
      )}
    </>
  )
}