import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SpriteCell } from "@/components/CardSprite";
import { RulebookLinks } from "@/components/RulebookLinks";
import { MAGIC_TYPES, getMagicTypeBySlug } from "@/lib/magic";
import {
  resolveMagicRulebookLinks,
  type RulebookLink,
} from "@/lib/rulebook-links";
import type { TTSClassSetupCube, TTSSpell, TTSSpellCard } from "@/lib/tts";
import {
  getClassesForMagicCube,
  getSpellsByMagic,
  type MagicCubeStartingClass,
} from "@/lib/tts/lookup";
import mapTiles from "../../../../data/extracted-from-tts/map-tiles.json";

export function generateStaticParams() {
  return MAGIC_TYPES.map((type) => ({ type: type.slug }));
}

export default async function MagicTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type: slug } = await params;
  const type = getMagicTypeBySlug(slug);
  if (!type) notFound();
  const entries = getSpellsByMagic(type.id);
  const classEntries = getClassesForMagicCube(type.id);
  const rulebookLinksByMagic = new Map(
    await Promise.all(
      MAGIC_TYPES.map(
        async (magicType) =>
          [
            magicType.id,
            await resolveMagicRulebookLinks(magicType.id, "core"),
          ] as const,
      ),
    ),
  );
  const rulebookLinks = rulebookLinksByMagic.get(type.id) ?? [];
  const icon = rulebookLinks.find((link) => Boolean(link.icon))?.icon;
  const magicIcons = magicIconMap(rulebookLinksByMagic);
  const colorLabel = type.label.replace(/ Magic$/, "");

  const mapTileConnectionsModule = await import(
    "../../../../data/manual/map-tile-connections.json"
  );
  const mapTileConnections = mapTileConnectionsModule.default as Record<
    string,
    { front: { paths: unknown[] }; back: { paths: unknown[] } }
  >;

  const tilesWithColorPaths = getTilesWithColorPaths(
    type.id,
    mapTiles as Array<{ name: string; terrain: string }>,
    mapTileConnections,
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/magic" className="hover:underline">
          Magic
        </Link>
      </div>

      <div className="mt-4 mb-8 flex flex-wrap items-center gap-4">
        <MagicIcon icon={icon} label={type.label} />
        <div>
          <h1 className="text-4xl font-bold">{type.label}</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {entries.length} spell{entries.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <RulebookLinks
        links={rulebookLinks}
        heading="Rulebook"
        className="mb-10 max-w-3xl"
      />

      {type.id !== "universal" && (
        <MagicCubeClasses
          colorLabel={colorLabel}
          entries={classEntries}
          magicIcons={magicIcons}
          className="mb-10 max-w-3xl"
        />
      )}

      {tilesWithColorPaths.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Map Tiles with {colorLabel} Secret Paths
          </h2>
          <div className="flex flex-wrap gap-2">
            {tilesWithColorPaths.map((tile) => {
              const params = new URLSearchParams({
                terrain: tile.terrain,
                tile: tile.name,
                side: tile.side ?? "front",
              });
              return (
                <Link
                  key={`${tile.name}-${tile.side}`}
                  href={`/map-tiles?${params.toString()}`}
                  className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  {tile.name}
                  {tile.frontHasColor && tile.backHasColor ? null : tile.backHasColor ? " (back)" : " (front)"}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-4">Spells</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {entries.map((entry) => {
            const spell = entry.spells[0];
            const card = spell?.spellCards[0] ?? spell?.cards[0];
            return (
              <section key={entry.slug} className="flex flex-col gap-2">
                <Link
                  href={`/spells/${entry.slug}`}
                  className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
                  aria-label={`View ${entry.name}`}
                >
                  {card ? (
                    <SpriteCell card={card} className="w-full" />
                  ) : (
                    <span className="block w-full aspect-[5/7]" />
                  )}
                </Link>
                <div>
                  <h3 className="text-base font-semibold">
                    <Link
                      href={`/spells/${entry.slug}`}
                      className="hover:underline"
                    >
                      {entry.name}
                    </Link>
                  </h3>
                  {spell && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {copySummary(spell)}
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function MagicCubeClasses({
  colorLabel,
  entries,
  magicIcons,
  className = "",
}: {
  colorLabel: string;
  entries: MagicCubeStartingClass[];
  magicIcons: Map<string, string>;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="text-xl font-semibold mb-4">
        Classes With {colorLabel} Cubes
      </h2>
      <div className="rounded border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
        {entries.map((entry) => (
          <div
            key={entry.slug}
            className="grid gap-2 p-3 sm:grid-cols-[10rem_1fr]"
          >
            <Link
              href={`/classes/${entry.slug}`}
              className="font-medium hover:underline"
            >
              {entry.name}
            </Link>
            <ul className="space-y-1 text-sm text-zinc-500 dark:text-zinc-400">
              {entry.sides.map((side) => (
                <li key={side.side} className="flex items-center gap-2">
                  <span className="capitalize">{side.side}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {side.cubes.map((cube, index) => (
                      <MagicCube
                        key={`${side.side}-${index}-${classSetupCubeLabel(cube)}`}
                        cube={cube}
                        magicIcons={magicIcons}
                      />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function MagicCube({
  cube,
  magicIcons,
}: {
  cube: TTSClassSetupCube;
  magicIcons: Map<string, string>;
}) {
  const colors = classSetupCubeColors(cube);
  const label = classSetupCubeLabel(cube);
  return (
    <span
      className="inline-flex h-7 items-center gap-0.5 rounded border border-zinc-200 bg-white px-1.5 align-middle dark:border-zinc-800 dark:bg-zinc-950"
      title={label}
      role="img"
      aria-label={label}
    >
      {Array.from({ length: cube.count }, (_, index) => (
        <MagicCubeFace key={index} colors={colors} magicIcons={magicIcons} />
      ))}
    </span>
  );
}

function MagicCubeFace({
  colors,
  magicIcons,
}: {
  colors: string[];
  magicIcons: Map<string, string>;
}) {
  if (colors.length <= 1) {
    const color = colors[0] ?? "unknown";
    return (
      <MagicCubeShell>
        <MagicCubeImage color={color} icon={magicIcons.get(color)} />
      </MagicCubeShell>
    );
  }

  const [first, second] = colors;
  return (
    <MagicCubeShell>
      <MagicCubeImage color={first} icon={magicIcons.get(first)} clip="left" />
      <MagicCubeImage
        color={second}
        icon={magicIcons.get(second)}
        clip="right"
      />
    </MagicCubeShell>
  );
}

function MagicCubeShell({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block h-5 w-5 overflow-hidden bg-zinc-100 dark:bg-zinc-900">
      {children}
    </span>
  );
}

function MagicCubeImage({
  color,
  icon,
  className = "absolute left-1/2 top-1/2 h-[1.2375rem] w-[1.2375rem] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-none border-0",
  clip,
}: {
  color: string;
  icon?: string;
  className?: string;
  clip?: "left" | "right";
}) {
  const clipPath =
    clip === "left"
      ? "inset(0 50% 0 0)"
      : clip === "right"
        ? "inset(0 0 0 50%)"
        : undefined;
  if (!icon) {
    return (
      <span
        className={`${className} inline-block bg-zinc-100 dark:bg-zinc-900`}
        style={clipPath ? { clipPath } : undefined}
        aria-hidden="true"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon}
      alt=""
      className={`${className} inline-block bg-zinc-100 object-contain dark:bg-zinc-900`}
      style={clipPath ? { clipPath } : undefined}
      data-color={color}
    />
  );
}

function classSetupCubeColors(cube: TTSClassSetupCube): string[] {
  if (cube.colors?.length) return cube.colors.map(normalizeMagicCubeColor);
  return [normalizeMagicCubeColor(cube.color)];
}

function classSetupCubeLabel(cube: TTSClassSetupCube): string {
  const color = cube.colors?.length
    ? cube.colors.map(classSetupCubeColorLabel).join(" or ")
    : classSetupCubeColorLabel(cube.color);
  return `${cube.count} ${color} ${cube.type}`;
}

function classSetupCubeColorLabel(color: string | undefined): string {
  return color === "any" ? "any color" : (color ?? "unknown");
}

function normalizeMagicCubeColor(color: string | undefined): string {
  if (color === "any") return "universal";
  return color === "grey" ? "gray" : (color ?? "unknown");
}

function magicIconMap(
  linksByMagic: Map<string, RulebookLink[]>,
): Map<string, string> {
  const icons = new Map<string, string>();
  for (const type of MAGIC_TYPES) {
    const icon = linksByMagic
      .get(type.id)
      ?.find((link) => Boolean(link.icon))?.icon;
    if (icon) icons.set(type.id, icon);
  }
  return icons;
}

function copySummary(spell: TTSSpell): string {
  return [
    copyCountLabel("Spells", spellCopies(spell.spellCards)),
    copyCountLabel("Hero Starting", spellCopies(spell.startingSpellCards)),
  ].join(" · ");
}

function spellCopies(cards: TTSSpellCard[]): number {
  return cards.reduce((total, card) => total + card.copies, 0);
}

function copyCountLabel(label: string, copies: number): string {
  return `${label} ${copies} cop${copies === 1 ? "y" : "ies"}`;
}

function MagicIcon({ icon, label }: { icon?: string; label: string }) {
  if (!icon) {
    return (
      <span
        className="block h-14 w-14 rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
        aria-hidden="true"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon}
      alt={`${label} icon`}
      className="block h-14 w-14 rounded border border-zinc-200 bg-zinc-100 object-contain p-1 dark:border-zinc-800 dark:bg-zinc-900"
    />
  );
}

function getTilesWithColorPaths(
  colorId: string,
  mapTiles: Array<{ name: string; terrain: string }>,
  connections: Record<string, { front: { paths: unknown[] }; back: { paths: unknown[] } }>,
): Array<{ name: string; terrain: string; side?: string; frontHasColor: boolean; backHasColor: boolean }> {
  const tilesWithColor: Array<{
    name: string;
    terrain: string;
    side?: string;
    frontHasColor: boolean;
    backHasColor: boolean;
  }> = [];
  const processedTiles = new Set<string>();

  for (const tile of mapTiles) {
    if (processedTiles.has(tile.name)) continue;
    processedTiles.add(tile.name);

    const tileConnections = connections[tile.name];
    if (!tileConnections) continue;

    const frontHasColor = hasColorInPaths(tileConnections.front?.paths, colorId);
    const backHasColor = hasColorInPaths(tileConnections.back?.paths, colorId);

    if (frontHasColor || backHasColor) {
      // If only one side has the color, link to that side
      const side = frontHasColor && !backHasColor ? "front" : backHasColor && !frontHasColor ? "back" : "front";
      
      tilesWithColor.push({
        name: tile.name,
        terrain: tile.terrain,
        side,
        frontHasColor,
        backHasColor,
      });
    }
  }

  return tilesWithColor;
}

function hasColorInPaths(paths: unknown[] | undefined, colorId: string): boolean {
  if (!Array.isArray(paths)) return false;
  return paths.some((path) => {
    if (Array.isArray(path) && path.length >= 3) {
      return path[2] === colorId;
    }
    return false;
  });
}
