import { Container, type ContainerProps } from "@chakra-ui/react"

/**
 * The landing page's column: 1200px of content, with a gutter that grows from
 * 20px on a phone to 48px on a wide screen.
 */
export const PageContainer = (props: ContainerProps) => (
  <Container maxW="81rem" px="clamp(1.25rem, 5vw, 3rem)" {...props} />
)
