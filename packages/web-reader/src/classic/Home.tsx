import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { Link as RouterLink } from 'react-router-dom'
import { Button as ChakraButton, useBreakpointValue, Table, Tr, Th, Thead, Tbody, Link, Td, Tfoot, Box, TableContainer } from "@chakra-ui/react"
import { ArrowBackIcon, LinkIcon } from '@chakra-ui/icons'

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
    type: `EN - RTL - RFL`
  }
]

export const Home = () => {
  const [customUrl, setCustomUrl] = useState('')
  const navigate = useNavigate()
  const tableSize = useBreakpointValue({ base: `md`, sm: `md` })

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
      <Box maxW={[`auto`, `md`, `lg`]} paddingX={[4, 0]} marginX={[`auto`]} mb={[4]}>
        <Box as="p" style={{ alignSelf: 'flex-start' }}>
          <b>LTR</b> = left to right, <b>RTL</b> = right to left
          <br /><b>RFL</b> = fully reflowable
          <br /><b>RFL(P)</b> = partially reflowable
          <br /><b>FXL</b> = fully pre-paginated (fixed layout)
          <br /><b>FXL(P)</b> = partially pre-paginated (fixed layout)
          <br /><b>TXT</b> = .txt file (RFL)
          <br /><b>MEDIA</b> = contains media (audio, video)
        </Box>
        <Box as="p" paddingY={[2]} style={{ width: `100%`, display: `flex` }}>
          <input type="text" placeholder="Paste your link to epub,cbz,txt,..." style={{ flex: 1, marginRight: 10, padding: 5 }} onChange={e => setCustomUrl(e.target.value)} />
          <button onClick={() => {
            customUrl.length > 0 && navigate(`/classic/reader/${btoa(customUrl)}`)
          }}>open</button>
        </Box>
      </Box>
      <Box borderWidth={[0, `1px`]} borderRadius="lg" maxW={[`auto`, `md`, `lg`]} margin="auto" marginBottom={[8]}>
        <Table variant="simple" size={tableSize}>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Type</Th>
            </Tr>
          </Thead>
          <Tbody>
            {items.map(({ name, type }) => (
              <Tr key={name}>
                <Td><Link to={`/classic/reader/${btoa(`${window.location.origin}/epubs/${name}`)}`} as={RouterLink}>{name}</Link></Td>
                <Td><Link to={`/classic/reader/${btoa(`${window.location.origin}/epubs/${name}`)}`} as={RouterLink}>{type}</Link></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </div>
  )
}