import { Container, Heading } from "@chakra-ui/react"

export const Section = ({ children }: { children: React.ReactNode }) => {
  return (
    <Container maxW="3xl" display="flex" gap={2} flexDirection="column">
      {children}
    </Container>
  )
}

export const SectionTitle = ({ children }: { children: React.ReactNode }) => {
  return (
    <Heading as="h2" size="2xl">
      {children}
    </Heading>
  )
}
