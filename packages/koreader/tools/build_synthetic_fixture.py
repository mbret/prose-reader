"""Builds the synthetic EPUB 2 fixture exercising every crengine text rule."""
import zipfile, sys, os

OUT = sys.argv[1]

XHTML_HEAD = '''<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
<title>{title}</title>
<style type="text/css">
.blk {{ display: block; }}
.inl {{ display: inline; }}
.prewrap {{ white-space: pre; }}
</style>
</head>
<body>
'''
XHTML_TAIL = '''</body>
</html>
'''

PROBE_TAGS = [
    "div", "p", "span", "a", "em", "strong", "section", "article", "aside", "header", "footer",
    "nav", "main", "figure", "figcaption", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6",
    "address", "details", "summary", "small", "sub", "sup", "i", "b", "u", "s", "q", "cite",
    "abbr", "time", "mark", "label", "button", "form", "fieldset", "legend", "code", "kbd",
    "samp", "var", "dfn", "data", "ins", "del", "center", "font", "tt", "big", "strike",
    "noscript", "template", "output", "meter", "progress", "picture", "map", "select",
    "option", "optgroup", "hgroup", "dialog", "menu", "dir", "search", "ruby", "rt", "rb",
    "bdi", "bdo", "canvas", "video", "audio", "iframe", "object", "caption", "custom-tag",
    "x-foo", "li", "dt", "dd", "ul", "ol", "dl", "table", "tbody", "thead", "tfoot", "tr", "td", "th",
    "textarea", "style", "script",
]

def probe(tag, attrs=""):
    return f'<{tag} id="probe-{tag}{attrs.split(chr(34))[1] if attrs else ""}"{(" " + attrs) if attrs else ""}>\n<span>x</span> y<span>z</span></{tag}>\n'

blocks = XHTML_HEAD.format(title="Block probes")
blocks += "<h1>Block probes</h1>\n"
for tag in PROBE_TAGS:
    blocks += f'<{tag} id="probe-{tag}">\n<span>x</span> y<span>z</span></{tag}>\n'
blocks += '<span id="probe-span-styled-block" style="display:block">\n<span>x</span> y<span>z</span></span>\n'
blocks += '<div id="probe-div-styled-inline" style="display:inline">\n<span>x</span> y<span>z</span></div>\n'
blocks += '<span id="probe-span-class-block" class="blk">\n<span>x</span> y<span>z</span></span>\n'
blocks += '<div id="probe-div-class-inline" class="inl">\n<span>x</span> y<span>z</span></div>\n'
blocks += '<DIV id="probe-upper-div">\n<Span>x</Span> y<span>z</span></DIV>\n'
blocks += '<div id="probe-comment-between">\n<!-- a comment before the first element -->\n<span>x</span> y<span>z</span></div>\n'
blocks += '<div id="probe-nbsp-first"> \n<span>x</span> y<span>z</span></div>\n'
blocks += '<div id="probe-tabs-first">\t\t\r\n<span>x</span> y<span>z</span></div>\n'
blocks += '<div id="probe-two-ws">\n<!-- c -->\n<span>x</span>\n<span>z</span>\n</div>\n'
blocks += '<div id="probe-hidden" hidden="hidden">\n<span>x</span> y<span>z</span></div>\n'
blocks += '<div id="probe-pre-class" class="prewrap">\n<span>x</span> y<span>z</span></div>\n'
blocks += '<pre id="probe-pre">\n<span>x</span> y<span>z</span></pre>\n'
blocks += '<pre id="probe-pre-text">\nline one\n\tTabbed line\n  two spaces\r\nafter crlf</pre>\n'
blocks += '<pre id="probe-pre-code"><code>\nfirst\n  second</code></pre>\n'
blocks += '<pre id="probe-pre-nested"><span class="inl">\n</span>alpha  beta</pre>\n'
blocks += '<p id="probe-code-inline"><code>zeta   eta</code> theta</p>\n'
blocks += '<div id="probe-svg-inline">\n<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40" viewBox="0 0 100 40">\n<text x="1" y="20" id="svg-text">\n  Hello\tSVG <tspan>world</tspan> again</text>\n<linearGradient id="grad"><stop offset="0"/></linearGradient>\n<g>\n<text x="1" y="35">second  text</text>\n</g>\n</svg>\n</div>\n'
blocks += XHTML_TAIL

text = XHTML_HEAD.format(title="Text normalisation")
text += '''<h1 id="h">Text   normalisation</h1>
<p id="runs">lambda   mu     nu
tab\there	and\r\nafter crlf</p>
<p id="nbsp">alpha   beta   gamma</p>
<p id="entity-spaces">one&#32;&#32;two&#160;three</p>
<p id="shy">hy&#173;phen&#173;ation soft</p>
<p id="emoji">Emoji 😀 before 👩‍🚀 the target words and 🇫🇷 flags</p>
<p id="surrogate-at-offset">😀😀😀end</p>
<p id="cjk">日本語のテキスト、句読点。English mixed 中文</p>
<p id="combining">café naïve å</p>
<p id="zwsp">zero​width​space here</p>
<p id="rtl">مرحبا بالعالم hello עולם</p>
<p id="mixed">Hello <em>emphasis</em> world <strong>strong <em>nested</em> end</strong> tail</p>
<p id="cdata">before<![CDATA[ cdata <content> ]]>after</p>
<p id="comment-split">first<!-- comment -->second<!-- another --> third</p>
<p id="pi"><?pi something?>after pi</p>
<p id="empty-elements">a<br/>b<img src="cover.svg" alt=""/>c<br/><br/>d</p>
<hr/>
<p id="leading-space"> starts with a space</p>
<p id="trailing-space">ends with a space </p>
<p id="only-spaces">   </p>
<p id="multiline">
  first line
  second line
</p>
<p id="deep"><span><span><span><span><span>deep</span></span></span></span></span></p>
<ul id="ul-text">
  text in ul
  <li>item <em>one</em></li>
  <li>item two
    <ul>
      <li>nested a</li>
      <li>nested b</li>
    </ul>
  </li>
  <li>item three</li>
  trailing text in ul
</ul>
<ol id="ol"><li>alpha</li><li>beta</li></ol>
<dl id="dl">
  <dt>term</dt>
  <dd>definition</dd>
</dl>
<table id="table">
  text in table
  <caption>Caption text</caption>
  <thead>
    <tr><th>h1</th><th>h2</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>cell one</td>
      <td>cell <em>two</em> end</td>
    </tr>
    <tr><td colspan="2">row two</td></tr>
  </tbody>
</table>
<section id="s1">
  <h2>Section one</h2>
  <section id="s1-1">
    <h3>Nested section</h3>
    <p>Nested paragraph one.</p>
    <p>Nested paragraph two.</p>
    <section id="s1-1-1"><p>Third level</p></section>
  </section>
  <section id="s1-2">
    <p>Second nested</p>
  </section>
</section>
<blockquote id="bq"><p>Quoted <q>inline quote</q> text.</p><footer>— Someone</footer></blockquote>
<p id="ruby"><ruby>漢<rp>(</rp><rt>kan</rt><rp>)</rp>字<rp>(</rp><rt>ji</rt><rp>)</rp></ruby> after ruby</p>
<p id="switch"><epub:switch><epub:case required-namespace="http://www.w3.org/1998/Math/MathML"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math></epub:case><epub:default>x fallback</epub:default></epub:switch> after switch</p>
<p id="math">Formula <math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><msup><mi>a</mi><mn>2</mn></msup><mo>+</mo><mi>b</mi></mrow></math> after math</p>
<p id="upper"><B>Bold</B> and <Em>em</Em> tags</p>
<p id="links">See <a href="blocks.xhtml#probe-div">the probes</a> and <a href="#h">top</a>.</p>
<div id="whitespace-only-children">
  <p>a</p>
  <p>b</p>
</div>
<div id="text-then-ws">text first
  <p>a</p>
</div>
<div id="empty"></div>
<p id="last">Last paragraph.</p>
'''
text += XHTML_TAIL

def words(n, seed):
    import random
    r = random.Random(seed)
    out = []
    for i in range(n):
        ln = r.randint(1, 12)
        out.append("".join(r.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(ln)))
    return out

longdoc = XHTML_HEAD.format(title="Long text nodes")
longdoc += "<h1>Long text nodes</h1>\n"
longdoc += '<p id="long-spaces">' + " ".join(words(4000, 1)) + '</p>\n'
longdoc += '<p id="long-nospace">' + "x" * 9000 + '</p>\n'
longdoc += '<p id="long-newlines">' + "\n".join(words(3000, 2)) + '</p>\n'
longdoc += '<p id="long-mixed">' + "before <em>inline</em> " + " ".join(words(2500, 3)) + " <em>middle</em> " + " ".join(words(2500, 4)) + '</p>\n'
longdoc += '<p id="long-emoji">' + " ".join(w + "😀" for w in words(3000, 5)) + '</p>\n'
longdoc += '<p id="long-entities">' + " &amp; ".join(words(3000, 6)) + '</p>\n'
longdoc += '<p id="long-double-spaces">' + "  ".join(words(3000, 7)) + '</p>\n'
longdoc += '<pre id="long-pre">' + "\n".join(" ".join(words(8, 100 + i)) for i in range(400)) + '</pre>\n'
longdoc += XHTML_TAIL

crlf = XHTML_HEAD.format(title="CRLF file").replace("\n", "\r\n")
crlf += '<p id="crlf-p">first line\r\n  second line\r\nthird</p>\r\n<pre id="crlf-pre">\r\nline one\r\nline two\r\n</pre>\r\n<div id="crlf-div">\r\n<span>x</span> y<span>z</span></div>\r\n'
crlf += XHTML_TAIL.replace("\n", "\r\n")

textonly = XHTML_HEAD.format(title="Body text") + "body text only, no element\n" + XHTML_TAIL
emptybody = XHTML_HEAD.format(title="Empty body") + XHTML_TAIL
cover = XHTML_HEAD.format(title="Cover") + '<div id="cover"><img src="cover.svg" alt="cover"/></div>\n' + XHTML_TAIL

svg_item = '''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="400" height="300" viewBox="0 0 400 300">
  <title>SVG spine item</title>
  <rect x="10" y="10" width="380" height="280" fill="#eee"/>
  <text x="20" y="60" id="svg-heading">Standalone SVG page</text>
  <g id="group">
    <text x="20" y="120">grouped <tspan font-weight="bold">tspan</tspan> text</text>
  </g>
</svg>
'''
cover_svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#333"/></svg>'

spine = [
    ("cover", "cover.xhtml", "application/xhtml+xml", cover, 'linear="no"'),
    ("blocks", "blocks.xhtml", "application/xhtml+xml", blocks, ""),
    ("text", "text.xhtml", "application/xhtml+xml", text, ""),
    ("svgpage", "page.svg", "image/svg+xml", svg_item, ""),
    ("long", "long.xhtml", "application/xhtml+xml", longdoc, ""),
    ("crlf", "crlf.xhtml", "application/xhtml+xml", crlf, ""),
    ("textonly", "textonly.xhtml", "application/xhtml+xml", textonly, ""),
    ("emptybody", "empty.xhtml", "application/xhtml+xml", emptybody, ""),
]

manifest = "".join(f'<item id="{i}" href="{h}" media-type="{m}"/>\n' for i, h, m, _, _ in spine)
manifest += '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>\n<item id="coversvg" href="cover.svg" media-type="image/svg+xml"/>\n'
spine_xml = "".join(f'<itemref idref="{i}"{(" " + lin) if lin else ""}/>\n' for i, _, _, _, lin in spine)
opf = f'''<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="2.0">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
<dc:title>prose-reader KOReader XPointer fixture</dc:title>
<dc:creator>prose-reader</dc:creator>
<dc:language>en</dc:language>
<dc:identifier id="uid">urn:uuid:5f0a0d4e-2b0f-4a9d-9f8c-7f9a9e0c2d11</dc:identifier>
<dc:rights>MIT, part of the prose-reader test suite</dc:rights>
</metadata>
<manifest>
{manifest}</manifest>
<spine toc="ncx">
{spine_xml}</spine>
</package>
'''
navpoints = "".join(f'<navPoint id="np{n}" playOrder="{n}"><navLabel><text>{i}</text></navLabel><content src="{h}"/></navPoint>\n' for n, (i, h, _, _, _) in enumerate(spine, 1))
ncx = f'''<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="urn:uuid:5f0a0d4e-2b0f-4a9d-9f8c-7f9a9e0c2d11"/></head>
<docTitle><text>prose-reader KOReader XPointer fixture</text></docTitle>
<navMap>
{navpoints}</navMap>
</ncx>
'''
container = '''<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
'''

with zipfile.ZipFile(OUT, "w") as z:
    z.writestr(zipfile.ZipInfo("mimetype"), "application/epub+zip", compress_type=zipfile.ZIP_STORED)
    z.writestr("META-INF/container.xml", container, compress_type=zipfile.ZIP_DEFLATED)
    z.writestr("OEBPS/content.opf", opf, compress_type=zipfile.ZIP_DEFLATED)
    z.writestr("OEBPS/toc.ncx", ncx, compress_type=zipfile.ZIP_DEFLATED)
    z.writestr("OEBPS/cover.svg", cover_svg, compress_type=zipfile.ZIP_DEFLATED)
    for i, h, m, content, _ in spine:
        z.writestr("OEBPS/" + h, content.encode("utf-8"), compress_type=zipfile.ZIP_DEFLATED)
print("wrote", OUT, os.path.getsize(OUT), "bytes")
