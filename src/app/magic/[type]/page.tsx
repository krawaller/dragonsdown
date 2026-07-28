import Link from "next/link";
import { notFound } from "next/navigation";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MagicCube } from "@/components/MagicCube";
import { SpriteCell } from "@/components/CardSprite";
import { RulebookLinks } from "@/components/RulebookLinks";
import { MAGIC_TYPES, getMagicTypeBySlug } from "@/lib/magic";
import {
  resolveMagicRulebookLinks,
  type RulebookLink,
} from "@/lib/rulebook-links";
import { slugify } from "@/lib/slug";
import type { TTSClassSetupCube } from "@/lib/tts";
import {
  getClassesForMagicCube,
  getAllMapTiles,
  getSpellsByMagic,
  type MapTileEntry,
  type MagicCubeStartingClass,
} from "@/lib/tts/lookup";

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
  const rulebookLinks = await resolveMagicRulebookLinks(type.id);
  const icon = rulebookLinksByMagic
    .get(type.id)
    ?.find((link) => Boolean(link.icon))?.icon;
  const magicIcons = magicIconMap(rulebookLinksByMagic);
  const colorLabel = type.label.replace(/ Magic$/, "");

  const mapTileConnectionsModule =
    await import("../../../../data/manual/map-tile-connections.json");
  const mapTileConnections = mapTileConnectionsModule.default as Record<
    string,
    { front: { paths: unknown[] }; back: { paths: unknown[] } }
  >;

  const tilesWithColorPaths = getTilesWithColorPaths(
    type.id,
    getAllMapTiles(),
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

      <div className="space-y-6">
        <CollapsibleBox
          title="Spells"
          count={entries.length}
          countLabel={`${entries.length} spell${entries.length === 1 ? "" : "s"}`}
        >
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {entries.map((entry) => {
              const spell = entry.spells[0];
              const card = spell?.spellCards[0] ?? spell?.cards[0];
              return (
                <section key={entry.slug} className="flex flex-col gap-2">
                  <Link
                    href={`/spells/${entry.slug}`}
                    className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
                    aria-label={`View ${entry.name}`}
                  >
                    {card ? (
                      <SpriteCell card={card} className="w-full" />
                    ) : (
                      <span className="block aspect-[5/7] w-full" />
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
                  </div>
                </section>
              );
            })}
          </div>
        </CollapsibleBox>

        <CollapsibleBox
          title={`Map Tiles with ${colorLabel} Secret Paths`}
          count={tilesWithColorPaths.length}
          countLabel={`${tilesWithColorPaths.length} tile${tilesWithColorPaths.length === 1 ? "" : "s"}`}
        >
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
            {tilesWithColorPaths.map((tile) => (
              <MagicMapTileCard key={tile.slug} tile={tile} />
            ))}
          </div>
        </CollapsibleBox>

        {type.id !== "universal" && (
          <MagicCubeClasses
            colorLabel={colorLabel}
            entries={classEntries}
            magicIcons={magicIcons}
          />
        )}
      </div>
    </main>
  );
}

function MagicCubeClasses({
  colorLabel,
  entries,
  magicIcons,
}: {
  colorLabel: string;
  entries: MagicCubeStartingClass[];
  magicIcons: Map<string, string>;
}) {
  return (
    <CollapsibleBox
      title={`Classes With ${colorLabel} Cubes`}
      count={entries.length}
      countLabel={`${entries.length} class${entries.length === 1 ? "" : "es"}`}
    >
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
                        key={`${side.side}-${index}-${magicCubeKey(cube)}`}
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
    </CollapsibleBox>
  );
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

function MagicMapTileCard({ tile }: { tile: MapTileColorPathEntry }) {
  return (
    <section className="flex min-w-0 flex-col gap-1">
      <Link
        href={tile.href}
        className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
        aria-label={`View ${tile.name}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tile.imageUrl}
          alt={tile.name}
          className="block aspect-square w-full -rotate-[30deg] object-contain p-4"
        />
      </Link>
      <h3 className="mt-1 text-base font-semibold leading-6">
        <Link href={tile.href} className="hover:underline">
          {tile.name}
        </Link>
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {mapTileSideLabel(tile)}
      </p>
    </section>
  );
}

function mapTileSideLabel(tile: MapTileColorPathEntry): string {
  if (tile.frontHasColor && tile.backHasColor) return "front and back";
  if (tile.backHasColor) return "back";
  return "front";
}

function magicCubeKey(cube: TTSClassSetupCube): string {
  return [
    cube.type,
    cube.count,
    cube.color ?? "",
    cube.colors?.join("/") ?? "",
  ].join(":");
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
      className="block h-14 w-14 rounded border border-zinc-200 bg-zinc-100 object-contain dark:border-zinc-800 dark:bg-zinc-900"
    />
  );
}

function getTilesWithColorPaths(
  colorId: string,
  mapTiles: MapTileEntry[],
  connections: Record<
    string,
    { front: { paths: unknown[] }; back: { paths: unknown[] } }
  >,
): MapTileColorPathEntry[] {
  const tilesWithColor: MapTileColorPathEntry[] = [];
  const processedTiles = new Set<string>();

  for (const tile of mapTiles) {
    if (processedTiles.has(tile.name)) continue;
    processedTiles.add(tile.name);

    const tileConnections = connections[tile.name];
    if (!tileConnections) continue;

    const frontHasColor = hasColorInPaths(
      tileConnections.front?.paths,
      colorId,
    );
    const backHasColor = hasColorInPaths(tileConnections.back?.paths, colorId);

    if (frontHasColor || backHasColor) {
      // If only one side has the color, link to that side
      const side =
        frontHasColor && !backHasColor
          ? "front"
          : backHasColor && !frontHasColor
            ? "back"
            : "front";

      tilesWithColor.push({
        ...tile,
        side,
        frontHasColor,
        backHasColor,
      });
    }
  }

  return tilesWithColor;
}

type MapTileColorPathEntry = MapTileEntry & {
  side?: string;
  frontHasColor: boolean;
  backHasColor: boolean;
};

function hasColorInPaths(
  paths: unknown[] | undefined,
  colorId: string,
): boolean {
  if (!Array.isArray(paths)) return false;
  return paths.some((path) => {
    if (Array.isArray(path) && path.length >= 3) {
      return path[2] === colorId;
    }
    return false;
  });
}
