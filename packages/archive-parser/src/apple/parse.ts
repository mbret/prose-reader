import type { XmlElement } from "xmldoc"
import { XmlDocument } from "xmldoc"

export const APPLE_IBOOKS_DISPLAY_OPTIONS_FILENAME =
  "com.apple.ibooks.display-options.xml"

export type AppleDisplayOption = {
  readonly name?: string
  readonly value: string
}

export type AppleMetadata = {
  readonly kind: "apple"
  readonly displayOptions?: {
    readonly platform?: {
      readonly options: ReadonlyArray<AppleDisplayOption>
    }
  }
}

const platformOptionsFromElement = (
  platform: XmlElement,
): ReadonlyArray<AppleDisplayOption> =>
  platform.childrenNamed("option").map((option) => ({
    name: option.attr?.name,
    value: option.val,
  }))

export const parseAppleDisplayOptionsXml = (xml: string): AppleMetadata => {
  const doc = new XmlDocument(xml)
  const root = doc.name?.toLowerCase()

  if (root !== "display_options") {
    return { kind: "apple" }
  }

  const platformEl = doc.childNamed("platform")

  return {
    kind: "apple",
    displayOptions: {
      ...(platformEl !== undefined
        ? { platform: { options: platformOptionsFromElement(platformEl) } }
        : {}),
    },
  }
}
