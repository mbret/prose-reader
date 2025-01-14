import { Link as RouterLink } from "react-router"
import {
  Table,
  Tr,
  Th,
  Thead,
  Tbody,
  Link,
  Td,
  Box,
  Text,
  IconButton,
  Stack,
  Container,
  Heading,
} from "@chakra-ui/react"
import { DeleteIcon } from "@chakra-ui/icons"
import localforage from "localforage"
import { NavigationBreadcrumb } from "./NavigationBreadcrumb"
import { Glossary } from "./Glossary"
import { UploadBook } from "./UploadBook"
import { useUploadedBooks } from "./useUploadedBooks"
import { COMICS, EPUBS, PDFS } from "./constants"
import { BookTable } from "./BookTable"

export const BooksScreen = () => {
  const { data: uploadedBooks, refetch } = useUploadedBooks()

  return (
    <Container maxW="container.sm">
      <Stack py={4}>
        <NavigationBreadcrumb />

        <Heading as="h1" mb={2}>
          Books
        </Heading>

        <Text mb={2}>
          Find here a selection of <b>copyright free</b> books which covers a
          variety of different type of content. Additionally you can upload your
          own book locally to test it.
        </Text>

        <Heading as="h2" size="md">
          Glossary
        </Heading>

        <Glossary />

        <UploadBook />

        <Stack gap={4}>
          <Box borderWidth={[0, `1px`]} borderRadius="lg" margin="auto">
            <Table
              variant="simple"
              size={["sm", "md"]}
              style={{ tableLayout: `fixed` }}
            >
              <Thead>
                <Tr>
                  <Th>My uploaded books</Th>
                  <Th width="30%" textAlign="right">
                    Actions
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {uploadedBooks?.map(({ name, base64Uri }) => (
                  <Tr key={name}>
                    <Td>
                      <Link to={`/reader/${base64Uri}`} as={RouterLink}>
                        {name}
                      </Link>
                    </Td>
                    <Td textAlign="right">
                      <IconButton
                        aria-label="Search database"
                        icon={<DeleteIcon />}
                        onClick={async () => {
                          await localforage.removeItem(name)

                          refetch()
                        }}
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
          <BookTable items={COMICS} title="Comics" />
          <BookTable items={PDFS} title="PDF" />
          <BookTable items={EPUBS} title="Epubs" />
        </Stack>
      </Stack>
    </Container>
  )
}
