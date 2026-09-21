import { Button, Stack, Text } from "@chakra-ui/react"
import { Component, type ReactNode } from "react"

const ReloadPrompt = () => (
  <Stack
    height="100%"
    alignItems="center"
    justifyContent="center"
    textAlign="center"
    gap={4}
    px={4}
  >
    <Text>This part of the site could not be loaded.</Text>
    <Button onClick={() => window.location.reload()}>Reload</Button>
  </Stack>
)

/**
 * A route loaded with `lazy` fetches a hashed chunk, which a deploy can remove
 * while a tab still holds the document that names it. The import then rejects,
 * and a rejection no boundary catches unmounts the whole app - blanking the
 * landing page along with it. Keeping the boundary inside the lazy route means
 * only that route is lost, and leaving it resets the boundary.
 */
export class LazyRouteBoundary extends Component<
  { children: ReactNode },
  { hasFailed: boolean }
> {
  state = { hasFailed: false }

  static getDerivedStateFromError() {
    return { hasFailed: true }
  }

  componentDidCatch(error: unknown) {
    console.error("Failed to load route", error)
  }

  render() {
    return this.state.hasFailed ? <ReloadPrompt /> : this.props.children
  }
}
