-- crengine's verdict on pointers @prose-reader/koreader emits: whether each
-- resolves in KOReader, and the text it reads between a pair. Written against
-- KOReader's document API and run with the headless harness of its unit tests:
--
--   cd <koreader-release>/lib/koreader          # with spec/unit copied in
--   KO_HOME=/tmp/ko-oracle SDL_VIDEODRIVER=dummy LD_LIBRARY_PATH=$PWD/libs \
--     ./luajit xpointer-check.lua <book.epub> <pairs.json> <out.json>
--
-- pairs.json, written by `XPOINTER_CHECK_EMIT_DIR=<dir> vitest run
-- src/crengineCheck.test.ts`: {"pairs": [[xp0], [xp0, xp1], ...]}, a lone
-- pointer being checked on its own.
-- out.json, as src/crengineCheck.test.ts reads it:
--   {"epub", "domVersion", "results": [{"xp0", "xp1", "valid0", "valid1", "text"}]}
-- with "valid1" and "text" only for pairs, and "text" only when both resolve.
require("setupkoenv")
package.path = "spec/unit/?.lua;" .. package.path
require("commonrequire")
local JSON = require("json")
local DocumentRegistry = require("document/documentregistry")

-- KOReader's "web" block rendering mode, the default for a book it opens for
-- the first time
local BLOCK_RENDERING_FLAGS = 0x7FFFFFFF

local function fail(message)
    io.stderr:write(message .. "\n")
    io.stderr:write("usage: xpointer-check.lua <book.epub> <pairs.json> <out.json>\n")
    os.exit(1)
end

-- A JSON string with the escapes JSON.stringify produces, so a file written
-- here matches one written from the test suite byte for byte.
local function jsonString(value)
    local escaped = value:gsub('[%z\1-\31"\\]', function(char)
        if char == '"' then return '\\"' end
        if char == "\\" then return "\\\\" end
        if char == "\n" then return "\\n" end
        if char == "\r" then return "\\r" end
        if char == "\t" then return "\\t" end
        if char == "\b" then return "\\b" end
        if char == "\f" then return "\\f" end
        return string.format("\\u%04x", char:byte())
    end)
    return '"' .. escaped .. '"'
end

-- The book as KOReader renders it on first opening
-- (frontend/apps/reader/modules/readertypeset.lua, onReadSettings): the
-- default stylesheet, embedded CSS and fonts, web block rendering.
local function openBook(path)
    local doc = DocumentRegistry:openDocument(path)
    if not doc then fail("cannot open " .. path) end
    doc:requestDomVersion(doc:getLatestDomVersion())
    doc:setStyleSheet(doc.default_css)
    doc:setEmbeddedStyleSheet(1)
    doc:setEmbeddedFonts(1)
    doc:setBlockRenderingFlags(BLOCK_RENDERING_FLAGS)
    doc:setRenderDPI(96)
    doc:setTxtPreFormatted(1)
    doc:render()
    return doc
end

local function readPairs(path)
    local file = assert(io.open(path, "r"))
    local input = JSON.decode(file:read("*a"))
    file:close()
    return input.pairs
end

-- What crengine makes of a pointer, or of a pair of them
local function check(doc, pair)
    local xp0, xp1 = pair[1], pair[2]
    local result = { xp0 = xp0, xp1 = xp1, valid0 = doc:isXPointerInDocument(xp0) }
    if xp1 then
        result.valid1 = doc:isXPointerInDocument(xp1)
        if result.valid0 and result.valid1 then
            result.text = doc:getTextFromXPointers(xp0, xp1)
        end
    end
    return result
end

local function writeResults(path, book)
    local out = assert(io.open(path, "w"))
    out:write("{\n")
    out:write('  "epub": ' .. jsonString(book.epub) .. ",\n")
    out:write('  "domVersion": ' .. book.domVersion .. ",\n")
    out:write('  "results": [\n')
    for i, result in ipairs(book.results) do
        local line = '    {"xp0": ' .. jsonString(result.xp0)
        line = line .. ', "xp1": ' .. (result.xp1 and jsonString(result.xp1) or "null")
        line = line .. ', "valid0": ' .. tostring(result.valid0)
        if result.xp1 then
            line = line .. ', "valid1": ' .. tostring(result.valid1)
        end
        if result.text then
            line = line .. ', "text": ' .. jsonString(result.text)
        end
        out:write(line .. (i < #book.results and "},\n" or "}\n"))
    end
    out:write("  ]\n}\n")
    out:close()
end

local bookPath, pairsPath, outPath = arg[1], arg[2], arg[3]
if not (bookPath and pairsPath and outPath) then fail("missing arguments") end

local doc = openBook(bookPath)
local book = {
    epub = bookPath:match("[^/]+$"),
    domVersion = doc:getLatestDomVersion(),
    results = {},
}
for i, pair in ipairs(readPairs(pairsPath)) do
    book.results[i] = check(doc, pair)
end
doc:close()

writeResults(outPath, book)
print(string.format("%s: %d results", outPath, #book.results))
