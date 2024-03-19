import React from "react"
import { useNavigate } from "react-router"
import { useRecoilValue, useSetRecoilState } from "recoil"
import { IconButton, Box } from "@chakra-ui/react"
import { ArrowBackIcon, ArrowForwardIcon, SettingsIcon, SearchIcon, HamburgerIcon, QuestionOutlineIcon } from "@chakra-ui/icons"
import { Scrubber } from "./Scrubber"
import { bookTitleState, isComicState, isHelpOpenState, isSearchOpenState, isTocOpenState, manifestState } from "./state"
import { AppBar } from "./common/AppBar"
import { useReader } from "./reader/useReader"
import { usePagination } from "./reader/state"

export const QuickMenu = ({
  open,
  isComics,
  onSettingsClick
}: {
  open: boolean
  isComics: boolean
  onSettingsClick?: () => void
}) => {
  const navigate = useNavigate()
  const { reader, reader$ } = useReader()
  const bookTitle = useRecoilValue(bookTitleState)
  const setIsSearchOpen = useSetRecoilState(isSearchOpenState)
  const setIsTocOpenState = useSetRecoilState(isTocOpenState)
  const setIsHelpOpenState = useSetRecoilState(isHelpOpenState)
  const pagination = usePagination(reader$)
  const [pageIndex, endPageIndex] = [
    (pagination?.beginPageIndexInChapter || 0) + 1,
    (pagination?.endPageIndexInChapter || 0) + 1
  ].sort((a, b) => a - b)
  const beginAndEndAreDifferent =
    pagination?.beginPageIndexInChapter !== pagination?.endPageIndexInChapter ||
    pagination?.beginSpineItemIndex !== pagination?.endSpineItemIndex
  const hasOnlyOnePage = pagination?.numberOfTotalPages === 1
  const isComic = useRecoilValue(isComicState)
  // theses are mostly webtoon so we don't need pages, it would be weird
  // const shouldHidePages = manifest?.renditionLayout === `reflowable` && manifest.renditionFlow === `scrolled-continuous`
  const shouldHidePages = false
  const [absoluteBeginPageIndex = 0, absoluteEndPageIndex = 0] = [
    pagination?.beginAbsolutePageIndex,
    pagination?.endAbsolutePageIndex
  ].sort()

  const buildTitleChain = (chapterInfo: NonNullable<typeof pagination>["beginChapterInfo"]): string => {
    if (chapterInfo?.subChapter) {
      return `${chapterInfo.title} / ${buildTitleChain(chapterInfo.subChapter)}`
    }
    return chapterInfo?.title || ""
  }

  const chapterTitle = buildTitleChain(pagination?.beginChapterInfo)

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
        <AppBar
          position="absolute"
          left={0}
          top={0}
          leftElement={
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
          }
          rightElement={
            <div
              style={{
                display: "flex"
              }}
            >
              {!isComics && <IconButton icon={<QuestionOutlineIcon />} aria-label="help" onClick={onHelpClick} marginRight={1} />}
              <IconButton icon={<HamburgerIcon />} aria-label="toc" onClick={onTocClick} marginRight={1} />
              {!isComics && <IconButton icon={<SearchIcon />} aria-label="search" onClick={onSearchClick} marginRight={1} />}
              <IconButton icon={<SettingsIcon />} onClick={onSettingsClick} aria-label="settings" />
            </div>
          }
          middleElement={bookTitle}
        />
      )}
      {open && (
        <AppBar
          position="absolute"
          left={0}
          bottom={0}
          height="auto"
          minHeight={140}
          leftElement={
            <IconButton
              icon={<ArrowBackIcon />}
              aria-label="back"
              onClick={() => reader?.goToLeftSpineItem()}
              isDisabled={!pagination?.canGoLeft}
            />
          }
          rightElement={
            <IconButton
              icon={<ArrowForwardIcon />}
              aria-label="forward"
              isDisabled={!pagination?.canGoRight}
              onClick={(_) => {
                reader?.goToRightSpineItem()
              }}
            />
          }
          middleElement={
            <div
              style={{
                width: `100%`,
                paddingLeft: 20,
                paddingRight: 20,
                overflow: "hidden",
                textAlign: `center`
              }}
            >
              <div
                style={{
                  color: "white"
                }}
              >
                {`Progression: ${Math.round((pagination?.percentageEstimateOfBook || 0) * 100)}%`}
              </div>
              <Box flex={1}>
                <div
                  style={{
                    color: "white",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    overflow: "hidden"
                  }}
                >
                  {chapterTitle ? `Chapter ${chapterTitle}` : ``}
                </div>
              </Box>
              {!isComic && !hasOnlyOnePage && (
                <div
                  style={{
                    color: "white"
                  }}
                >
                  {beginAndEndAreDifferent && (
                    <>{`page ${pageIndex} - ${endPageIndex} of ${pagination?.beginNumberOfPagesInChapter}`}</>
                  )}
                  {!beginAndEndAreDifferent && <>{`page ${pageIndex} of ${pagination?.beginNumberOfPagesInChapter}`}</>}
                </div>
              )}
              {isComic && !hasOnlyOnePage && (
                <div
                  style={{
                    color: "white"
                  }}
                >
                  {beginAndEndAreDifferent && (
                    <>{`page ${absoluteBeginPageIndex + 1} - ${absoluteEndPageIndex + 1} of ${pagination?.numberOfTotalPages}`}</>
                  )}
                  {!beginAndEndAreDifferent && <>{`page ${absoluteBeginPageIndex + 1} of ${pagination?.numberOfTotalPages}`}</>}
                </div>
              )}
              <Box mt={2}>
                <Scrubber />
              </Box>
            </div>
          }
        />
      )}
    </>
  )
}
