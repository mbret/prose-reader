-- KOReader's own document digests, the ground truth getKoreaderFileDigest and
-- getKoreaderFileNameDigest are tested against: util.partialMD5 of every file,
-- the digest KOReader keeps as partial_md5_checksum and syncs with the
-- "Binary" method, and the MD5 kosync takes of a file name with the
-- "Filename" method. Run with KOReader's LuaJIT:
--
--   cd <koreader-release>/lib/koreader
--   KO_HOME=/tmp/ko-digest LD_LIBRARY_PATH=$PWD/libs \
--     ./luajit document-digest.lua <inputs dir> <out.json>
--
-- <inputs dir>, written by `KOREADER_DIGEST_EMIT_DIR=<dir> vitest run
-- src/digest.test.ts`: inputs.json, {"files": [name, ...], "fileNames":
-- [name, ...]}, and the files under files/.
-- out.json, as src/digest.test.ts reads it:
--   {"koreader", "files": [{"name", "digest"}], "fileNames": [{"fileName", "digest"}]}
require("setupkoenv")
local JSON = require("json")
local Version = require("version")
local md5 = require("ffi/sha2").md5
local util = require("util")

local function fail(message)
    io.stderr:write(message .. "\n")
    io.stderr:write("usage: document-digest.lua <inputs dir> <out.json>\n")
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

local function readInputs(path)
    local file = assert(io.open(path, "r"))
    local inputs = JSON.decode(file:read("*a"))
    file:close()
    return inputs
end

-- KOSync:getFileNameDigest (plugins/kosync.koplugin/main.lua)
local function fileNameDigest(path)
    local _, file_name = util.splitFilePathName(path)
    return md5(file_name)
end

local function writeDigests(path, digests)
    local out = assert(io.open(path, "w"))
    out:write("{\n")
    out:write('  "koreader": ' .. jsonString(digests.koreader) .. ",\n")
    out:write('  "files": [\n')
    for i, file in ipairs(digests.files) do
        out:write('    {"name": ' .. jsonString(file.name) .. ', "digest": ' .. jsonString(file.digest) .. "}")
        out:write(i < #digests.files and ",\n" or "\n")
    end
    out:write("  ],\n")
    out:write('  "fileNames": [\n')
    for i, entry in ipairs(digests.fileNames) do
        out:write('    {"fileName": ' .. jsonString(entry.fileName) .. ', "digest": ' .. jsonString(entry.digest) .. "}")
        out:write(i < #digests.fileNames and ",\n" or "\n")
    end
    out:write("  ]\n}\n")
    out:close()
end

local inputsDir, outPath = arg[1], arg[2]
if not (inputsDir and outPath) then fail("missing arguments") end

local inputs = readInputs(inputsDir .. "/inputs.json")
local digests = {
    koreader = Version:getCurrentRevision(),
    files = {},
    fileNames = {},
}
for i, name in ipairs(inputs.files) do
    local digest = util.partialMD5(inputsDir .. "/files/" .. name)
    if not digest then fail("cannot read " .. name) end
    digests.files[i] = { name = name, digest = digest }
end
for i, fileName in ipairs(inputs.fileNames) do
    digests.fileNames[i] = { fileName = fileName, digest = fileNameDigest(fileName) }
end

writeDigests(outPath, digests)
print(string.format("%s: %d files, %d file names", outPath, #digests.files, #digests.fileNames))
