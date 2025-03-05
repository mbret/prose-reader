import type { Archive } from "../../../archives/types"
import type { HookResource } from "./types"

const invalidSelfClosingTags = [
  "div",
  "span",
  "p",
  "a",
  "li",
  "ul",
  "ol",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "tr",
  "td",
  "th",
  "thead",
  "tbody",
  "tfoot",
  "section",
  "article",
  "header",
  "footer",
  "nav",
  "aside",
  "main",
  "figure",
  "figcaption",
  "blockquote",
  "pre",
  "code",
  "form",
  "textarea",
  "select",
  "option",
  "button",
  "label",
  "fieldset",
  "legend",
  "caption",
  "dl",
  "dt",
  "dd",
  "iframe",
  "video",
  "audio",
  "canvas",
  "script",
  "style",
]

/**
 * Some books uses xhtml files but also includes wrong self closin tags. This happens
 * a lot with kobo epub which have a lot of self closing <script ... />. This breaks on some
 * browser such as webkit. We use a regex to replace and fix them. There
 * is a first lighter regex which check if any such tag exist in the first place before running
 * the full replace regex empty.
 */
export const selfClosingTagsFixHook =
  ({ archive, resourcePath }: { archive: Archive; resourcePath: string }) =>
  async (resource: HookResource): Promise<HookResource> => {
    const file = Object.values(archive.files).find(
      (file) => file.uri === resourcePath,
    )

    if (file?.basename.endsWith(`.xhtml`)) {
      const bodyToParse = resource.body ?? (await file.string())

      const tagCheckPattern = new RegExp(
        `<(${invalidSelfClosingTags.join("|")})[\\s/>]`,
        "i",
      )
      if (!tagCheckPattern.test(bodyToParse)) {
        return resource
      }

      const tagPattern = new RegExp(
        `<(${invalidSelfClosingTags.join("|")})(\\s[^>]*)?\\s*/>`,
        "gi",
      )

      const fixedBody = bodyToParse.replace(
        tagPattern,
        (_, tagName, attributes = "") => {
          // Convert to an opening and closing tag
          return `<${tagName} ${attributes.trim()}></${tagName}>`
        },
      )

      return {
        ...resource,
        body: fixedBody,
      }
    }

    return resource
  }
