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
      "EPUB 3, comics in CBZ or CBR, PDF, plain text and audiobooks. Enhancers can teach it new formats.",
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
