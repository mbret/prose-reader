import {
  Box,
  type BoxProps,
  Heading,
  type HeadingProps,
  Text,
  type TextProps,
} from "@chakra-ui/react"
import type { ReactNode } from "react"

export const Eyebrow = (props: TextProps) => (
  <Text
    color="brand.fg"
    fontSize="13px"
    fontWeight="semibold"
    letterSpacing="0.12em"
    textTransform="uppercase"
    {...props}
  />
)

export const SectionTitle = (props: HeadingProps) => (
  <Heading
    as="h2"
    fontSize="clamp(1.875rem, 3.4vw, 2.75rem)"
    fontWeight="semibold"
    lineHeight="1.12"
    letterSpacing="-0.015em"
    textWrap="balance"
    {...props}
  />
)

/**
 * The eyebrow, title and optional lead paragraph a section opens with.
 * `titleId` lets the section name itself with `aria-labelledby`.
 */
export const SectionIntro = ({
  eyebrow,
  title,
  titleId,
  children,
  ...props
}: {
  eyebrow: string
  title: string
  titleId: string
  children?: ReactNode
} & BoxProps) => (
  <Box maxW="760px" {...props}>
    <Eyebrow>{eyebrow}</Eyebrow>
    <SectionTitle id={titleId} mt="3">
      {title}
    </SectionTitle>
    {children !== undefined && (
      <Text
        mt="4"
        maxW="640px"
        color="fg.muted"
        fontSize="lg"
        lineHeight="1.6"
        textWrap="pretty"
      >
        {children}
      </Text>
    )}
  </Box>
)
