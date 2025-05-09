import {
  Link as ChakraLink,
  Container,
  Heading,
  IconButton,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react"
import localforage from "localforage"
import { MdDelete } from "react-icons/md"
import { Link } from "react-router"
import { BookTable } from "./BookTable"
import { Glossary } from "./Glossary"
import { NavigationBreadcrumb } from "./NavigationBreadcrumb"
import { UploadBook } from "./UploadBook"
import { COMICS, EPUBS, PDFS } from "./constants"
import { useUploadedBooks } from "./useUploadedBooks"

export const BooksScreen = () => {
  const { data: uploadedBooks, refetch } = useUploadedBooks()

  return (
    <Container maxW="2xl" py={4} display="flex" flexDirection="column">
      <NavigationBreadcrumb />

      <Heading as="h1" size="4xl" mb={2} mt={2}>
        Books
      </Heading>

      <Text mb={2}>
        Find here a selection of <b>copyright free</b> books which covers a
        variety of different type of content. Additionally you can upload your
        own book locally to test it.
      </Text>

      <Heading as="h2" size="xl">
        Glossary
      </Heading>

      <Glossary />

      <UploadBook />

      <Stack gap={4}>
        <Table.Root
          variant="outline"
          style={{ tableLayout: `fixed` }}
          borderRadius={5}
        >
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>My uploaded books</Table.ColumnHeader>
              <Table.ColumnHeader width="30%" textAlign="right">
                Actions
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {uploadedBooks?.map(({ name, base64Uri }) => (
              <Table.Row key={name}>
                <Table.Cell>
                  <ChakraLink asChild>
                    <Link to={`/reader/${base64Uri}`}>{name}</Link>
                  </ChakraLink>
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <IconButton
                    variant="outline"
                    aria-label="Remove"
                    onClick={async () => {
                      await localforage.removeItem(name)

                      refetch()
                    }}
                  >
                    <MdDelete />
                  </IconButton>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
        <BookTable items={COMICS} title="Comics" />
        <BookTable items={PDFS} title="PDF" />
        <BookTable items={EPUBS} title="Epubs" />
      </Stack>
    </Container>
  )
}
