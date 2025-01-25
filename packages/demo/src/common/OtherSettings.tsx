import {  Fieldset, Stack } from "@chakra-ui/react"
import { useReaderSettings } from "./useReaderSettings"
import { useReader } from "../reader/useReader"
import { Field } from "../components/ui/field"
import {
  NumberInputField,
  NumberInputRoot,
} from "../components/ui/number-input"

export const OtherSettings = () => {
  const settings = useReaderSettings()
  const { reader } = useReader()

  return (
    <Fieldset.Root>
      <Stack>
        <Fieldset.Legend>Other</Fieldset.Legend>
      </Stack>

      <Fieldset.Content>
        <Field
          label="Number of adjacent spine items to pre-load"
          helperText={`Help smoother the transition between pages and prevent blank (loading) page when turning. Note that pre-loading more page increase memory and CPU consumption`}
        >
          <NumberInputRoot
            value={(
              settings?.numberOfAdjacentSpineItemToPreLoad ?? 0
            ).toString()}
            onValueChange={(event) => {
              reader?.settings.update({
                numberOfAdjacentSpineItemToPreLoad: event.valueAsNumber,
              })
            }}
          >
            <NumberInputField />
          </NumberInputRoot>
        </Field>
      </Fieldset.Content>
    </Fieldset.Root>
  )
}
