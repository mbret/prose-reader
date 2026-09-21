"""Copies an EPUB keeping only its package, navigation and content documents (no images, fonts, media, css)."""
import zipfile, sys, os, re
src, dst = sys.argv[1], sys.argv[2]
KEEP_EXT = (".opf", ".ncx", ".xhtml", ".html", ".htm", ".xml", ".svg")
DROP_EXT = (".css",)
with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, "w") as zout:
    names = zin.namelist()
    zout.writestr(zipfile.ZipInfo("mimetype"), "application/epub+zip", compress_type=zipfile.ZIP_STORED)
    for name in names:
        if name == "mimetype" or name.endswith("/"):
            continue
        low = name.lower()
        keep = low == "meta-inf/container.xml" or (low.endswith(KEEP_EXT) and not low.endswith(DROP_EXT))
        if not keep:
            continue
        data = zin.read(name)
        zout.writestr(name, data, compress_type=zipfile.ZIP_DEFLATED)
print(dst, os.path.getsize(dst))
