# Dragons Down

Extracts the Dragons Down rulebook PDFs in `pdf/` into structured JSON in `data/`, plus deduplicated images in `public/images/`.

Each output file is a flat array of `{ level, title, content }` entries:
- `level` — 1–4, reflects the heading hierarchy in the source PDF
- `title` — plain text
- `content` — **Markdown**: `**bold**`, `*italic*`, bullet lists (`- `), and image references like `![](/images/<sha1>.<ext>)`

## Setup

Requires Python 3.10+ (developed on 3.13).

```sh
python3 -m venv .venv
.venv/bin/pip install pymupdf
```

## Usage

Extract all PDFs in `pdf/` → `data/`:

```sh
.venv/bin/python scripts/extract.py --all
```

Extract a single PDF:

```sh
.venv/bin/python scripts/extract.py pdf/dragons_down_desolation_1.2.pdf
```

Inspect font/size/color distribution of a PDF (used to derive heading rules):

```sh
.venv/bin/python scripts/inspect_fonts.py pdf/dragons_down_core_1.2.pdf
```

## Heading conventions

Derived from the source styling:

| Level | Font            | Size | Color           | Example                       |
|-------|-----------------|------|-----------------|-------------------------------|
| 1     | BreatheFireIII  | 18   | red `#d2232a`   | `INTRODUCTION`                |
| 2     | BreatheFireIII  | 18   | brown `#4b281c` | `Lineage Advantages`          |
| 3     | MinionPro-Bold  | 16   | brown           | `Map`, `Hero Class Adjustments` |
| 4     | MinionPro-Bold  | 14   | black           | `Half-Elves`, `Assassin`      |

Levels can be sparse per document (e.g. Desolation has no L3 headings).

## Images

All embedded images are extracted to `public/images/<sha1>.<ext>` and referenced from markdown as `/images/<sha1>.<ext>`. Filenames are content-hashed, so duplicates across PDFs (and across pages) share a single file.

Filtering: an image is skipped if it covers >70% of any page it appears on, or appears on >50% of pages — this drops the parchment backgrounds and cover-page textures.

## Known quirks

- Empty-content L1/L2 headings are section banners with no body before the next subheading — not a bug.
- A few sections may have a stray image mid-content where the source had a floating illustration alongside the text.
- Consecutive bullets that lived in separate text blocks in the PDF end up with a blank line between them (`- foo\n\n- bar`). Most markdown renderers still treat them as one list, just slightly more spaced.
- The hyphen-wrap fix collapses `[word][-/] [word]` → `[word][-/][word]`. It correctly fixes ~20 line-wrap artifacts but slightly mis-collapses one heading in the core book (`Sneak - or-Make Noise`) where the source had unusual spacing.
