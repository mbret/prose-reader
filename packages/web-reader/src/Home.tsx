import React from 'react'
import { Link } from 'react-router-dom'
import { Button as ChakraButton, Text } from "@chakra-ui/react"
import { ExternalLinkIcon } from "@chakra-ui/icons"

export const Home = () => {
  return (
    <div style={{
      display: `flex`,
      height: `100%`,
    }}>
      <div style={{
        // height: `100%`,
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
        <div style={{
          border: `2px solid red`,
          // backgroundColor: `#f7e5e5`,
          padding: 10,
          borderRadius: 10,
          marginBottom: 10,
          width: `100%`,
        }}>
          <Text>
            This reader is a demo made with React and use <b>oboku-reader</b> to render its content. 
            It provides a simple/generic user interface to showcase what <b>oboku-reader</b> can do.
            It is optimized to be viewed on mobile.
          </Text>
        </div>
        <div style={{
          border: `2px solid #0066ff`,
          // backgroundColor: `#f7e5e5`,
          padding: 10,
          borderRadius: 10,
          marginBottom: 10,
          width: `100%`,
        }}>
          <Link to={`/classic`} style={{ marginBottom: 20 }}>
            <ChakraButton rightIcon={<ExternalLinkIcon />}>Visit the classic reader</ChakraButton>
          </Link>
          <Text>Showcase suitable for any type of content</Text>
        </div>
        <div style={{
          border: `2px solid #0066ff`,
          // backgroundColor: `#f7e5e5`,
          padding: 10,
          borderRadius: 10,
          width: `100%`,
        }}>
          <Link to={`/comics`} >
            <ChakraButton rightIcon={<ExternalLinkIcon />}>Visit the comic reader</ChakraButton>
          </Link>
          <Text>Showcase suitable for manga services</Text>
        </div>
      </div>
    </div>
  )
}