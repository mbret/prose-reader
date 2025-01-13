import { Text, Box, Image, Icon, Button, Link } from "@chakra-ui/react"
import formatA from "../assets/demo.prose-reader.com_books.png"
import formatB from "../assets/demo.prose-reader.com_books (4).png"
import formatC from "../assets/demo.prose-reader.com_books (5).png"
import { Section, SectionTitle } from "./Section"
import { FaFilePdf } from "react-icons/fa6"
import { TbFileTypeZip } from "react-icons/tb"
import { FaCloud, FaExternalLinkAlt } from "react-icons/fa"

const images = [
  [formatA, "Comics"],
  [formatB, "eBooks"],
  [formatC, "PDF"],
]

export const ReadAnythingSection = () => {
  return (
    <Section>
      <Box
        flexDirection="column"
        display="flex"
        gap={[4, null, 4]}
        alignItems={["flex-start"]}
      >
        <Box flexDirection="column" gap={2} display="flex">
          <SectionTitle>Read any books & formats</SectionTitle>
          <Box display="flex" gap={4} mt={2}>
            <Icon fontSize="2xl" color="red.600">
              <FaFilePdf size="" />
            </Icon>
            <Icon fontSize="2xl">
              <TbFileTypeZip />
            </Icon>
            <Icon fontSize="2xl">
              <FaCloud />
            </Icon>
          </Box>
          <Box flexDirection="column" gap={2} display="flex" mt={2}>
            <Text>
              Prose uses its own standard to know where and what to display. How
              you serve your book is up to you.
            </Text>
            <Text>
              ePubs, PDFs, MOBI, CBZ, CBR, etc. We support them all and we
              provide many helpers to help you implement your own streamer.
            </Text>
          </Box>
          <Button asChild alignSelf="center" mt={2}>
            <Link
              href="https://demo.prose-reader.com/"
              target="_blank"
              unstyled
            >
              Try it on the demo
              <FaExternalLinkAlt />
            </Link>
          </Button>
        </Box>
        <Box
          alignSelf="center"
          display="flex"
          justifyContent="center"
          flexDirection="row"
          width="100%"
          boxShadow="md"
          maxW={600}
          aspectRatio={(300 / 400) * 3}
          position="relative"
        >
          {images.map(([image]) => (
            <Image
              key={image}
              src={image}
              minW={0}
              alt="Example image"
              display="block"
              objectFit="contain"
              flex={1}
              rounded="md"
              opacity={0.7}
            />
          ))}
          <Box
            position="absolute"
            height="100%"
            display="flex"
            top={0}
            left={0}
            right={0}
          >
            {images.map(([, format]) => (
              <Box
                key={format}
                flex={1}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text
                  bgColor="white"
                  border="2px solid black"
                  borderColor="gray.500"
                  rounded="lg"
                  p={1}
                  fontWeight="bold"
                >
                  {format}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
        <Text alignSelf="center">And many more...</Text>
      </Box>
    </Section>
  )
}
