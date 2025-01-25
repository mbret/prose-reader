import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineRecipe,
  defineSlotRecipe,
} from "@chakra-ui/react"
import { dialogAnatomy } from "@chakra-ui/react/anatomy"

export const config = defineConfig({
  globalCss: {
    html: {
      // colorPalette: "red",
    },
    button: {
      // colorPalette: "teal",
    },
  },
  theme: {
    slotRecipes: {
      dialog: defineSlotRecipe({
        slots: dialogAnatomy.keys(),
        base: {
          content: {
            // for some reason chakra use 14px now instead of 16 for dialogs
            textStyle: "none",
          },
        },
      }),
    },
    recipes: {
      dialog: defineRecipe({
        base: {
          content: {
            // textStyle: "lg"
          },
        },
      }),
    },
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: {
            value: "{colors.gray.800}",
          },
          muted: { value: "{colors.gray.700}" },
          emphasized: { value: "{colors.gray.600}" },
          // panel: { value: "#2d3748" },
        },
        border: {
          DEFAULT: {
            value: "{colors.gray.700}",
          },
        },
        gray: {
          muted: {
            value: "{colors.gray.700}",
          },
        },
      },
    },
    tokens: {
      colors: {
        red: {
          600: {
            value: "#C53030",
          },
          700: {
            value: "#9B2C2C",
          },
          800: {
            value: "#822727",
          },
          900: {
            value: "#63171B",
          },
        },
        gray: {
          // using old chakra colors https://v2.chakra-ui.com/docs/styled-system/theme
          900: {
            value: "#171923",
          },
          800: {
            value: "#1A202C",
          },
          700: {
            value: "#2D3748",
          },
        },
      },
      fonts: {
        body: {
          value: "Roboto, Roboto Fallback",
        },
      },
    },
  },
})

// console.log(
//   defaultConfig.theme,
//   createSystem(defaultConfig, config)._config.theme,
// )

export default createSystem(defaultConfig, config)
// export default createSystem(defaultConfig)
