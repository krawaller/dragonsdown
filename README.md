# Dragons Down

A Next.js web app that presents the Dragons Down rulebooks, built from JSON extracted from the official PDFs.

- `pdf/` — source PDFs
- `data/` — extracted JSON (flat array of `{ level, title, content }`)
- `public/images/` — extracted, deduplicated images (served as `/images/<sha1>.<ext>`)
- `scripts/` — Python extractor (PyMuPDF)
- `src/` — Next.js App Router source

Each JSON entry:
- `level` — 1–4, reflects the heading hierarchy in the source PDF
- `title` — plain text
- `content` — **Markdown**: `**bold**`, `*italic*`, bullet lists (`- `), and image references like `![](/images/<sha1>.<ext>)`

## Web app (Next.js)

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · ESLint.

```sh
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## PDF extractor (Python)

Requires Python 3.10+ (developed on 3.13).

```sh
python3 -m venv .venv
.venv/bin/pip install pymupdf
```

Extract all PDFs in `pdf/` → `data/`, then apply the transform rules:

```sh
npm run extract     # extract PDFs to data/, then run transform automatically
npm run transform   # re-apply transform.ts to data/ without re-extracting
```

Extract a single PDF (call the Python script directly; you'll then want to run `npm run transform` to re-apply rules):

```sh
.venv/bin/python scripts/extract.py pdf/desolation_1.2.pdf
```

Inspect font/size/color distribution of a PDF (used to derive heading rules):

```sh
npm run inspect-fonts pdf/core_1.2.pdf
```

## Transforms

`transform.ts` at the repo root is a typed list of rules ("manual massaging") that mutate the extracted JSON in place. The rules run as a separate script after extraction, so:

- The state in `data/` reflects what the app actually renders — no runtime cost.
- Adding or changing a rule and running `npm run transform` produces a git diff that shows exactly what the rule did. That diff is the audit trail.
- Rules apply in array order; later rules see the output of earlier ones (no merge semantics — last-write-wins by virtue of order).

Currently supported ops: `ignoreImages` (drops `![](/images/<hash>.<ext>)` refs by hash).

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
