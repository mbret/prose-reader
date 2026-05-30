import { getUriBasename } from "../utils/uri"
import { createArchive } from "./createArchive"
import { blobFileAccessors } from "./fileAccessors"

/**
 * Useful to create archive from txt content
 */
export const createArchiveFromText = async (
  content: string | Blob,
  {
    mimeType,
    direction,
  }: {
    direction?: `ltr` | `rtl`
    mimeType?: string
  } = { mimeType: "text/plain" },
) => {
  const txtOpfContent = `
      <?xml version="1.0" encoding="UTF-8"?>
      <package xmlns="http://www.idpf.org/2007/opf" version="3.0" xml:lang="ja" prefix="rendition: http://www.idpf.org/vocab/rendition/#"
        unique-identifier="ootuya-id">
        <metadata xmlns:opf="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/"
              xmlns:dcterms="http://purl.org/dc/terms/">
              <meta property="rendition:layout">reflowable</meta>
        </metadata>
        <manifest>
            <item id="p01" href="p01.txt" media-type="text/plain"/>
        </manifest>
        <spine page-progression-direction="${direction ?? `ltr`}">
          <itemref idref="p01" />
        </spine>
      </package>
    `

  const archive = createArchive({
    filename: `content.txt`,
    encodingFormat: mimeType,
    records: [
      {
        dir: false,
        basename: getUriBasename(`generated.opf`),
        uri: `generated.opf`,
        size: 0,
        ...blobFileAccessors(async () => new Blob([txtOpfContent])),
      },
      {
        dir: false,
        basename: getUriBasename(`p01.txt`),
        uri: `p01.txt`,
        size:
          typeof content === "string" ? new Blob([content]).size : content.size,
        encodingFormat: mimeType,
        ...blobFileAccessors(async () =>
          typeof content === "string" ? new Blob([content]) : content,
        ),
      },
    ],
    close: () => Promise.resolve(),
  })

  return archive
}
