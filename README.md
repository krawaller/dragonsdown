# Dragons Down

Extracts the Dragons Down rulebook PDFs in `pdf/` into structured JSON in `data/`.

Each output file is a flat array of `{ level, title, content }` entries, where `level` (1–4) reflects the heading hierarchy in the source PDF.

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
