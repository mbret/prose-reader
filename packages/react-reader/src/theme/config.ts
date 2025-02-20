import { defineConfig } from "@chakra-ui/react"

export const config = defineConfig({
  theme: {
    semanticTokens: {
      colors: {
        danger: {
          value: { base: "{colors.red}", _dark: "{colors.darkred}" },
        },
      },
    },
  },
})
