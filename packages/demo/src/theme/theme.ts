import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

export const config = defineConfig({
  globalCss: {
    html: {
      colorPalette: "red",
    },
    button: {
      // colorPalette: "teal",
    }
  },
  theme: {
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: {
            value: "{colors.gray.900}",
          },
          muted: { value: "{colors.gray.800}" },


          // solid: { value: "{colors.gray.500}" },
          // contrast: { value: "{colors.gray.100}" },
          // fg: { value: "{colors.gray.700}" },
          // subtle: { value: "{colors.gray.200}" },
          // emphasized: { value: "{colors.gray.300}" },
          // focusRing: { value: "{colors.gray.500}" },
        },
        border: {
          DEFAULT: {
            value: "{colors.gray.700}",
          },
        },
      },
    },
    tokens: {
      colors: {},
      fonts: {
        body: {
          value: "Roboto, Roboto Fallback",
        },
      },
    },
  },
})

export default createSystem(defaultConfig, config);