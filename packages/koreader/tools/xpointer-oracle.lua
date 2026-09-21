-- crengine's own pointers for the visible words of an EPUB, the ground truth
-- @prose-reader/koreader is tested against. Written against KOReader's
-- document API and run with the headless harness of its unit tests:
--
--   cd <koreader-release>/lib/koreader          # with spec/unit copied in
--   KO_HOME=/tmp/ko-oracle SDL_VIDEODRIVER=dummy LD_LIBRARY_PATH=$PWD/libs \
--     ./luajit xpointer-oracle.lua <book.epub> <out.json> [max_words] [dom_version]
--
-- For every spine item (one DocFragment each), every visible word's start and
-- end pointer and the text crengine reads between them. max_words caps the
-- words kept per spine item, sampled evenly from the first one (0 keeps them
-- all). dom_version selects a crengine DOM version (default: the latest one).
--
-- out.json, as src/tests/epub.ts reads it:
--   {"epub", "domVersion", "stylesheet", "blockRenderingFlags",
--    "fragments": [{"index", "wordCount", "every", "words": [[xp, xpEnd, text], ...]}]}
require("setupkoenv")
package.path = "spec/unit/?.lua;" .. package.path
require("commonrequire")
local DocumentRegistry = require("document/documentregistry")

-- KOReader's "web" block rendering mode, the default for a book it opens for
-- the first time
local BLOCK_RENDERING_FLAGS = 0x7FFFFFFF

local function fail(message)
    io.stderr:write(message .. "\n")
    io.stderr:write("usage: xpointer-oracle.lua <book.epub> <out.json> [max_words] [dom_version]\n")
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
local function openBook(path, domVersion)
    local doc = DocumentRegistry:openDocument(path)
    if not doc then fail("cannot open " .. path) end
    doc:requestDomVersion(domVersion > 0 and domVersion or doc:getLatestDomVersion())
    doc:setStyleSheet(doc.default_css)
    doc:setEmbeddedStyleSheet(1)
    doc:setEmbeddedFonts(1)
    doc:setBlockRenderingFlags(BLOCK_RENDERING_FLAGS)
    doc:setRenderDPI(96)
    doc:setTxtPreFormatted(1)
    doc:render()
    return doc
end

-- The pointer prefix of every DocFragment: crengine numbers them from 1 and
-- leaves the index out when the book has a single one.
local function fragmentPrefixes(doc)
    local prefixes = {}
    local single = not doc:isXPointerInDocument("/body/DocFragment[2]")
    local n = 1
    while doc:isXPointerInDocument("/body/DocFragment[" .. n .. "]") do
        prefixes[n] = single and "/body/DocFragment/" or ("/body/DocFragment[" .. n .. "]/")
        n = n + 1
    end
    return prefixes
end

-- Every visible word under a fragment, as {start, end, text}
local function wordsUnder(doc, prefix)
    local words = {}
    local xp = doc:getNextVisibleWordStart(prefix .. "body")
    while xp and xp:sub(1, #prefix) == prefix do
        local xpEnd = doc:getNextVisibleWordEnd(xp)
        if xpEnd and xpEnd:sub(1, #prefix) == prefix then
            words[#words + 1] = { xp, xpEnd, doc:getTextFromXPointers(xp, xpEnd) or "" }
        end
        xp = doc:getNextVisibleWordStart(xp)
    end
    return words
end

-- At most maxWords of them, one in `every`, from the first
local function sample(words, maxWords)
    local every = 1
    if maxWords > 0 and #words > maxWords then
        every = math.ceil(#words / maxWords)
    end
    local kept = {}
    for i = 1, #words, every do
        kept[#kept + 1] = words[i]
    end
    return kept, every
end

local function writeBook(path, book)
    local out = assert(io.open(path, "w"))
    out:write("{\n")
    out:write('  "epub": ' .. jsonString(book.epub) .. ",\n")
    out:write('  "domVersion": ' .. book.domVersion .. ",\n")
    out:write('  "stylesheet": ' .. jsonString(book.stylesheet) .. ",\n")
    out:write('  "blockRenderingFlags": ' .. book.blockRenderingFlags .. ",\n")
    out:write('  "fragments": [\n')
    for i, fragment in ipairs(book.fragments) do
        out:write("    {\n")
        out:write('      "index": ' .. fragment.index .. ",\n")
        out:write('      "wordCount": ' .. fragment.wordCount .. ",\n")
        out:write('      "every": ' .. fragment.every .. ",\n")
        if #fragment.words == 0 then
            out:write('      "words": []\n')
        else
            out:write('      "words": [\n')
            for j, word in ipairs(fragment.words) do
                out:write("        [" .. jsonString(word[1]) .. ", " .. jsonString(word[2]) .. ", " .. jsonString(word[3]) .. "]")
                out:write(j < #fragment.words and ",\n" or "\n")
            end
            out:write("      ]\n")
        end
        out:write(i < #book.fragments and "    },\n" or "    }\n")
    end
    out:write("  ]\n}\n")
    out:close()
end

local bookPath, outPath = arg[1], arg[2]
if not (bookPath and outPath) then fail("missing arguments") end
local maxWords = tonumber(arg[3]) or 0
local domVersion = tonumber(arg[4]) or 0

local doc = openBook(bookPath, domVersion)
local book = {
    epub = bookPath:match("[^/]+$"),
    domVersion = domVersion > 0 and domVersion or doc:getLatestDomVersion(),
    stylesheet = doc.default_css,
    blockRenderingFlags = BLOCK_RENDERING_FLAGS,
    fragments = {},
}
for n, prefix in ipairs(fragmentPrefixes(doc)) do
    local words = wordsUnder(doc, prefix)
    local kept, every = sample(words, maxWords)
    book.fragments[n] = { index = n - 1, wordCount = #words, every = every, words = kept }
end
doc:close()

writeBook(outPath, book)
print(string.format("%s: %d spine items", outPath, #book.fragments))
