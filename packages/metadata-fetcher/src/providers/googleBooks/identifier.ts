import {
  identifierValue,
  type KnownMetadataIdentifierScheme,
  type MetadataIdentifier,
} from "@prose-reader/archive-reader"
import type { FetchMetadataInput } from "../../types/fetchMetadataInput.ts"

export const GOOGLE_BOOKS_IDENTIFIER_SCHEME =
  "GoogleBooks" satisfies KnownMetadataIdentifierScheme

export type GoogleBooksLookup = {
  readonly id: string
  /** The book's exact identifier spelling, echoed only after Google confirms it. */
  readonly identifier: MetadataIdentifier
}

/**
 * Recognizes an authored Google Books volume id and the official Google Books
 * website/API URL forms. Arbitrary scheme-less strings are not reinterpreted
 * as ids: callers with a raw id should label it `GoogleBooks`.
 */
export const googleBooksLookupFromInput = (
  input: FetchMetadataInput,
): GoogleBooksLookup | undefined => {
  for (const identifier of input.identifiers ?? []) {
    const id = identifierValue([identifier], GOOGLE_BOOKS_IDENTIFIER_SCHEME)

    if (id !== undefined) {
      return {
        id,
        identifier: { value: identifier.value, scheme: identifier.scheme },
      }
    }
  }

  return undefined
}
