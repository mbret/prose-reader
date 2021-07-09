import { ArrowBackIcon } from '@chakra-ui/icons'
import { Heading, IconButton, Input, Text } from '@chakra-ui/react'
import React, { useCallback, useEffect, useState } from 'react'
import { tap } from 'rxjs/operators'
import { SearchResult } from '@oboku/reader-enhancer-search'
import { useReader } from './ReaderProvider'
import { groupBy } from '@oboku/reader'

export const SearchDialog = ({ onExit }: { onExit: () => void }) => {
  const [text, setText] = useState('te')
  const [results, setResults] = useState<SearchResult>([])
  const [searching, setSearching] = useState(false)
  const reader = useReader()

  const onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
    reader?.search.search(e.target.value)
  }

  const onClick = useCallback((cfi: string) => {
    onExit()
    reader?.goToCfi(cfi)
  }, [reader])

  useEffect(() => {
    const $ = reader?.search.$.search$
      .pipe(
        tap((event) => {
          if (event.type === 'start') {
            setResults([])
            setSearching(true)
          }
          if (event.type === 'end') {
            setResults(event.data)
            setSearching(false)
          }
        })
      )
      .subscribe()

    return () => {
      $?.unsubscribe()
    }
  }, [reader])

  const groupedResults = groupBy(results, item => item.spineItemIndex)

  // console.log(results)

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
          <h1 style={{ color: 'white' }}>Search</h1>
        </div>
        <div>
          &nbsp;
        </div>
      </div>
      <div style={{
        flex: '0 0 auto'
      }}>
        <Input placeholder="Basic usage" value={text} onChange={onValueChange} />
      </div>
      <div style={{ marginTop: 10, paddingLeft: 5, paddingRight: 5, overflow: 'hidden', overflowY: 'scroll' }}>
        {searching && (
          <Text>Searching ...</Text>
        )}
        {!searching && results.length === 0 && (
          <p>There are no results</p>
        )}
        {!searching && results.length >= 0 && (
          <>
            {Object.values(groupedResults).map((itemResults, i) => (
              <React.Fragment key={i}>
                <div style={{
                  backgroundColor: 'antiquewhite'
                }}>
                  <Heading as="h2" size="sm">Chapter {(itemResults[0]?.spineItemIndex || 0) + 1}</Heading>
                </div>
                <Text fontSize="md">{itemResults.length} result(s)</Text>
                {itemResults.map((result, j) => (
                  <Item
                    key={j}
                    contextText={result.contextText}
                    pageIndex={result.pageIndex}
                    startOffset={result.startOffset}
                    text={text}
                    cfi={result.startCfi}
                    onClick={onClick}
                  />
                ))}
              </React.Fragment>
            )
            )}
          </>
        )}
      </div>
    </div>
  )
}

const Item = ({ pageIndex, contextText, startOffset, text, cfi, onClick }: { pageIndex: number | undefined, contextText: string, startOffset: number, text: string, cfi: string, onClick: (cfi: string) => void }) => {
  const reader = useReader()
  const charsAroundText = 15
  const before = contextText.substring(Math.max(startOffset - charsAroundText, 0), Math.max(startOffset, 0))
  const after = contextText.substring(
    Math.min(
      startOffset + text.length,
      contextText.length - 1
    ),
    Math.min(
      startOffset + text.length + charsAroundText,
      contextText.length - 1
    )
  )

  return (
    <div style={{ margin: 5, overflow: 'hidden' }} onClick={() => onClick(cfi)}>
      <Text color="gray.500" isTruncated as="cite" style={{ display: 'block' }}>"{before}<b>{text}</b>{after}"</Text>
      {pageIndex !== undefined && (
        <Text>Page: {(pageIndex || 0) + 1}</Text>
      )}
      {pageIndex === undefined && (
        <Text size="xs">Chapter not loaded, click to navigate</Text>
      )}
    </div>
  )
}