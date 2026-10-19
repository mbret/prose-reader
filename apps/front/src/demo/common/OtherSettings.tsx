import { Fieldset } from "@chakra-ui/react"
import { Field } from "../components/ui/field"
import {
  NumberInputField,
  NumberInputRoot,
} from "../components/ui/number-input"
import { useReaderSettings } from "../reader/settings/useReaderSettings"
import { useReader } from "../reader/useReader"

export const OtherSettings = () => {
  const settings = useReaderSettings()
  const { reader } = useReader()

  return (
    <Fieldset.Root>
      <Fieldset.Legend>Performance</Fieldset.Legend>
      <Fieldset.Content>
        <Field
          label="Number of adjacent spine items to pre-load"
          helperText={`Help make the transition smoother between pages and prevent blank (loading) page when turning. Note that pre-loading more page increase memory and CPU consumption`}
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
