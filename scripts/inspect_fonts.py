"""Dump distinct (size, font, color) combinations and a sample text for each.

Usage: python scripts/inspect_fonts.py data/downloaded-pdf/Dragons_Down_Desolation_single_pages.pdf
"""
from __future__ import annotations

import sys
from collections import defaultdict

import fitz


def main(path: str) -> None:
    doc = fitz.open(path)
    samples: dict[tuple[float, str, int], list[str]] = defaultdict(list)
    counts: dict[tuple[float, str, int], int] = defaultdict(int)

    for page in doc:
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if block.get("type") != 0:
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    key = (round(span["size"], 1), span["font"], span["color"])
                    text = span["text"].strip()
                    if not text:
                        continue
                    counts[key] += 1
                    if len(samples[key]) < 4:
                        samples[key].append(text)

    for key in sorted(counts, key=lambda k: (-k[0], k[1], k[2])):
        size, font, color = key
        hexcolor = f"#{color:06x}"
        print(f"size={size:5} font={font:25} color={hexcolor} count={counts[key]:5}  e.g.  {samples[key]}")


if __name__ == "__main__":
    main(sys.argv[1])
