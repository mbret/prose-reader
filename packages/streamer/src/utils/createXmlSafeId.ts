// Generated non-EPUB IDs preserve a leading digit to stay close to common
// reader-generated identifiers, even though strict XML IDs disallow it.
const XML_SAFE_ID_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/
const XML_SAFE_ID_START_PATTERN = /^[A-Za-z0-9_]/
const XML_RESERVED_ID_START_PATTERN = /^xml/i
const INVALID_XML_SAFE_ID_CHARACTER_PATTERN = /[^A-Za-z0-9_.-]+/g
const XML_SAFE_ID_START_FALLBACK = `_`

const trimIdSeparators = (value: string) => value.replace(/^_+|_+$/g, ``)

const normalizeXmlSafeIdValue = (value: string) =>
  trimIdSeparators(
    value
      .trim()
      .replaceAll(`/`, `_`)
      .replace(INVALID_XML_SAFE_ID_CHARACTER_PATTERN, `_`),
  )

export const createXmlSafeId = (value: string) => {
  if (
    XML_SAFE_ID_PATTERN.test(value) &&
    !XML_RESERVED_ID_START_PATTERN.test(value)
  ) {
    return value
  }

  const normalized = normalizeXmlSafeIdValue(value)
  const valueWithValidStart =
    normalized && !XML_RESERVED_ID_START_PATTERN.test(normalized)
      ? normalized
      : `${XML_SAFE_ID_START_FALLBACK}${normalized}`

  if (XML_SAFE_ID_START_PATTERN.test(valueWithValidStart)) {
    return valueWithValidStart
  }

  return `${XML_SAFE_ID_START_FALLBACK}${valueWithValidStart}`
}

export const createUniqueXmlSafeId = (value: string, usedIds: Set<string>) => {
  const id = createXmlSafeId(value)

  if (!usedIds.has(id)) {
    usedIds.add(id)

    return id
  }

  let index = 2
  let nextId = `${id}-${index}`

  while (usedIds.has(nextId)) {
    index += 1
    nextId = `${id}-${index}`
  }

  usedIds.add(nextId)

  return nextId
}

export const createXmlSafeIdFactory = () => {
  const usedIds = new Set<string>()

  return (value: string) => createUniqueXmlSafeId(value, usedIds)
}
