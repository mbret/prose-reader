import type { Manifest } from "@prose-reader/shared"
import { describe, expect, it } from "vitest"
import type { Reader } from "../../index"
import type {
  NavigationTargetOf,
  UserNavigationEntry,
} from "../../navigation/types"
import type { createReader } from "../../reader"
import { getUrlNavigationTarget } from "./getUrlNavigationTarget"

const manifestWith = (hrefs: string[]) => ({
  // Only the spine items' index and href are read.
  spineItems: hrefs.map((href, index) => ({ href, index })),
})

const document = new DOMParser().parseFromString(
  `<html><body><p id="note">A note</p><p id="café">A café</p></body></html>`,
  "text/html",
)

const resolve = (url: string, hrefs: string[], base?: string) => {
  const target = getUrlNavigationTarget(
    url,
    // The manifest's other fields are not read.
    manifestWith(hrefs) as unknown as Manifest,
    base,
  )

  return (
    target && {
      spineItem: target.value.spineItem,
      found: target.value.find(document)?.node,
    }
  )
}

describe("getUrlNavigationTarget", () => {
  it("goes to the element a url's fragment names, in the item its path names", () => {
    expect(
      resolve("http://book/ch02.xhtml#note", [
        "http://book/ch01.xhtml",
        "http://book/ch02.xhtml",
      ]),
    ).toEqual({ spineItem: 1, found: document.getElementById("note") })
  })

  it("finds the item of a file url, whose origin is opaque", () => {
    // Manifests without a base url name their items with file urls.
    expect(
      resolve("file://EPUB/ch02.xhtml#note", [
        "file://EPUB/ch01.xhtml",
        "file://EPUB/ch02.xhtml",
      ]),
    ).toEqual({ spineItem: 1, found: document.getElementById("note") })
  })

  it("resolves a relative url against the document it is in", () => {
    expect(
      resolve(
        "ch02.xhtml#note",
        ["file://EPUB/toc.xhtml", "file://EPUB/ch02.xhtml"],
        "file://EPUB/toc.xhtml",
      ),
    ).toEqual({ spineItem: 1, found: document.getElementById("note") })
  })

  it("finds an element whose id the url had to percent-encode", () => {
    expect(
      resolve("http://book/ch01.xhtml#café", ["http://book/ch01.xhtml"]),
    ).toEqual({ spineItem: 0, found: document.getElementById("café") })
  })

  it("goes to the item start for a url without a fragment", () => {
    expect(
      resolve("http://book/ch01.xhtml", ["http://book/ch01.xhtml"]),
    ).toEqual({ spineItem: 0, found: undefined })
  })

  it("goes nowhere for a url outside the book", () => {
    expect(
      resolve("http://elsewhere/page.html#note", ["http://book/ch01.xhtml"]),
    ).toBeUndefined()
  })
})

describe("the url target", () => {
  it("is accepted by a reader built with the url enhancer, and only then", () => {
    const url = { type: "url", value: "http://book/ch01.xhtml" } as const

    // Only checked by the compiler.
    const navigate = (
      reader: Reader,
      core: ReturnType<typeof createReader>,
    ) => {
      reader.navigation.navigate({ target: url })
      reader.navigation.navigate({ target: { type: "cfi", value: "" } })
      // @ts-expect-error core alone has no url target
      core.navigation.navigate({ target: url })
    }

    const target: NavigationTargetOf<Reader> = url
    const entry: UserNavigationEntry<NavigationTargetOf<Reader>> = {
      target: { type: "spineItem", value: 0 },
    }

    expect([navigate, target, entry]).toHaveLength(3)
  })
})
