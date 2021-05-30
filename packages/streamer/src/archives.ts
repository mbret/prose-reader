export type Archive = {
  filename: string,
  files: {
    dir: boolean
    name: string
    blob: () => Promise<Blob>
    string: () => Promise<string>
    base64: () => Promise<string>
    size: number,
    encodingFormat?: undefined | `text/plain`
  }[]
}

export const getArchiveOpfInfo = (archive: Archive) => {
  const filesAsArray = Object.values(archive.files).filter(file => !file.dir)
  const file = filesAsArray.find(file => file.name.endsWith(`.opf`))

  return {
    data: file,
    basePath: file?.name.substring(0, file.name.lastIndexOf(`/`)) || ''
  }
}

/**
 * Useful to create archive from txt content
 */
export const createArchiveFromText = async (content: string | Blob | File, options?: {
  direction: 'ltr' | 'rtl'
}) => {

  const txtOpfContent = `
    <?xml version="1.0" encoding="UTF-8"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0" xml:lang="ja" prefix="rendition: http://www.idpf.org/vocab/rendition/#"
      unique-identifier="ootuya-id">
      <metadata xmlns:opf="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/"
            xmlns:dcterms="http://purl.org/dc/terms/">
            <meta property="rendition:layout">reflowable</meta>
      </metadata>
      <manifest>
          <item id="p01" href="p01.xhtml" media-type="application/xhtml+xml"/>
      </manifest>
      <spine page-progression-direction="${options?.direction || 'ltr'}">
        <itemref idref="p01" />
      </spine>
    </package>
  `

  const archive: Archive = {
    filename: `content.txt`,
    files: [{
      dir: false,
      name: `generated.opf`,
      blob: async () => new Blob([txtOpfContent]),
      string: async () => txtOpfContent,
      base64: async () => btoa(txtOpfContent),
      size: 0
    },
    {
      dir: false,
      name: `p01.xhtml`,
      blob: async () => {
        if (typeof content === `string`) return new Blob([content])
        return content
      },
      string: async () => {
        if (typeof content === `string`) return content
        return content.text()
      },
      base64: async () => {
        if (typeof content === `string`) return btoa(content)
        return blobToBase64(content)
      },
      size: typeof content === `string` ? content.length : content.size,
      encodingFormat: 'text/plain'
    }]
  }

  return archive
}

const blobToBase64 = async (blob: Blob | File) => new Promise<string>(resolve => {
  var reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = function () {
    var base64data = reader.result as string;
    resolve(base64data)
  }
})