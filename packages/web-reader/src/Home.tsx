import React from 'react'
import { Link } from 'react-router-dom'
import { Button as ChakraButton, Text, Box } from "@chakra-ui/react"
import { ExternalLinkIcon } from "@chakra-ui/icons"

export const Home = () => {
  return (
    <div style={{
      display: `flex`,
      height: `100%`,
    }}>
      <div style={{
        width: `100%`,
        margin: `auto`,
        paddingTop: 10,
        paddingBottom: 10,
        maxWidth: 320,
        display: `flex`,
        flexDirection: `column`,
        alignItems: `center`,
        justifyContent: 'center'
      }}>
        <Box padding={2} textAlign="justify" maxWidth={[`auto`]} marginX={[4]} mb={4}>
          <Text>
            This reader is a demo made with React and use <b>prose</b> to render its content.
            It provides a simple/generic user interface to showcase what <b>prose</b> can do.
            It is optimized to be viewed on mobile.
          </Text>
        </Box>
        <Box borderWidth={1} borderRadius={10} padding={4} maxWidth={[`auto`]} marginX={[4]} mb={4}>
          <Box mb={2}>
            <Link to={`/classic`} style={{ marginBottom: 20 }}>
              <ChakraButton rightIcon={<ExternalLinkIcon />}>Visit the classic reader</ChakraButton>
            </Link>
          </Box>
          <Text>Showcase suitable for any type of content</Text>
        </Box>
        <Box borderWidth={1} borderRadius={10} padding={4} maxWidth={[`auto`]} marginX={[4]} mb={4}>
          <Box mb={2}>
            <Link to={`/comics`} >
              <ChakraButton rightIcon={<ExternalLinkIcon />}>Visit the comic reader</ChakraButton>
            </Link>
          </Box>
          <Text>Showcase suitable for manga services</Text>
        </Box>
      </div>
    </div>
  )
}