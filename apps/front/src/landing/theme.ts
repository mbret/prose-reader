import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

/**
 * The landing page's look: the red of the prose mark, warm paper neutrals,
 * Literata for headings like the wordmark, Geist for text and Geist Mono for
 * code. The page is light only, so each semantic token has a single value.
 */
const landingConfig = defineConfig({
  globalCss: {
    html: {
      colorPalette: "brand",
    },
  },
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#FDF4F1" },
          100: { value: "#FCE9E3" },
          200: { value: "#F6D5CA" },
          300: { value: "#F2B4A2" },
          400: { value: "#F08A70" },
          500: { value: "#E5482B" },
          600: { value: "#C2391F" },
          700: { value: "#A83119" },
          800: { value: "#7E2412" },
          900: { value: "#56190C" },
          950: { value: "#360F07" },
        },
        ink: { value: "#1C1A17" },
        paper: { value: "#FBF7EF" },
        sand: {
          50: { value: "#FAF6EF" },
          100: { value: "#F3EEE6" },
          200: { value: "#EFE8DD" },
          300: { value: "#E9E2D7" },
          400: { value: "#E2D9CC" },
          600: { value: "#6F685F" },
          700: { value: "#5E5850" },
        },
      },
      fonts: {
        heading: { value: "'Literata Variable', Georgia, serif" },
        body: {
          value: "'Geist Variable', ui-sans-serif, system-ui, sans-serif",
        },
        mono: { value: "'Geist Mono Variable', ui-monospace, monospace" },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: { value: "{colors.white}" },
          subtle: { value: "{colors.sand.50}" },
          inverted: { value: "{colors.ink}" },
        },
        fg: {
          DEFAULT: { value: "{colors.ink}" },
          muted: { value: "{colors.sand.700}" },
          subtle: { value: "{colors.sand.600}" },
          inverted: { value: "{colors.sand.100}" },
        },
        border: {
          DEFAULT: { value: "{colors.sand.300}" },
          muted: { value: "{colors.sand.200}" },
          emphasized: { value: "{colors.sand.400}" },
        },
        brand: {
          solid: { value: "{colors.brand.600}" },
          contrast: { value: "{colors.white}" },
          fg: { value: "{colors.brand.600}" },
          subtle: { value: "{colors.brand.100}" },
          muted: { value: "{colors.brand.200}" },
          emphasized: { value: "{colors.brand.300}" },
          focusRing: { value: "{colors.brand.600}" },
          border: { value: "{colors.brand.200}" },
        },
      },
    },
  },
})

export const landingSystem = createSystem(defaultConfig, landingConfig)
