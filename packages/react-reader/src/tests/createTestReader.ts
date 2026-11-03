import { BehaviorSubject } from "rxjs"
import { vi } from "vitest"
import type { PublicContextType } from "../context/context"
import type { ManagedSettingValues } from "../settings/managedSettings"

const READER_DEFAULT_SETTINGS: ManagedSettingValues = {
  fontScale: 1,
  spreadMode: `auto`,
  theme: `bright`,
}

let nextTestReaderId = 0

/**
 * A reader holding what react-reader reads of one to keep it on its settings
 * and mount it. Its settings start from `settings` over fixed defaults, its
 * `mount` and `destroy` behave like core's, and `mounts` records each mount
 * with the settings the reader held then.
 */
export const createTestReader = ({
  settings = {},
}: {
  settings?: Partial<ManagedSettingValues>
} = {}) => {
  const values$ = new BehaviorSubject<ManagedSettingValues>({
    ...READER_DEFAULT_SETTINGS,
    ...settings,
  })
  const contextValue: { rootElement?: HTMLElement } = {}
  const context = { value: contextValue, isDestroyed: false }
  const mounts: { element: HTMLElement; settings: ManagedSettingValues }[] = []

  return {
    id: `test-reader-${nextTestReaderId++}`,
    context,
    mounts,
    settings: {
      values$,
      get values() {
        return values$.value
      },
      update: vi.fn(function updateSettings(
        changes: Partial<ManagedSettingValues>,
      ) {
        values$.next({ ...values$.value, ...changes })
      }),
    },
    mount: vi.fn(function mountLikeCore(element: HTMLElement) {
      if (context.isDestroyed) throw new Error(`This reader is destroyed.`)

      if (contextValue.rootElement) {
        throw new Error(`This reader is already mounted.`)
      }

      contextValue.rootElement = element
      mounts.push({ element, settings: values$.value })
    }),
    destroy: vi.fn(function destroyLikeCore() {
      context.isDestroyed = true
    }),
  }
}

export type TestReader = ReturnType<typeof createTestReader>

export const asProvidedReader = (reader: TestReader | undefined) =>
  // Cast: the fake holds only what react-reader reads of a reader to keep it
  // on its settings and mount it, and the provider takes a whole reader.
  reader as unknown as PublicContextType["reader"]
