export const getAttributeValueFromString = (string: string, key: string) => {
  const regExp = new RegExp(key + `\\s*=\\s*([0-9.]+)`, `i`)
  const match = string.match(regExp) || []
  const firstMatch = match[1] || `0`

  return (match && parseFloat(firstMatch)) || 0
}
