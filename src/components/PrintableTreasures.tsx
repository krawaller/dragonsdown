"use client";

import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import type { Section } from "@/lib/rulebooks";
import type { TTSCardImage } from "@/lib/tts";
import {
  packTreasureRows,
  type TreasurePrintRow,
} from "@/lib/treasure-print-layout";
import { RulebookContent } from "./RulebookContent";
import "./PrintableTreasures.css";

type TreasureEntry = { section: Section; card: TTSCardImage | null };

export function PrintableTreasures({ entries }: { entries: TreasureEntry[] }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(38);
  const [textSize, setTextSize] = useState(9);
  const [printing, setPrinting] = useState(false);
  const [rows, setRows] = useState<TreasurePrintRow[]>(() =>
    entries.map((_, index) => [{ index, textWidth: 0 }]),
  );

  useEffect(() => {
    const sheet = sheetRef.current;
    const flow = sheet?.querySelector<HTMLElement>(".treasure-flow");
    if (!sheet || !flow) return;
    let cancelled = false;
    let frame = 0;
    let previousWidth = 0;

    function fitEntries() {
      if (!sheet || !flow || cancelled) return;
      const width = flow.clientWidth;
      const rowElement = flow.querySelector<HTMLElement>(".treasure-row");
      const rowGap = rowElement
        ? parseFloat(getComputedStyle(rowElement).columnGap) || 0
        : 0;
      const textWidths: number[] = [];
      let cardWidth = 0;
      let entryGap = 0;
      for (const entry of sheet.querySelectorAll<HTMLElement>(
        ".treasure-entry",
      )) {
        const text = entry.querySelector<HTMLElement>(".treasure-text");
        const card = entry.querySelector<HTMLElement>(".treasure-front");
        if (!text || !card) continue;
        entryGap = parseFloat(getComputedStyle(entry).columnGap) || 0;
        cardWidth = card.getBoundingClientRect().width;
        const maximum = Math.max(1, width - cardWidth - entryGap);
        let lower = Math.min((25 * 96) / 25.4, maximum);
        let upper = maximum;
        const targetHeight = card.offsetHeight * 1.5;
        const previousTextWidth = text.style.width;
        for (let step = 0; step < 12; step += 1) {
          const candidate = (lower + upper) / 2;
          text.style.width = `${candidate}px`;
          if (text.scrollHeight <= targetHeight) upper = candidate;
          else lower = candidate;
        }
        textWidths.push(Math.min(maximum, Math.ceil(upper)));
        text.style.width = previousTextWidth;
      }
      const nextRows = packTreasureRows(
        textWidths,
        width,
        cardWidth,
        entryGap,
        rowGap,
      );
      setRows((previous) =>
        JSON.stringify(previous) === JSON.stringify(nextRows)
          ? previous
          : nextRows,
      );
    }

    function scheduleFit() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fitEntries);
    }

    const observer = new ResizeObserver(() => {
      if (flow && flow.clientWidth !== previousWidth) {
        previousWidth = flow.clientWidth;
        scheduleFit();
      }
    });
    observer.observe(flow);
    scheduleFit();
    void document.fonts.ready.then(scheduleFit);
    const fitPrintRows = () => flushSync(fitEntries);
    window.addEventListener("beforeprint", fitPrintRows);
    window.addEventListener("afterprint", scheduleFit);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("beforeprint", fitPrintRows);
      window.removeEventListener("afterprint", scheduleFit);
    };
  }, [cardHeight, textSize, entries]);

  async function printTreasures() {
    setPrinting(true);
    try {
      await document.fonts.ready;
      await Promise.all(
        Array.from(sheetRef.current?.querySelectorAll("img") ?? []).map(
          (image) => image.decode().catch(() => undefined),
        ),
      );
      window.print();
    } finally {
      setPrinting(false);
    }
  }

  const style = {
    "--treasure-card-height": `${cardHeight}mm`,
    "--treasure-text-size": `${textSize}pt`,
  } as CSSProperties;

  return (
    <main className="printable-treasures" style={style}>
      <header className="treasure-toolbar">
        <Link href="/" className="treasure-back">
          <ArrowLeft size={16} aria-hidden="true" />
          All docs
        </Link>
        <div className="treasure-title-row">
          <div>
            <h1>All Treasures</h1>
            <p>{entries.length} treasures</p>
          </div>
          <button
            type="button"
            onClick={printTreasures}
            disabled={printing}
            title="Print treasures"
            aria-label="Print treasures"
          >
            <Printer size={18} aria-hidden="true" />
            {printing ? "Preparing..." : "Print"}
          </button>
        </div>
        <div className="treasure-controls">
          <label>
            Card height{" "}
            <input
              type="range"
              min="28"
              max="60"
              step="1"
              value={cardHeight}
              onChange={(event) => setCardHeight(Number(event.target.value))}
            />
            <output>{cardHeight} mm</output>
          </label>
          <label>
            Text size{" "}
            <input
              type="range"
              min="8"
              max="12"
              step="0.5"
              value={textSize}
              onChange={(event) => setTextSize(Number(event.target.value))}
            />
            <output>{textSize} pt</output>
          </label>
        </div>
      </header>
      <div className="treasure-paper" ref={sheetRef}>
        <div className="treasure-print-heading">
          <h1>All Treasures</h1>
          <span>Dragons Down</span>
        </div>
        <div className="treasure-flow">
          {rows.map((row) => (
            <div className="treasure-row" key={row[0].index}>
              {row.map(({ index, textWidth }) => {
                const { section, card } = entries[index];
                return (
                  <article
                    className="treasure-entry"
                    key={`${section.source}-${section.id}`}
                  >
                    <div className="treasure-front">
                      {card ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={card.faceURL}
                          alt={`${section.title} card front`}
                          loading="eager"
                          style={{
                            width: `${card.numWidth * 100}%`,
                            height: `${card.numHeight * 100}%`,
                            left: `${-card.col * 100}%`,
                            top: `${-card.row * 100}%`,
                          }}
                        />
                      ) : (
                        <span>{section.title}</span>
                      )}
                    </div>
                    <div
                      className="treasure-text"
                      style={{ width: textWidth || undefined }}
                    >
                      <div className="treasure-description">
                        <RulebookContent
                          nodes={
                            section.contentNodes ?? [
                              { kind: "markdown", markdown: section.content },
                            ]
                          }
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
