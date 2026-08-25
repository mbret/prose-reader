import {
  catalogIdentifierValue,
  type KnownMetadataIdentifierScheme,
  type MetadataIdentifier,
} from "@prose-reader/archive-reader"
import type { FetchMetadataInput } from "../../types/fetchMetadataInput.ts"

export const PROJECT_GUTENBERG_IDENTIFIER_SCHEME =
  "ProjectGutenberg" satisfies KnownMetadataIdentifierScheme

export type ProjectGutenbergLookup = {
  readonly id: string
  /** The book's exact identifier spelling, echoed only after PG confirms it. */
  readonly identifier: MetadataIdentifier
}

/**
 * Recognizes Project Gutenberg's own numeric identifier and official URL
 * forms. Calling providers decide explicitly how to use this crosswalk; the
 * shared scorer never reinterprets arbitrary URLs.
 */
export const projectGutenbergLookupFromInput = (
  input: FetchMetadataInput,
): ProjectGutenbergLookup | undefined => {
  for (const identifier of input.identifiers ?? []) {
    const id = catalogIdentifierValue(
      [identifier],
      PROJECT_GUTENBERG_IDENTIFIER_SCHEME,
    )

    if (id !== undefined) {
      return {
        id,
        identifier: { value: identifier.value, scheme: identifier.scheme },
      }
    }
  }

  return undefined
}
