import {
  Box,
  Heading,
  Link,
  type LinkProps,
  SimpleGrid,
  Text,
} from "@chakra-ui/react"
import type { ReactNode } from "react"
import { PageContainer } from "../components/PageContainer"
import { SectionIntro } from "../components/SectionHeading"
import { links } from "../links"

const AnswerLink = (props: LinkProps) => (
  <Link
    color="brand.fg"
    fontWeight="medium"
    textDecoration="underline"
    {...props}
  />
)

const questions: { question: string; answer: ReactNode }[] = [
  {
    question: "Is prose free?",
    answer:
      "Yes. prose is open source under the MIT license, so you can also use it in commercial products.",
  },
  {
    question: "Which formats can it read?",
    answer:
      "Any format. EPUB 3, comics in CBZ or CBR, PDF, plain text and audiobooks are ready to use, and you can extend it to more.",
  },
  {
    question: "Do I need a server?",
    answer:
      "No. A book can open entirely in the browser, from a file the user picks or downloads, or be served by your own server. The reader asks for a manifest and the resources it lists, and you decide where each one comes from.",
  },
  {
    question: "Can I protect books with DRM?",
    answer: (
      <>
        prose ships no DRM of its own yet. The reader asks for a book one
        resource at a time, so your server or service worker can check access
        and decrypt each one before the reader gets it. PDF is the exception:
        pdf.js needs the whole file in the page. A more native DRM integration
        is in the works: tell us on{" "}
        <AnswerLink href={links.discord}>Discord</AnswerLink> if you are
        interested.
      </>
    ),
  },
  {
    question: "Does it work with React or React Native?",
    answer:
      "Yes. The core is plain TypeScript, there is a React reader package, and React Native runs the engine through a WebView bridge.",
  },
  {
    question: "How does it compare with epub.js or foliate-js?",
    answer: (
      <>
        The documentation compares them on its{" "}
        <AnswerLink href={links.alternatives}>Alternatives</AnswerLink> page.
      </>
    ),
  },
  {
    question: "Can I start from the demo?",
    answer:
      "Yes. The demo is open source, built with React and Chakra UI, and you can copy as much of it as you like.",
  },
  {
    question: "Where can I get help?",
    answer: (
      <>
        Ask on <AnswerLink href={links.discord}>Discord</AnswerLink>, or open an
        issue on <AnswerLink href={links.githubIssues}>GitHub</AnswerLink>.
      </>
    ),
  },
]

export const Faq = () => (
  <Box
    as="section"
    aria-labelledby="faq-title"
    borderBlockWidth="1px"
    borderColor="border.muted"
    bg="bg.subtle"
  >
    <PageContainer py="clamp(3.5rem, 8vw, 6.5rem)">
      <SectionIntro
        eyebrow="FAQ"
        title="Frequently asked questions"
        titleId="faq-title"
      />
      <SimpleGrid
        columns={{ base: 1, md: 2 }}
        columnGap="16"
        rowGap="9"
        mt="12"
      >
        {questions.map(({ question, answer }) => (
          <Box key={question}>
            <Heading as="h3" fontFamily="body" fontSize="lg">
              {question}
            </Heading>
            <Text mt="2.5" color="fg.muted" lineHeight="1.6">
              {answer}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </PageContainer>
  </Box>
)
