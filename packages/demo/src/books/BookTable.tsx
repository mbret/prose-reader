import {
  Box,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Link,
  Text,
} from "@chakra-ui/react"
import React from "react"
import { Link as RouterLink } from "react-router-dom"

export const BookTable = ({
  items,
  title,
}: {
  title: string
  items: { name: string; link: string; type: string }[]
}) => (
  <Box borderWidth={[0, `1px`]} borderRadius="lg" margin="auto">
    <Table
      variant="simple"
      size={["sm", "md"]}
      style={{ tableLayout: `fixed` }}
    >
      <Thead>
        <Tr>
          <Th width="70%">{title}</Th>
          <Th></Th>
        </Tr>
      </Thead>
      <Tbody>
        {items.map(({ name, link, type }) => (
          <Tr key={name}>
            <Td>
              <Link to={link} as={RouterLink}>
                {name}
              </Link>
            </Td>
            <Td textAlign="right">
              {type.split(` - `).map((e, i) => (
                <Text key={i} as="span" mr={2} whiteSpace="nowrap">
                  {e}
                </Text>
              ))}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  </Box>
)
