import { Box, Link, Table, Text } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router"

export const BookTable = ({
  items,
  title,
}: {
  title: string
  items: { name: string; link: string; type: string }[]
}) => (
  <Box borderWidth={[0, `1px`]} borderRadius="lg" margin="auto">
    <Table.Root
      variant="outline"
      size={["sm", "md"]}
      style={{ tableLayout: `fixed` }}
      borderRadius={5}
    >
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader width="70%">{title}</Table.ColumnHeader>
          <Table.ColumnHeader />
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {items.map(({ name, link, type }) => (
          <Table.Row key={name}>
            <Table.Cell>
              <Link asChild>
                <RouterLink to={link}>{name}</RouterLink>
              </Link>
            </Table.Cell>
            <Table.Cell textAlign="right">
              {type.split(` - `).map((e, i) => (
                <Text key={i} as="span" mr={2} whiteSpace="nowrap">
                  {e}
                </Text>
              ))}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  </Box>
)
