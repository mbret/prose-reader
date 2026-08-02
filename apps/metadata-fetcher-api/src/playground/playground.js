const form = document.getElementById("form")
const statusEl = document.getElementById("status")
const resultsEl = document.getElementById("results")
const rawBox = document.getElementById("rawBox")
const rawEl = document.getElementById("raw")
const button = form.querySelector("button")
const fieldsSource = document.getElementById("fieldsSource")
const fileSource = document.getElementById("fileSource")
const fileInput = form.elements.file

const el = (tag, className, text) => {
  const node = document.createElement(tag)

  if (className) node.className = className
  if (text !== undefined && text !== null) node.textContent = String(text)

  return node
}

const describeDate = (date) => {
  if (date?.year === undefined) return undefined

  return [date.year, date.month, date.day]
    .filter((part) => part !== undefined)
    .map((part, index) =>
      index === 0 ? String(part) : String(part).padStart(2, "0"),
    )
    .join("-")
}

const describePublication = (label, publication) => {
  const details = [
    describeDate(publication?.date),
    publication?.publisher,
    publication?.imprint,
  ].filter(Boolean)

  return details.length > 0 ? `${label}: ${details.join(", ")}` : undefined
}

const describe = (metadata) =>
  [
    (metadata.contributors ?? [])
      .map((contributor) => contributor.name)
      .join(", "),
    describePublication("original", metadata.publication?.original),
    describePublication("edition", metadata.publication?.edition),
    metadata.numberOfPages && `${metadata.numberOfPages} pages`,
    metadata.languages?.join("/"),
  ]
    .filter(Boolean)
    .join(" · ")

// catalog values go in through textContent, never innerHTML, so a title
// carrying markup stays a title
const renderMatch = (match) => {
  const metadata = match.metadata ?? {}
  const card = el("article", `match${match.accepted ? " accepted" : ""}`)

  if (metadata.cover?.uri) {
    const cover = el("img")

    cover.src = metadata.cover.uri
    cover.alt = ""
    cover.loading = "lazy"
    card.append(cover)
  }

  card.append(el("h2", null, metadata.title ?? "(untitled)"))

  const meta = el("p", "meta")
  const verdict = match.accepted ? "accepted" : "rejected"

  meta.append(
    el(
      "span",
      `badge ${match.accepted ? "yes" : "no"}`,
      `${match.score.toFixed(2)} ${verdict}`,
    ),
    ` · ${match.providerId}`,
  )

  const described = describe(metadata)

  if (described) meta.append(` · ${described}`)

  if (match.url) {
    const link = el("a", null, "record")

    link.href = match.url
    link.target = "_blank"
    link.rel = "noreferrer"
    meta.append(" · ", link)
  }

  card.append(meta)

  const signals = el("div", "signals")

  for (const signal of match.signals ?? []) {
    const row = el("div", "signal")

    row.append(
      el("span", "field", signal.field),
      el("span", null, signal.score.toFixed(2)),
      el("span", "vs", `${signal.query}  ↔  ${signal.candidate}`),
    )
    signals.append(row)
  }

  card.append(signals)

  return card
}

const render = (body) => {
  resultsEl.replaceChildren()

  if (body.failedProviders?.length) {
    const failed = body.failedProviders
      .map(({ id, status }) => (status ? `${id} (HTTP ${status})` : id))
      .join(", ")

    resultsEl.append(el("p", "status error", `failed providers: ${failed}`))
  }

  const matches = body.matches ?? []

  if (matches.length === 0) {
    resultsEl.append(el("p", "empty", body.error ?? "No candidate came back."))

    return
  }

  resultsEl.append(...matches.map(renderMatch))
}

const queryFrom = (formData, source) => {
  const params = new URLSearchParams()
  const keys =
    source === "file"
      ? ["limit", "minScore"]
      : ["title", "author", "isbn", "limit", "minScore"]

  for (const key of keys) {
    const value = formData.get(key)

    if (typeof value === "string" && value.trim() !== "") {
      params.set(key, value.trim())
    }
  }

  // a checked box submits "on", which the API rightly refuses
  if (formData.get("includeRaw")) params.set("includeRaw", "true")

  return params
}

const urlWith = (path, params) => {
  const query = params.toString()

  return query === "" ? path : `${path}?${query}`
}

const showResponse = (response, body, label, started) => {
  const elapsed = Math.round(performance.now() - started)

  statusEl.className = `status${response.ok ? "" : " error"}`
  statusEl.replaceChildren(
    el("code", null, label),
    `  →  ${response.status} in ${elapsed} ms`,
  )
  render(body)
  rawEl.textContent = JSON.stringify(body, null, 2)
  rawBox.hidden = false
}

const setSource = (source) => {
  const fromFile = source === "file"
  const fieldsHidden = fromFile
  const fileHidden = !fromFile

  if (fieldsSource.hidden !== fieldsHidden) fieldsSource.hidden = fieldsHidden
  if (fileSource.hidden !== fileHidden) fileSource.hidden = fileHidden

  for (const input of fieldsSource.querySelectorAll("input")) {
    if (input.disabled !== fromFile) input.disabled = fromFile
  }
  if (fileInput.disabled !== fileHidden) fileInput.disabled = fileHidden
}

for (const sourceInput of form.elements.source) {
  sourceInput.addEventListener("change", () => {
    if (sourceInput.checked) setSource(sourceInput.value)
  })
}

form.addEventListener("submit", async (event) => {
  event.preventDefault()

  const formData = new FormData(form)
  const source = formData.get("source")
  const params = queryFrom(formData, source)

  if (
    source === "fields" &&
    !["title", "author", "isbn"].some((key) => params.has(key))
  ) {
    statusEl.className = "status error"
    statusEl.textContent = "Type a title, an author or an ISBN first."

    return
  }

  const file = formData.get("file")

  if (source === "file" && (!(file instanceof File) || file.size === 0)) {
    statusEl.className = "status error"
    statusEl.textContent = "Choose an EPUB, CBZ or ZIP file first."

    return
  }

  const metadataUrl = urlWith("/metadata", params)
  const started = performance.now()

  button.disabled = true
  statusEl.className = "status"
  statusEl.textContent = "fetching…"
  resultsEl.replaceChildren()
  rawBox.hidden = true

  try {
    let response
    let label

    if (source === "file") {
      statusEl.textContent = `reading ${file.name} in memory…`

      const resolvedResponse = await fetch("/playground/resolve", {
        method: "POST",
        headers: {
          "content-type": "application/octet-stream",
          "x-prose-file-name": encodeURIComponent(file.name),
          "x-prose-file-type": encodeURIComponent(file.type),
        },
        body: file,
      })
      const resolved = await resolvedResponse.json()

      console.log("POST /playground/resolve", resolved)

      if (!resolvedResponse.ok) {
        showResponse(
          resolvedResponse,
          resolved,
          `POST /playground/resolve (${file.name})`,
          started,
        )

        return
      }

      statusEl.textContent = `fetching with metadata resolved from ${file.name}…`
      response = await fetch(metadataUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(resolved),
      })

      label = `POST ${metadataUrl} (${file.name})`
    } else {
      response = await fetch(metadataUrl)
      label = `GET ${metadataUrl}`
    }

    const body = await response.json()

    console.log(label, body)

    showResponse(response, body, label, started)
  } catch (error) {
    statusEl.className = "status error"
    statusEl.textContent = `request failed: ${error.message}`
  } finally {
    button.disabled = false
  }
})

fetch("/health")
  .then((response) => response.json())
  .then(({ providers }) => {
    document.getElementById("providers").textContent =
      `Providers: ${providers.map((provider) => provider.name).join(", ")}`
  })
  .catch(() => {
    // the providers line is decoration — a real failure surfaces on fetch
  })
