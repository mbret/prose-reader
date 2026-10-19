import { Box, Image, Text } from "@chakra-ui/react"
import obokuReader from "../assets/oboku-reader.webp"
import { ArrowLink } from "../components/ArrowLink"
import { PageContainer } from "../components/PageContainer"
import { Eyebrow, SectionTitle } from "../components/SectionHeading"
import { links } from "../links"

export const BuiltWithProse = () => (
  <PageContainer
    as="section"
    aria-labelledby="built-with-prose-title"
    display="grid"
    gridTemplateColumns={{
      base: "minmax(0, 1fr)",
      lg: "repeat(2, minmax(0, 1fr))",
    }}
    alignItems="center"
    gap="clamp(2rem, 5vw, 4rem)"
    py="clamp(3.5rem, 8vw, 6.5rem)"
  >
    <Box>
      <Eyebrow>Built with prose</Eyebrow>
      <SectionTitle id="built-with-prose-title" mt="3">
        oboku, a whole reading app on prose
      </SectionTitle>
      <Text
        mt="4"
        maxW="520px"
        color="fg.muted"
        fontSize="lg"
        lineHeight="1.6"
        textWrap="pretty"
      >
        oboku is a free, open-source ebook and comic reader that syncs your
        library from the cloud drive or server you already use. Its reader is
        built on prose, EPUB, comics and PDF included.
      </Text>
      <ArrowLink href={links.oboku} mt="4">
        Visit oboku
      </ArrowLink>
    </Box>
    <Box as="figure">
      <Image
        src={obokuReader}
        alt="oboku's library and its comic reader, rendered by prose"
        htmlWidth={1316}
        htmlHeight={1161}
        loading="lazy"
        w="full"
        h="auto"
      />
    </Box>
  </PageContainer>
)
