import { getUrlExtension } from "./url"

export const detectContentType = (name: string) => {
  const extension = getUrlExtension(name)

  switch (extension) {
    case 'png': return `image/png`
    case 'jpg': return `image/jpg`
    case 'jpeg': return `image/jpeg`
  }

  return undefined
}