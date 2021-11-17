import React, { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Button as ChakraButton, useBreakpointValue, Table, Tr, Th, Thead, Tbody, Link, Td, Box, Text, IconButton } from "@chakra-ui/react"
import { ArrowBackIcon, DeleteIcon } from '@chakra-ui/icons'
import { useDropzone } from 'react-dropzone'
import localforage from 'localforage'
import { useUploadedBooks } from './useUploadedBooks'

const items = [
  {
    name: `accessible_epub_3.epub`,
    type: `EN - LTR - RFL`
  },
  {
    name: `sous-le-vent.epub`,
    type: `EN - LTR - FXL`
  },
  {
    name: `moby-dick_txt.txt`,
    type: `EN - LTR - TXT`
  },
  {
    name: `mymedia_lite.epub`,
    type: `JP - RTL - RFL`
  },
  {
    name: `haruko-html-jpeg.epub`,
    type: `JP - RTL - FXL(P)`
  },
  {
    name: `regime-anticancer-arabic.epub`,
    type: `AR - RTL - RFL`
  },
  {
    name: `sample.cbz`,
    type: `EN - LTR - FXL`
  },
  {
    name: `cc-shared-culture.epub`,
    type: `EN - LTR - MEDIA`
  },
  {
    name: `Accessibility-Tests-Mathematics.epub`,
    type: `EN - LTR - RFL`
  }
]

export const Home = () => {
  const tableSize = useBreakpointValue({ base: `md`, sm: `md` })
  const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
    accept: `.epub,.txt,.cbz,.cbr,.rar`,
    maxFiles: 1
  })
  const [isUploading, setIsUploading] = useState(false)
  const [lastAddedBook, setLastAddedBook] = useState<string | undefined>()
  const { uploadedBooks, refresh } = useUploadedBooks()

  useEffect(() => {
    const file = acceptedFiles[0]

    if (file) {
      (async () => {
        setIsUploading(true)
        await localforage.setItem(file.name, file)
        setLastAddedBook(file.name)
        refresh()
        setIsUploading(false)
      })()
    }
  }, [acceptedFiles, refresh])

  return (
    <div style={{
      height: `100%`,
      overflow: `auto`
    }}>
      <Box padding={[4]}>
        <RouterLink to="/">
          <ChakraButton leftIcon={<ArrowBackIcon />}>Back to home</ChakraButton>
        </RouterLink>
      </Box>
      <Box maxW={[`auto`, `md`, `lg`]} paddingX={[4, 0]} marginX={[`auto`]}>
        <Box as="p" style={{ alignSelf: 'flex-start' }}>
          <b>LTR</b> = left to right, <b>RTL</b> = right to left
          <br /><b>RFL</b> = fully reflowable
          <br /><b>RFL(P)</b> = partially reflowable
          <br /><b>FXL</b> = fully pre-paginated (fixed layout)
          <br /><b>FXL(P)</b> = partially pre-paginated (fixed layout)
          <br /><b>TXT</b> = .txt file (RFL)
          <br /><b>MEDIA</b> = contains media (audio, video)
        </Box>
        <Box
          borderWidth={1}
          borderStyle="dashed"
          padding={4}
          marginY={6}
          cursor="pointer"
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          {lastAddedBook && (
            <Text>{lastAddedBook} has been added!</Text>
          )}
          {isUploading ? (
            <Text>Uploading...</Text>
          ) : (
            <Text>Click or drag to upload your own book</Text>
          )}
        </Box>
        {/* <Box as="p" paddingY={[2]} style={{ width: `100%`, display: `flex` }}>
          <input type="text" placeholder="Paste your link to epub,cbz,txt,..." style={{ flex: 1, marginRight: 10, padding: 5 }} onChange={e => setCustomUrl(e.target.value)} />
          <button onClick={() => {
            customUrl.length > 0 && navigate(`/classic/reader/${btoa(customUrl)}`)
          }}>open</button>
        </Box> */}
      </Box>
      <Box borderWidth={[0, `1px`]} borderRadius="lg" maxW={[`auto`, `md`, `lg`]} margin="auto" marginBottom={[8]}>
        <Table variant="simple" size={tableSize} style={{ tableLayout: `fixed` }}>
          <Thead>
            <Tr>
              <Th width="70%">My uploaded books</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {uploadedBooks.map(({ name }) => (
              <Tr key={name}>
                <Td ><Link to={`/classic/reader/${btoa(`file://epubs/${name}`)}`} as={RouterLink}>{name}</Link></Td>
                <Td >
                  <IconButton
                    aria-label="Search database"
                    icon={<DeleteIcon />}
                    onClick={async () => {
                      await localforage.removeItem(name)
                      refresh()
                    }}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
      <Box borderWidth={[0, `1px`]} borderRadius="lg" maxW={[`auto`, `md`, `lg`]} margin="auto" marginBottom={[8]}>
        <Table variant="simple" size={tableSize} style={{ tableLayout: `fixed` }}>
          <Thead>
            <Tr>
              <Th width="70%">Name</Th>
              <Th>Type</Th>
            </Tr>
          </Thead>
          <Tbody>
            {items.map(({ name, type }) => (
              <Tr key={name}>
                <Td ><Link to={`/classic/reader/${btoa(`${window.location.origin}/epubs/${name}`)}`} as={RouterLink}>{name}</Link></Td>
                <Td >
                  {type.split(` - `).map((e, i) => (
                    <Text key={i} as="span" mr={2} whiteSpace="nowrap">{e}</Text>
                  ))}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </div>
  )
}