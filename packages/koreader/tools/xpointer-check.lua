-- Asks crengine what it makes of pointers produced by @prose-reader/koreader,
-- so the package's output can be checked against the real KOReader engine:
-- for each pair of pointers, whether crengine resolves them and the text it
-- reads between them.
--
--   cd <koreader-release>/lib/koreader
--   KO_HOME=/tmp/ko-oracle ./luajit xpointer-check.lua <book.epub> <pairs.json> <out.json>
--
-- pairs.json: {"pairs": [[xp0, xp1], ...]} (xp1 may be null: xp0 alone is
-- checked). out.json: {"epub", "domVersion", "results": [{"xp0", "xp1",
-- "valid0", "valid1", "text"}]}.
require("setupkoenv")
package.path = "spec/unit/?.lua;" .. package.path
require("commonrequire")
local JSON = require("json")
local InitArray = require("json.util").InitArray
local DocumentRegistry = require("document/documentregistry")

local epub, inpath, outpath = arg[1], arg[2], arg[3]
assert(epub and inpath and outpath, "usage: xpointer-check.lua <book.epub> <pairs.json> <out.json>")

local infile = assert(io.open(inpath, "r"))
local input = JSON.decode(infile:read("*a"))
infile:close()

local doc = assert(DocumentRegistry:openDocument(epub), "cannot open " .. epub)
doc:requestDomVersion(doc:getLatestDomVersion())
doc:setStyleSheet(doc.default_css)
doc:setEmbeddedStyleSheet(1)
doc:setEmbeddedFonts(1)
doc:setBlockRenderingFlags(0x7FFFFFFF)
doc:setRenderDPI(96)
doc:setTxtPreFormatted(1)
doc:render()

local result = {
    epub = epub:match("([^/]+)$"),
    domVersion = doc:getLatestDomVersion(),
    results = InitArray({}),
}

for _, pair in ipairs(input.pairs) do
    local xp0, xp1 = pair[1], pair[2]
    local entry = { xp0 = xp0, xp1 = xp1, valid0 = doc:isXPointerInDocument(xp0) }
    if xp1 and xp1 ~= JSON.util.null then
        entry.valid1 = doc:isXPointerInDocument(xp1)
        if entry.valid0 and entry.valid1 then
            entry.text = doc:getTextFromXPointers(xp0, xp1)
        end
    end
    table.insert(result.results, entry)
end
doc:close()

local out = assert(io.open(outpath, "w"))
out:write((JSON.encode(result):gsub("\\/", "/")))
out:close()
print(string.format("wrote %s: %d results", outpath, #result.results))
