import RcSlider from "rc-slider"
import { type ComponentProps, memo } from "react"
import "rc-slider/assets/index.css"
import { Box, chakra } from "@chakra-ui/react"

const ChakraRcSlider = chakra(RcSlider)

export const ThemedSlider = memo((props: ComponentProps<typeof RcSlider>) => {
  return (
    <Box
      display="contents"
      css={{
        "--bg": "colors.bg",
        "--bg-emphasized": "colors.bg.emphasized",
        "--color-solid": "colors.colorPalette.solid",
      }}
    >
      <ChakraRcSlider
        keyboard={false}
        style={{
          padding: 0,
        }}
        css={{
          "& > .rc-slider-handle:focus-visible": {
            boxShadow: "0 0 0 2px var(--color-solid) !important",
          },
          "& > .rc-slider-handle:active": {
            boxShadow: "0 0 5px var(--color-solid) !important",
          },
          "& > .rc-slider-handle.rc-slider-handle-dragging": {
            boxShadow: "0 0 0 3px var(--color-solid) !important",
          },
        }}
        styles={{
          rail: {
            height: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "var(--bg-emphasized)",
          },
          track: {
            height: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "var(--color-solid)",
          },
          handle: {
            width: "24px",
            height: "24px",
            top: "50%",
            borderColor: "var(--color-solid)",
            transform: `translate(${props.reverse ? "-50%" : "50%"}, -50%)`,
            backgroundColor: "var(--bg)",
            marginTop: "0px",
          },
        }}
        {...props}
      />
    </Box>
  )
})
