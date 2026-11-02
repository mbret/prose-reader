export const truncateText = (text: string, maxLength = 50): string => {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

export const isKeyOf = <Key extends string>(
  record: Record<Key, unknown>,
  value: string,
): value is Key => Object.hasOwn(record, value)
