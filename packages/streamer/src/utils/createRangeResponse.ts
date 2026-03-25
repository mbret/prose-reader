const parseByteRangePart = (value: string) => {
  if (!value) {
    return {
      valid: true,
      value: undefined,
    }
  }

  if (!/^\d+$/.test(value)) {
    return {
      valid: false,
      value: undefined,
    }
  }

  return {
    valid: true,
    value: Number.parseInt(value, 10),
  }
}

const parseSingleByteRange = (rangeHeader: string) => {
  if (!rangeHeader.toLowerCase().startsWith("bytes=")) {
    return {
      kind: "missing" as const,
    }
  }

  const rangeValue = rangeHeader.slice("bytes=".length).trim()

  if (!rangeValue) {
    return {
      kind: "invalid" as const,
    }
  }

  if (rangeValue.includes(",")) {
    return {
      kind: "multi" as const,
    }
  }

  const matches = /^(\d*)-(\d*)$/.exec(rangeValue)

  if (!matches) {
    return {
      kind: "invalid" as const,
    }
  }

  const [, rawStart = "", rawEnd = ""] = matches
  const parsedStart = parseByteRangePart(rawStart.trim())
  const parsedEnd = parseByteRangePart(rawEnd.trim())

  if (!parsedStart.valid || !parsedEnd.valid) {
    return {
      kind: "invalid" as const,
    }
  }

  return {
    kind: "single" as const,
    start: parsedStart.value,
    end: parsedEnd.value,
  }
}

/**
 * Normalize the body into a sliceable form that avoids passing a
 * `Blob.slice()` result directly to `new Response()`. Some Node.js
 * versions do not recognise sliced Blobs as valid `BodyInit`,
 * producing `"[object Blob]"` instead of the actual content.
 */
const materializeForSlicing = (body: Blob | string) => {
  if (body instanceof Blob) {
    return {
      size: body.size,
      slice: (start: number, endExclusive: number) => {
        const part = body.slice(start, endExclusive)
        return { content: part, length: part.size }
      },
    }
  }

  const bytes = new TextEncoder().encode(body)

  return {
    size: bytes.byteLength,
    slice: (start: number, endExclusive: number) => {
      const part = bytes.slice(start, endExclusive)
      return { content: part, length: part.byteLength }
    },
  }
}

export const createRangeResponse = ({
  body,
  contentType,
  rangeHeader,
}: {
  body: Blob | string
  contentType?: string
  rangeHeader?: string | null
}) => {
  const headers = new Headers()

  if (contentType) {
    headers.set("Content-Type", contentType)
  }

  headers.set("Accept-Ranges", "bytes")

  if (!rangeHeader) {
    if (body instanceof Blob) {
      headers.set("Content-Length", String(body.size))
    }

    return new Response(body, {
      status: 200,
      headers,
    })
  }

  const parsedRange = parseSingleByteRange(rangeHeader)

  if (parsedRange.kind === "missing" || parsedRange.kind === "multi") {
    if (body instanceof Blob) {
      headers.set("Content-Length", String(body.size))
    }

    return new Response(body, {
      status: 200,
      headers,
    })
  }

  const rangeBody = materializeForSlicing(body)
  const size = rangeBody.size

  if (parsedRange.kind === "invalid") {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${size}`,
      },
    })
  }

  let start = parsedRange.start
  let end = parsedRange.end

  if (start === undefined && end === undefined) {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${size}`,
      },
    })
  }

  if (start === undefined) {
    const suffixLength = Math.min(end ?? 0, size)
    start = Math.max(0, size - suffixLength)
    end = size - 1
  } else if (end === undefined || end >= size) {
    end = size - 1
  }

  if (start < 0 || end < 0 || start >= size || end >= size || start > end) {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${size}`,
      },
    })
  }

  const partial = rangeBody.slice(start, end + 1)

  headers.set("Content-Length", String(partial.length))
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`)

  return new Response(partial.content, {
    status: 206,
    headers,
  })
}
