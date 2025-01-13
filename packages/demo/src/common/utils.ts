export const truncateText = (text: string, maxLength = 50): string => {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}
