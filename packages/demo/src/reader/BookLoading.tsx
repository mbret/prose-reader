import { Stack, Text } from "@chakra-ui/react"

export const BookLoading = () => {
  return (
    <Stack
      style={{
        height: "100%",
        width: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "center",
      }}
      color="black"
    >
      <Text fontSize="1xl">Loading book</Text>
    </Stack>
  )
}
