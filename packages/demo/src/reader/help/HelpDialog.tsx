import { List } from "@chakra-ui/react"
import { LuCircleCheck } from "react-icons/lu"

export const HelpMenu = () => {
  return (
    <List.Root gap={3} variant="plain">
      <List.Item>
        <List.Indicator asChild color="green.500">
          <LuCircleCheck />
        </List.Indicator>
        Pinch to zoom on images.
      </List.Item>
    </List.Root>
  )
}
