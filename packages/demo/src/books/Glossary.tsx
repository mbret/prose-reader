import { Stack, Text } from "@chakra-ui/react"
import React from "react"

export const Glossary = () => (
  <Stack gap={0}>
    <Text>
      <b>LTR</b> = left to right, <b>RTL</b> = right to left
    </Text>
    <Text>
      <b>RFL</b> = fully reflowable
    </Text>
    <Text>
      <b>RFL(P)</b> = partially reflowable
    </Text>
    <Text>
      <b>FXL</b> = fully pre-paginated (fixed layout)
    </Text>
    <Text>
      <b>FXL(P)</b> = partially pre-paginated (fixed layout)
    </Text>
    <Text>
      <b>TXT</b> = .txt file (RFL)
    </Text>
    <Text>
      <b>MEDIA</b> = contains media (audio, video)
    </Text>
  </Stack>
)
