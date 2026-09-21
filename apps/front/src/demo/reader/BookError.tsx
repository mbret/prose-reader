import { Box, Text } from "@chakra-ui/react"

export const BookError = ({ url }: { url: string }) => {
  return (
    <Box
      p={4}
      style={{
        height: "100%",
        width: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: `column`,
        textAlign: `center`,
        color: "black",
      }}
    >
      <Text wordBreak="break-word">Unable to load your book {url}</Text>
      <Text>
        Make sure to have CORS enabled if you are linking to an external
        resource
      </Text>
    </Box>
  )
}
