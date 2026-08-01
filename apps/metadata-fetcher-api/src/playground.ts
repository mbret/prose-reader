/**
 * The development playground: a single self-contained page for trying lookups
 * by hand — type a title, hit fetch, read what the catalogs answered and why.
 *
 * It is **never** served when `NODE_ENV=production` (see `config.ts`), so a
 * hosted deployment has no HTML surface at all: `/` is a plain 404 there.
 * That is also why this is one inline string rather than a static directory —
 * there is no asset to ship, nothing to bundle, and nothing to accidentally
 * leave exposed.
 *
 * No template literals or backticks inside the embedded script: it lives in a
 * template literal itself, and `${` would interpolate.
 */
export const PLAYGROUND_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>metadata fetcher — playground</title>
<!-- an empty icon: without it the browser asks for /favicon.ico, which the
     API answers with a JSON 404 and the console reports as an error -->
<link rel="icon" href="data:,">
<style>
  :root {
    color-scheme: light dark;
    --bg: #fbfbfa; --fg: #1a1a19; --muted: #6b6b68; --line: #e3e3e0;
    --card: #ffffff; --accent: #b06642; --ok: #2f7d5b; --no: #96684a;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #17171a; --fg: #ececea; --muted: #9a9a96; --line: #2e2e33;
      --card: #1f1f23; --accent: #d98d63; --ok: #6fc79b; --no: #c99b7c;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2rem 1.25rem 4rem; background: var(--bg); color: var(--fg);
    font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  main { max-width: 54rem; margin: 0 auto; }
  h1 { font-size: 1.35rem; margin: 0; letter-spacing: -0.01em; }
  .sub { color: var(--muted); font-size: 0.85rem; margin: 0.35rem 0 0; }
  .sub code { background: var(--line); padding: 0.1em 0.35em; border-radius: 4px; }
  form { margin: 1.75rem 0 0; display: grid; gap: 0.75rem; }
  .row { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 0.75rem; }
  label { display: grid; gap: 0.3rem; font-size: 0.8rem; color: var(--muted); }
  input[type=text], input[type=number] {
    font: inherit; padding: 0.5rem 0.6rem; border: 1px solid var(--line);
    border-radius: 7px; background: var(--card); color: var(--fg); min-width: 0;
  }
  input:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  details { border: 1px solid var(--line); border-radius: 7px; padding: 0.5rem 0.75rem; background: var(--card); }
  details[open] { padding-bottom: 0.85rem; }
  summary { cursor: pointer; font-size: 0.8rem; color: var(--muted); }
  .inline { display: flex; align-items: center; gap: 0.4rem; color: var(--fg); font-size: 0.85rem; }
  button {
    font: inherit; font-weight: 550; padding: 0.55rem 1.1rem; border: 0; border-radius: 7px;
    background: var(--accent); color: #fff; cursor: pointer; justify-self: start;
  }
  button[disabled] { opacity: 0.55; cursor: progress; }
  .status { margin: 1.5rem 0 0; font-size: 0.85rem; color: var(--muted); }
  .status code { color: var(--fg); word-break: break-all; }
  .status.error { color: var(--no); }
  .match {
    border: 1px solid var(--line); border-left: 3px solid var(--line); border-radius: 8px;
    background: var(--card); padding: 0.9rem 1rem; margin-top: 0.75rem;
    display: grid; grid-template-columns: auto 1fr; gap: 0 1rem;
  }
  .match.accepted { border-left-color: var(--ok); }
  .match img { grid-row: 1 / span 3; width: 62px; border-radius: 4px; background: var(--line); }
  .match h2 { grid-column: 2; font-size: 1rem; margin: 0; }
  .meta { grid-column: 2; color: var(--muted); font-size: 0.82rem; margin: 0.2rem 0 0; }
  .meta a { color: inherit; }
  .badge { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  .badge.yes { color: var(--ok); } .badge.no { color: var(--no); }
  .signals { grid-column: 2; margin: 0.6rem 0 0; display: grid; gap: 0.15rem; font-size: 0.78rem; }
  .signal { display: grid; grid-template-columns: 7rem 3rem 1fr; gap: 0.5rem; align-items: baseline; }
  .signal .field { color: var(--muted); }
  .signal .vs { color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  pre { overflow-x: auto; font-size: 0.75rem; margin: 0; }
  .empty { color: var(--muted); font-style: italic; }
</style>
</head>
<body>
<main>
  <h1>metadata fetcher</h1>
  <p class="sub">Development playground — not served when <code>NODE_ENV=production</code>. <span id="providers"></span></p>

  <form id="form">
    <div class="row">
      <label>Title <input type="text" name="title" placeholder="Dune" autofocus></label>
      <label>Author <input type="text" name="author" placeholder="Frank Herbert"></label>
      <label>ISBN <input type="text" name="isbn" placeholder="9780441013593"></label>
    </div>
    <details>
      <summary>Options</summary>
      <div class="row" style="margin-top:0.7rem">
        <label>limit <input type="number" name="limit" min="1" max="50" placeholder="5"></label>
        <label>minScore <input type="number" name="minScore" min="0" max="1" step="0.05" placeholder="0.5"></label>
        <label class="inline" style="align-self:end"><input type="checkbox" name="includeRaw"> includeRaw</label>
      </div>
    </details>
    <button type="submit">Fetch</button>
  </form>

  <p class="status" id="status"></p>
  <div id="results"></div>
  <details id="rawBox" hidden style="margin-top:1.25rem">
    <summary>Raw response</summary>
    <pre id="raw"></pre>
  </details>
</main>

<script>
  var form = document.getElementById("form")
  var statusEl = document.getElementById("status")
  var resultsEl = document.getElementById("results")
  var rawBox = document.getElementById("rawBox")
  var rawEl = document.getElementById("raw")
  var button = form.querySelector("button")

  function el(tag, className, text) {
    var node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined && text !== null) node.textContent = String(text)
    return node
  }

  // every value below comes from a catalog: build nodes and set textContent
  // rather than innerHTML, so a title with markup in it stays a title
  function authorsOf(metadata) {
    return (metadata.contributors || []).map(function (c) { return c.name }).join(", ")
  }

  function describe(metadata) {
    var bits = []
    var authors = authorsOf(metadata)
    if (authors) bits.push(authors)
    if (metadata.published && metadata.published.year) bits.push(metadata.published.year)
    if (metadata.publisher) bits.push(metadata.publisher)
    if (metadata.numberOfPages) bits.push(metadata.numberOfPages + " pages")
    if (metadata.languages) bits.push(metadata.languages.join("/"))
    return bits.join(" · ")
  }

  function renderMatch(match) {
    var card = el("article", "match" + (match.accepted ? " accepted" : ""))
    var metadata = match.metadata || {}

    if (metadata.cover && metadata.cover.uri) {
      var img = el("img")
      img.src = metadata.cover.uri
      img.alt = ""
      img.loading = "lazy"
      card.appendChild(img)
    }

    card.appendChild(el("h2", null, metadata.title || "(untitled)"))

    var meta = el("p", "meta")
    meta.appendChild(el("span", "badge " + (match.accepted ? "yes" : "no"),
      match.score.toFixed(2) + " " + (match.accepted ? "accepted" : "rejected")))
    meta.appendChild(document.createTextNode(" · " + match.providerId))
    var described = describe(metadata)
    if (described) meta.appendChild(document.createTextNode(" · " + described))
    if (match.url) {
      meta.appendChild(document.createTextNode(" · "))
      var link = el("a", null, "record")
      link.href = match.url
      link.target = "_blank"
      link.rel = "noreferrer"
      meta.appendChild(link)
    }
    card.appendChild(meta)

    var signals = el("div", "signals")
    ;(match.signals || []).forEach(function (signal) {
      var row = el("div", "signal")
      row.appendChild(el("span", "field", signal.field))
      row.appendChild(el("span", null, signal.score.toFixed(2)))
      row.appendChild(el("span", "vs", signal.query + "  ↔  " + signal.candidate))
      signals.appendChild(row)
    })
    card.appendChild(signals)

    return card
  }

  function render(body) {
    resultsEl.replaceChildren()

    if (body.failedProviders && body.failedProviders.length > 0) {
      resultsEl.appendChild(el("p", "status error",
        "failed providers: " + body.failedProviders.join(", ")))
    }

    var matches = body.matches || []
    if (matches.length === 0) {
      resultsEl.appendChild(el("p", "empty", body.error || "No candidate came back."))
      return
    }

    matches.forEach(function (match) { resultsEl.appendChild(renderMatch(match)) })
  }

  function queryFrom(formData) {
    var params = new URLSearchParams()
    formData.forEach(function (value, key) {
      if (key === "includeRaw") return
      if (typeof value === "string" && value.trim() !== "") params.set(key, value.trim())
    })
    // a checked box submits "on", which the API rightly refuses
    if (formData.get("includeRaw")) params.set("includeRaw", "true")
    return params
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault()

    var params = queryFrom(new FormData(form))
    if (params.toString() === "") {
      statusEl.className = "status error"
      statusEl.textContent = "Type a title, an author or an ISBN first."
      return
    }

    var url = "/metadata?" + params.toString()
    var started = performance.now()

    button.disabled = true
    statusEl.className = "status"
    statusEl.textContent = "fetching…"
    resultsEl.replaceChildren()
    rawBox.hidden = true

    fetch(url)
      .then(function (response) {
        return response.json().then(function (body) {
          var elapsed = Math.round(performance.now() - started)
          statusEl.className = "status" + (response.ok ? "" : " error")
          statusEl.replaceChildren(
            el("code", null, "GET " + url),
            document.createTextNode("  →  " + response.status + " in " + elapsed + " ms"),
          )
          render(body)
          rawEl.textContent = JSON.stringify(body, null, 2)
          rawBox.hidden = false
        })
      })
      .catch(function (error) {
        statusEl.className = "status error"
        statusEl.textContent = "request failed: " + error.message
      })
      .finally(function () { button.disabled = false })
  })

  fetch("/health")
    .then(function (response) { return response.json() })
    .then(function (health) {
      document.getElementById("providers").textContent =
        "Providers: " + health.providers.map(function (p) { return p.name }).join(", ")
    })
    .catch(function () {})
</script>
</body>
</html>
`
