import { getUrlExtension } from "./url"

export const detectContentType = (name: string) => {
  const extension = getUrlExtension(name)

  switch (extension) {
    case `png`: return `image/png`
    case `jpg`: return `image/jpg`
    case `jpeg`: return `image/jpeg`
    case `txt`: return `text/plain`
    case `webp`: return `image/webp`
  }

  return undefined
}

export const parseContentType = (str: string) => {
  if (!str.length) return undefined

  const cut = str.indexOf(`;`)

  return cut ? str.substring(0, str.indexOf(`;`)) : str
}
