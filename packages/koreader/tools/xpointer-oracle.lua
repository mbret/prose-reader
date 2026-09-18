-- Dump crengine's own XPointers for every visible word of an EPUB, plus the
-- text between each pair, so @prose-reader/koreader can be checked against the
-- real KOReader engine. Adapted from readest's apps/readest.koplugin/scripts/xpointer-oracle.lua.
--
--   cd <koreader-release>/lib/koreader
--   KO_HOME=/tmp/ko-oracle ./luajit xpointer-oracle.lua <book.epub> <out.json> [every] [dom_version]
require("setupkoenv")
package.path = "spec/unit/?.lua;" .. package.path
require("commonrequire")
local JSON = require("json")
local InitArray = require("json.util").InitArray
local DocumentRegistry = require("document/documentregistry")

local epub, outpath, every, dom_version = arg[1], arg[2], tonumber(arg[3] or "1"), tonumber(arg[4] or "0")
assert(epub and outpath, "usage: xpointer-oracle.lua <book.epub> <out.json> [every] [dom_version]")

local doc = assert(DocumentRegistry:openDocument(epub), "cannot open " .. epub)
if dom_version > 0 then
    doc:requestDomVersion(dom_version)
else
    doc:requestDomVersion(doc:getLatestDomVersion())
end
-- What ReaderTypeset:onReadSettings() applies to a book KOReader opens for
-- the first time (frontend/apps/reader/modules/readertypeset.lua): the
-- default stylesheet, embedded CSS and fonts, 'web' block rendering mode.
doc:setStyleSheet(doc.default_css)
doc:setEmbeddedStyleSheet(1)
doc:setEmbeddedFonts(1)
doc:setBlockRenderingFlags(0x7FFFFFFF)
doc:setRenderDPI(96)
doc:setTxtPreFormatted(1)
doc:render()

local result = {
    epub = epub:match("([^/]+)$"),
    dom_version_requested = dom_version > 0 and dom_version or doc:getLatestDomVersion(),
    dom_version_latest = doc:getLatestDomVersion(),
    dom_version_normalized = doc:getDomVersionWithNormalizedXPointers(),
    stylesheet = doc.default_css,
    block_rendering_flags = 0x7FFFFFFF,
    every = every,
    fragments = InitArray({}),
}

local single = not doc:isXPointerInDocument("/body/DocFragment[2]")
local n = 1
while doc:isXPointerInDocument("/body/DocFragment[" .. n .. "]") do
    local prefix = single and "/body/DocFragment/" or ("/body/DocFragment[" .. n .. "]/")
    local fragment = { index = n - 1, docfragment = n, words = InitArray({}) }
    local xp = doc:getNextVisibleWordStart(prefix .. "body")
    local seen = 0
    while xp and xp:sub(1, #prefix) == prefix do
        local xp_end = doc:getNextVisibleWordEnd(xp)
        if xp_end and xp_end:sub(1, #prefix) == prefix then
            if seen % every == 0 then
                table.insert(fragment.words, {
                    xp = xp,
                    xp_end = xp_end,
                    text = doc:getTextFromXPointers(xp, xp_end),
                })
            end
            seen = seen + 1
        end
        xp = doc:getNextVisibleWordStart(xp)
    end
    fragment.word_count = seen
    table.insert(result.fragments, fragment)
    n = n + 1
end
doc:close()

local out = assert(io.open(outpath, "w"))
out:write((JSON.encode(result):gsub("\\/", "/")))
out:close()
print(string.format("wrote %s: %d fragments", outpath, #result.fragments))
