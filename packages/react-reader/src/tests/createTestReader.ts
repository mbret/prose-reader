import type { CoreInputSettings, Theme } from "@prose-reader/core"
import { BehaviorSubject } from "rxjs"
import { vi } from "vitest"
import type { PublicContextType } from "../context/context"

type ManagedReaderSettings = Pick<CoreInputSettings, "spreadMode"> & {
  fontScale: number
  theme: Theme
}

const READER_DEFAULT_SETTINGS: ManagedReaderSettings = {
  fontScale: 1,
  spreadMode: `auto`,
  theme: `bright`,
}

/**
 * A reader holding what react-reader's settings read of one: its settings,
 * which start from `settings` over fixed defaults, and whether its book is
 * fully pre-paginated.
 */
export const createTestReader = ({
  settings = {},
  isFullyPrePaginated = false,
}: {
  settings?: Partial<ManagedReaderSettings>
  isFullyPrePaginated?: boolean
} = {}) => {
  const values$ = new BehaviorSubject<ManagedReaderSettings>({
    ...READER_DEFAULT_SETTINGS,
    ...settings,
  })

  return {
    context: { value: { isFullyPrePaginated } },
    settings: {
      defaults: READER_DEFAULT_SETTINGS,
      values$,
      get values() {
        return values$.value
      },
      update: vi.fn(function updateSettings(
        changes: Partial<ManagedReaderSettings>,
      ) {
        values$.next({ ...values$.value, ...changes })
      }),
    },
  }
}

export type TestReader = ReturnType<typeof createTestReader>

export const asProvidedReader = (reader: TestReader | undefined) =>
  // Cast: the fake holds only what react-reader's settings read of a reader,
  // and the provider takes a whole reader.
  reader as unknown as PublicContextType["reader"]
