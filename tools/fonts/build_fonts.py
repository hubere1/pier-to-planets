"""
Baut die Schriften der App (docs/06 §9, D-022, D-025). Einmalig lokal ausführen, Ergebnis
liegt eingecheckt unter app/src/ui/fonts/. Braucht Python 3 mit fontTools und brotli.

    python tools/fonts/build_fonts.py

1. „Pier Pixel“  = m6x11plus (Daniel Linssen, frei mit Namensnennung) + eigene Glyphen für
   U+00A0, U+202F (geschützte Leerzeichen, Lehre 12), · und € – im selben 64-Einheiten-Raster.
2. „Pier Pixel Klein“ = eigene 5×7-Schrift (D-025), 1 Pixel = 100 Einheiten, Em = 10 Pixel.
3. Atkinson Hyperlegible Next (SIL OFL 1.1) als WOFF2, auf Latein + Latin-1 + Satzzeichen begrenzt.
"""
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "tools" / "fonts" / "src"
OUT = ROOT / "app" / "src" / "ui" / "fonts"


def pixel_glyph(rows: list[str], unit: int, baseline_row: int, glyph_set=None):
    """Zeichnet ein Bitmap (Zeilen von oben, '#' = Pixel) als Rechteck-Konturen."""
    pen = TTGlyphPen(glyph_set)
    height = len(rows)
    for r, line in enumerate(rows):
        y0 = (height - 1 - r - baseline_row) * unit
        c = 0
        while c < len(line):
            if line[c] != "#":
                c += 1
                continue
            start = c
            while c < len(line) and line[c] == "#":
                c += 1
            x0, x1 = start * unit, c * unit
            pen.moveTo((x0, y0))
            pen.lineTo((x0, y0 + unit))
            pen.lineTo((x1, y0 + unit))
            pen.lineTo((x1, y0))
            pen.closePath()
    return pen.glyph()


# ── 1. Pier Pixel ─────────────────────────────────────────────────────────────
EURO = [
    "..####.",
    ".#....#",
    "#......",
    "#####..",
    "#......",
    "#####..",
    "#......",
    ".#....#",
    "..####.",
]


MIDDOT = ["..", "..", "..", "..", "..", "##", "##", "..", "..", "..", ".."]


def build_pier_pixel() -> None:
    f = TTFont(SRC / "m6x11plus.ttf")
    unit = 64
    glyf, hmtx, cmap = f["glyf"], f["hmtx"], f["cmap"]
    order = f.getGlyphOrder()
    space_adv = hmtx["space"][0]
    additions = {
        "uni00A0": (0x00A0, None, space_adv),
        "uni202F": (0x202F, None, 3 * unit),
        "Euro": (0x20AC, EURO, 8 * unit),
        "periodcentered": (0x00B7, MIDDOT, 4 * unit),
    }
    for name, (code, rows, adv) in additions.items():
        if name in glyf:
            continue
        if rows is None:
            glyf[name] = TTGlyphPen(None).glyph()
        else:
            # Ziffern stehen in m6x11plus auf der Grundlinie, 11 Pixel hoch; € 9 hoch, mittig.
            glyf[name] = pixel_glyph(rows, unit, baseline_row=0 if rows is MIDDOT else -1)
        if name not in order:
            order.append(name)
        hmtx[name] = (adv, 0)
        for table in cmap.tables:
            if table.isUnicode():
                table.cmap[code] = name
    f.setGlyphOrder(order)
    glyf.glyphOrder = order
    f["maxp"].numGlyphs = len(order)
    names = f["name"]
    for rec in names.names:
        if rec.nameID in (1, 4, 16):
            rec.string = "Pier Pixel"
        elif rec.nameID == 6:
            rec.string = "PierPixel-Regular"
    f.flavor = "woff2"
    f.save(OUT / "pier-pixel.woff2")


# ── 2. Pier Pixel Klein (5 × 7, eigene Glyphen) ──────────────────────────────
# Jede Glyphe: 7 Zeilen über der Grundlinie + optional 2 Unterlängen-Zeilen.
SMALL: dict[str, list[str]] = {
    "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
    "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
    "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
    "3": [".###.", "#...#", "....#", "..##.", "....#", "#...#", ".###."],
    "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
    "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
    "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
    "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
    "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
    "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
    "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "B": ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
    "C": [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
    "D": ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
    "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    "F": ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
    "G": [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".####"],
    "H": ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "I": ["###", ".#.", ".#.", ".#.", ".#.", ".#.", "###"],
    "J": ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
    "K": ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
    "L": ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
    "M": ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
    "N": ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
    "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "P": ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
    "Q": [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
    "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    "S": [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
    "T": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
    "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "V": ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
    "W": ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
    "X": ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
    "Y": ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
    "Z": ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
    "a": [".....", ".....", ".###.", "....#", ".####", "#...#", ".####"],
    "b": ["#....", "#....", "####.", "#...#", "#...#", "#...#", "####."],
    "c": [".....", ".....", ".####", "#....", "#....", "#....", ".####"],
    "d": ["....#", "....#", ".####", "#...#", "#...#", "#...#", ".####"],
    "e": [".....", ".....", ".###.", "#...#", "#####", "#....", ".####"],
    "f": ["..##", ".#..", "####", ".#..", ".#..", ".#..", ".#.."],
    "g": [".....", ".....", ".####", "#...#", "#...#", ".####", "....#", "....#", ".###."],
    "h": ["#....", "#....", "####.", "#...#", "#...#", "#...#", "#...#"],
    "i": [".#.", "...", "##.", ".#.", ".#.", ".#.", "###"],
    "j": ["..#", "...", ".##", "..#", "..#", "..#", "..#", "#.#", ".#."],
    "k": ["#...", "#...", "#..#", "#.#.", "##..", "#.#.", "#..#"],
    "l": ["##.", ".#.", ".#.", ".#.", ".#.", ".#.", "###"],
    "m": [".....", ".....", "##.#.", "#.#.#", "#.#.#", "#.#.#", "#.#.#"],
    "n": [".....", ".....", "####.", "#...#", "#...#", "#...#", "#...#"],
    "o": [".....", ".....", ".###.", "#...#", "#...#", "#...#", ".###."],
    "p": [".....", ".....", "####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
    "q": [".....", ".....", ".####", "#...#", "#...#", ".####", "....#", "....#", "....#"],
    "r": [".....", ".....", "#.##.", "##..#", "#....", "#....", "#...."],
    "s": [".....", ".....", ".####", "#....", ".###.", "....#", "####."],
    "t": [".#..", ".#..", "####", ".#..", ".#..", ".#..", "..##"],
    "u": [".....", ".....", "#...#", "#...#", "#...#", "#...#", ".####"],
    "v": [".....", ".....", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
    "w": [".....", ".....", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
    "x": [".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
    "y": [".....", ".....", "#...#", "#...#", "#...#", ".####", "....#", "....#", ".###."],
    "z": [".....", ".....", "#####", "...#.", "..#..", ".#...", "#####"],
    "Ä": ["#...#", ".###.", "#...#", "#####", "#...#", "#...#", "#...#"],
    "Ö": ["#...#", ".###.", "#...#", "#...#", "#...#", "#...#", ".###."],
    "Ü": ["#...#", ".....", "#...#", "#...#", "#...#", "#...#", ".###."],
    "ä": [".....", ".#.#.", ".....", ".###.", "....#", "#...#", ".####"],
    "ö": [".....", ".#.#.", ".....", ".###.", "#...#", "#...#", ".###."],
    "ü": [".....", ".#.#.", ".....", "#...#", "#...#", "#...#", ".####"],
    "ß": [".##..", "#..#.", "#..#.", "#.#..", "#..#.", "#...#", "#.##."],
    ".": [".", ".", ".", ".", ".", ".", "#"],
    ",": ["..", "..", "..", "..", "..", "..", ".#", "#."],
    ":": [".", ".", "#", ".", ".", ".", "#"],
    ";": ["..", "..", ".#", "..", "..", "..", ".#", "#."],
    "!": ["#", "#", "#", "#", "#", ".", "#"],
    "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
    "-": ["....", "....", "....", "####", "....", "....", "...."],
    "+": [".....", ".....", "..#..", "..#..", "#####", "..#..", "..#.."],
    "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
    "%": ["##..#", "##..#", "...#.", "..#..", ".#...", "#..##", "#..##"],
    "(": [".#", "#.", "#.", "#.", "#.", "#.", ".#"],
    ")": ["#.", ".#", ".#", ".#", ".#", ".#", "#."],
    "'": ["#", "#", ".", ".", ".", ".", "."],
    '"': ["#.#", "#.#", "...", "...", "...", "...", "..."],
    "·": [".", ".", ".", "#", ".", ".", "."],
    "×": [".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
    "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
    "<": ["...#", "..#.", ".#..", "#...", ".#..", "..#.", "...#"],
    ">": ["#...", ".#..", "..#.", "...#", "..#.", ".#..", "#..."],
    "€": [".###.", "#...#", "####.", "#....", "####.", "#...#", ".###."],
}


def build_klein() -> None:
    unit = 100
    em = 10 * unit
    order = [".notdef", "space", "uni00A0", "uni202F"]
    cmap = {0x20: "space", 0xA0: "uni00A0", 0x202F: "uni202F"}
    widths = {".notdef": 6 * unit, "space": 3 * unit, "uni00A0": 3 * unit, "uni202F": 2 * unit}
    glyphs = {
        ".notdef": pixel_glyph(["#####", "#...#", "#...#", "#...#", "#...#", "#...#", "#####"], unit, 0),
        "space": TTGlyphPen(None).glyph(),
        "uni00A0": TTGlyphPen(None).glyph(),
        "uni202F": TTGlyphPen(None).glyph(),
    }
    for ch, rows in SMALL.items():
        name = f"uni{ord(ch):04X}"
        descender = len(rows) - 7
        glyphs[name] = pixel_glyph(rows, unit, baseline_row=descender)
        widths[name] = (max(len(r) for r in rows) + 1) * unit
        order.append(name)
        cmap[ord(ch)] = name
    fb = FontBuilder(em, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics({n: (widths[n], 0) for n in order})
    fb.setupHorizontalHeader(ascent=8 * unit, descent=-2 * unit)
    fb.setupNameTable(
        {
            "familyName": "Pier Pixel Klein",
            "styleName": "Regular",
            "copyright": "Pier to Planets – eigenes Werk (D-025)",
        }
    )
    fb.setupOS2(sTypoAscender=8 * unit, sTypoDescender=-2 * unit, usWinAscent=8 * unit, usWinDescent=2 * unit)
    fb.setupPost()
    fb.font.flavor = "woff2"
    fb.save(OUT / "pier-pixel-klein.woff2")


# ── 3. Atkinson Hyperlegible Next ────────────────────────────────────────────
def build_atkinson() -> None:
    f = TTFont(SRC / "AtkinsonHyperlegibleNext[wght].ttf")
    opts = Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    sub = Subsetter(opts)
    ranges = list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + [
        0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E,
        0x2022, 0x2026, 0x202F, 0x20AC, 0x2192, 0x2212, 0x00D7,
    ]
    sub.populate(unicodes=ranges)
    sub.subset(f)
    f.flavor = "woff2"
    f.save(OUT / "atkinson-hyperlegible-next.woff2")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    build_pier_pixel()
    build_klein()
    build_atkinson()
    for p in sorted(OUT.glob("*.woff2")):
        print(f"{p.relative_to(ROOT)}: {p.stat().st_size} Bytes")
