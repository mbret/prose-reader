import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

export const config = defineConfig({
  theme: {
    tokens: {
      fonts: {
        body: {
          value: "Roboto, Roboto Fallback",
        },
      },
    },
  },
})

export default createSystem(defaultConfig, config)
