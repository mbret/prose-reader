export const truncateText = (text: string, maxLength = 50): string => {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

/**
 * Whether `value` is one of `record`'s own keys, such as a radio's value read
 * back as the setting value it stands for.
 */
export const isKeyOf = <Key extends string>(
  record: Record<Key, unknown>,
  value: string,
): value is Key => Object.hasOwn(record, value)
