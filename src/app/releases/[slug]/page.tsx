import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MissionCardLinks } from "@/components/MissionCardLinks";
import { MonsterGroupStack } from "@/components/MonsterGroupChips";
import {
  PageHeader,
  type PageHeaderCategoryLink,
} from "@/components/PageHeader";
import { SiteGrid } from "@/components/SiteGrid";
import {
  getAllReleases,
  getReleaseBySlug,
  getReleaseComponentGroups,
  type ReleaseComponentItem,
  type ReleaseComponentGroup,
  type ReleaseEntry,
} from "@/lib/releases";
import type { TTSCardImage } from "@/lib/tts";
import {
  getAllSpecialists,
  getAllWeatherCards,
  getAllMapTiles,
  getBoardBySlug,
  getCivLocationBySlug,
  getCivilisationTokenBySlug,
  getClassBySlug,
  getEquipmentBySlug,
  getLegendaryLocationBySlug,
  getLineageBySlug,
  getMissionBySlug,
  getMonsterGroupBySlug,
  getNativeGroupBySlug,
  getSiteBySlug,
  getSpellBySlug,
  getWildernessTokenBySlug,
} from "@/lib/tts/lookup";

const RELEASES_CATEGORY_ICON_URL =
  "/images/pdf/37f74aa0bbf43addc356a799f1c65d453770f235.jpeg";

export function generateStaticParams() {
  return getAllReleases().map((release) => ({ slug: release.slug }));
}

export default async function ReleasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const release = getReleaseBySlug(slug);
  if (!release) notFound();
  const groups = getReleaseComponentGroups(release);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <PageHeader
        title={release.title}
        subtitle={`Version ${release.version}`}
        categories={releaseHeaderCategories()}
      />

      <div className="space-y-6">
        {groups.map((group) => (
          <ReleaseComponentBox
            key={group.title}
            group={group}
            release={release}
          />
        ))}
      </div>
    </main>
  );
}

function releaseHeaderCategories(): PageHeaderCategoryLink[] {
  return [
    {
      href: "/releases",
      label: "Category",
      value: "Releases",
      imageUrl: RELEASES_CATEGORY_ICON_URL,
      imageFit: "contain",
    },
  ];
}

function ReleaseComponentBox({
  group,
  release,
}: {
  group: ReleaseComponentGroup;
  release: ReleaseEntry;
}) {
  return (
    <CollapsibleBox
      title={group.title}
      count={group.items.length}
      countLabel={`${group.items.length} ${group.items.length === 1 ? "entry" : "entries"}`}
      contentClassName="border-t border-zinc-200 p-4 dark:border-zinc-800"
    >
      <ReleaseComponentItems group={group} release={release} />
    </CollapsibleBox>
  );
}

function ReleaseComponentItems({
  group,
  release,
}: {
  group: ReleaseComponentGroup;
  release: ReleaseEntry;
}) {
  switch (group.title) {
    case "Rulebooks":
      return (
        <ReleaseImageGrid>
          {group.items.map((item) => (
            <ReleaseImageTile
              key={item.href}
              href={item.href}
              name={item.name}
              imageUrl={release.iconUrl}
              imageClassName="object-contain p-2"
              subtitle={item.detail}
            />
          ))}
        </ReleaseImageGrid>
      );
    case "Classes":
      return <ClassTiles items={group.items} />;
    case "Lineages":
      return <LineageTiles items={group.items} />;
    case "Spells":
      return <SpellTiles items={group.items} />;
    case "Boards":
      return <BoardTiles items={group.items} />;
    case "Equipment":
      return <EquipmentTiles items={group.items} />;
    case "Missions":
      return <MissionTiles items={group.items} />;
    case "Sites":
      return <SiteTiles items={group.items} />;
    case "Legendary Locations":
      return <LegendaryLocationTiles items={group.items} />;
    case "Map Tiles":
      return <MapTileTiles items={group.items} />;
    case "Civilisation Tokens":
      return <CivilisationTokenTiles items={group.items} />;
    case "Civilisation Locations":
      return <CivilisationLocationTiles items={group.items} />;
    case "Wilderness Tokens":
      return <WildernessTokenTiles items={group.items} />;
    case "Monster Groups":
      return <MonsterGroupTiles items={group.items} />;
    case "Native Groups":
      return <NativeGroupTiles items={group.items} />;
    case "Specialists":
      return <SpecialistTiles items={group.items} />;
    case "Weather Cards":
      return <WeatherTiles items={group.items} />;
  }

  return <ReleaseTextTiles items={group.items} />;
}

function ClassTiles({ items }: { items: ReleaseComponentItem[] }) {
  return (
    <ReleaseImageGrid>
      {items.map((item) => {
        const entry = getClassBySlug(lastPathSegment(item.href));
        const ttsClass = entry?.classes[0];
        return (
          <ReleaseCardTile
            key={item.href}
            href={item.href}
            name={item.name}
            card={ttsClass?.advantageCard}
            fallbackImageUrl={ttsClass?.targetingTokens[0]?.imageURL}
            subtitle={ttsClass?.advantageTitle}
          />
        );
      })}
    </ReleaseImageGrid>
  );
}

function LineageTiles({ items }: { items: ReleaseComponentItem[] }) {
  return (
    <ReleaseImageGrid>
      {items.map((item) => {
        const entry = getLineageBySlug(lastPathSegment(item.href));
        const lineage = entry?.lineages[0];
        return (
          <ReleaseCardTile
            key={item.href}
            href={item.href}
            name={item.name}
            card={lineage?.cards[0]}
            subtitle={lineage?.advantageTitle}
          />
        );
      })}
    </ReleaseImageGrid>
  );
}

function SpellTiles({ items }: { items: ReleaseComponentItem[] }) {
  return (
    <ReleaseImageGrid>
      {items.map((item) => {
        const entry = getSpellBySlug(lastPathSegment(item.href));
        const spell = entry?.spells[0];
        return (
          <ReleaseCardTile
            key={item.href}
            href={item.href}
            name={item.name}
            card={spell?.cards[0]}
            subtitle={spell?.magic.join(", ")}
          />
        );
      })}
    </ReleaseImageGrid>
  );
}

function BoardTiles({ items }: { items: ReleaseComponentItem[] }) {
  return (
    <ReleaseImageGrid>
      {items.map((item) => {
        const entry = getBoardBySlug(lastPathSegment(item.href));
        return (
          <ReleaseImageTile
            key={item.href}
            href={item.href}
            name={item.name}
            imageUrl={entry?.board.imageURL}
            imageClassName="object-contain"
            subtitle={entry?.board.terrain}
          />
        );
      })}
    </ReleaseImageGrid>
  );
}

function EquipmentTiles({ items }: { items: ReleaseComponentItem[] }) {
  return (
    <ReleaseImageGrid>
      {items.map((item) => {
        const entry = getEquipmentBySlug(lastPathSegment(item.href));
        return (
          <ReleaseCardTile
            key={item.href}
            href={item.href}
            name={item.name}
            card={entry?.item?.cards[0] ?? entry?.treasures[0]}
            subtitle={item.detail}
          />
        );
      })}
    </ReleaseImageGrid>
  );
}

function MissionTiles({ items }: { items: ReleaseComponentItem[] }) {
  const missions = items.flatMap((item) => {
    const mission = getMissionBySlug(lastPathSegment(item.href));
    return mission ? [mission] : [];
  });
  return <MissionCardLinks missions={missions} />;
}

function SiteTiles({ items }: { items: ReleaseComponentItem[] }) {
  const sites = items.flatMap((item) => {
    const site = getSiteBySlug(lastPathSegment(item.href));
    return site ? [site] : [];
  });
  return <SiteGrid entries={sites} />;
}

function LegendaryLocationTiles({ items }: { items: ReleaseComponentItem[] }) {
  return (
    <ReleaseImageGrid>
      {items.map((item) => {
        const entry = getLegendaryLocationBySlug(lastPathSegment(item.href));
        const location = entry?.locations[0];
        return (
          <ReleaseCardTile
            key={item.href}
            href={item.href}
            name={item.name}
            card={location?.card}
            subtitle={entry?.kind === "site" ? "Legendary site" : "Test"}
          />
        );
      })}
    </ReleaseImageGrid>
  );
}

function MapTileTiles({ items }: { items: ReleaseComponentItem[] }) {
  const mapTiles = getAllMapTiles();
  return (
    <ReleaseImageGrid>
      {items.map((item) => {
        const entry = mapTiles.find(
          (mapTile) => mapTile.slug === lastPathSegment(item.href),
        );
        return (
          <ReleaseImageTile
            key={item.href}
            href={item.href}
            name={item.name}
            imageUrl={entry?.imageUrl}
            imageClassName="-rotate-[30deg] object-contain p-4"
            subtitle={entry?.terrainPack}
          />
        );
      })}
    </ReleaseImageGrid>
  );
}

function CivilisationTokenTiles({ items }: { items: ReleaseComponentItem[] }) {
  return (
    <ReleaseImageGrid>
      {items.map((item) => {
        const entry = getCivilisationTokenBySlug(lastPathSegment(item.href));
        const token = entry?.tokens[0];
        return (
          <ReleaseImageTile
            key={item.href}
            href={item.href}
            name={item.name}
            imageUrl={token?.imageSecondaryURL || token?.imageURL}
            imageClassName="object-cover"
            subtitle={token?.attribute ?? token?.terrainGroup}
          />
        );
      })}
    </ReleaseImageGrid>
  );
}

function CivilisationLocationTiles({
  items,
}: {
  items: ReleaseComponentItem[];
}) {
  return (
    <ReleaseImageGrid>
      {items.map((item) => {
        const entry = getCivLocationBySlug(lastPathSegment(item.href));
        return (
          <ReleaseImageTile
            key={item.href}
            href={item.href}
            name={item.name}
            imageUrl={entry?.location.imageURL}
            imageClassName="object-cover"
            subtitle={entry?.location.terrainPack ?? "Civilisation location"}
          />
        );
      })}
    </ReleaseImageGrid>
  );
}

function WildernessTokenTiles({ items }: { items: ReleaseComponentItem[] }) {
  return (
    <ReleaseImageGrid>
      {items.map((item) => {
        const entry = getWildernessTokenBySlug(lastPathSegment(item.href));
        const token = entry?.tokens[0];
        return (
          <ReleaseImageTile
            key={item.href}
            href={item.href}
            name={item.name}
            imageUrl={token?.imageURL}
            imageClassName="object-cover"
            subtitle={token?.terrainPack ?? token?.terrain}
          />
        );
      })}
    </ReleaseImageGrid>
  );
}

function MonsterGroupTiles({ items }: { items: ReleaseComponentItem[] }) {
  return (
    <ReleaseStackGrid>
      {items.map((item) => {
        const group = getMonsterGroupBySlug(lastPathSegment(item.href));
        return group ? (
          <MonsterGroupStack key={item.href} group={group} />
        ) : (
          <ReleaseTextTile key={item.href} item={item} />
        );
      })}
    </ReleaseStackGrid>
  );
}

function NativeGroupTiles({ items }: { items: ReleaseComponentItem[] }) {
  return (
    <ReleaseStackGrid>
      {items.map((item) => {
        const group = getNativeGroupBySlug(lastPathSegment(item.href));
        return group ? (
          <MonsterGroupStack
            key={item.href}
            group={group}
            hrefBase="/natives"
            summaryKind="native"
          />
        ) : (
          <ReleaseTextTile key={item.href} item={item} />
        );
      })}
    </ReleaseStackGrid>
  );
}

function SpecialistTiles({ items }: { items: ReleaseComponentItem[] }) {
  const specialists = getAllSpecialists();
  return (
    <ReleaseImageGrid>
      {items.map((item) => {
        const entry = specialists.find(
          (specialist) => specialist.name === item.name,
        );
        const specialist = entry?.specialists[0];
        return (
          <ReleaseImageTile
            key={`${item.href}-${item.name}`}
            href={item.href}
            name={item.name}
            imageUrl={specialist?.imageSecondaryURL || specialist?.imageURL}
            imageClassName="object-cover"
            subtitle={specialist?.attribute ?? specialist?.basePrice}
          />
        );
      })}
    </ReleaseImageGrid>
  );
}

function WeatherTiles({ items }: { items: ReleaseComponentItem[] }) {
  const weatherCards = getAllWeatherCards();
  return (
    <ReleaseImageGrid>
      {items.map((item) => {
        const entry = weatherCards.find(
          (weather) => weather.name === item.name,
        );
        return (
          <ReleaseCardTile
            key={`${item.href}-${item.name}`}
            href={item.href}
            name={item.name}
            card={entry?.cards[0]}
            subtitle={`${entry?.cards.length ?? 0} variant${entry?.cards.length === 1 ? "" : "s"}`}
          />
        );
      })}
    </ReleaseImageGrid>
  );
}

function ReleaseCardTile({
  href,
  name,
  card,
  fallbackImageUrl,
  subtitle,
}: {
  href: string;
  name: string;
  card?: TTSCardImage;
  fallbackImageUrl?: string;
  subtitle?: string;
}) {
  return (
    <ReleaseTileFrame href={href} name={name} subtitle={subtitle}>
      {card ? (
        <SpriteCell card={card} className="w-full rounded-none" />
      ) : fallbackImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fallbackImageUrl}
          alt=""
          className="block aspect-square w-full object-cover"
        />
      ) : (
        <ReleaseTilePlaceholder name={name} />
      )}
    </ReleaseTileFrame>
  );
}

function ReleaseImageTile({
  href,
  name,
  imageUrl,
  imageClassName,
  subtitle,
}: {
  href: string;
  name: string;
  imageUrl?: string;
  imageClassName: string;
  subtitle?: string;
}) {
  return (
    <ReleaseTileFrame href={href} name={name} subtitle={subtitle}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className={`block aspect-square w-full bg-zinc-100 dark:bg-zinc-900 ${imageClassName}`}
        />
      ) : (
        <ReleaseTilePlaceholder name={name} />
      )}
    </ReleaseTileFrame>
  );
}

function ReleaseTileFrame({
  href,
  name,
  subtitle,
  children,
}: {
  href: string;
  name: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <Link
        href={href}
        className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
        aria-label={`View ${name}`}
      >
        {children}
      </Link>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-5">
          <Link href={href} className="hover:underline">
            {name}
          </Link>
        </h3>
        {subtitle && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        )}
      </div>
    </section>
  );
}

function ReleaseTilePlaceholder({ name }: { name: string }) {
  return (
    <span className="flex aspect-square items-center justify-center p-4 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
      {name}
    </span>
  );
}

function ReleaseTextTiles({ items }: { items: ReleaseComponentItem[] }) {
  return (
    <ReleaseStackGrid>
      {items.map((item) => (
        <ReleaseTextTile key={`${item.href}-${item.name}`} item={item} />
      ))}
    </ReleaseStackGrid>
  );
}

function ReleaseTextTile({ item }: { item: ReleaseComponentItem }) {
  return (
    <Link
      href={item.href}
      className="block rounded border border-zinc-200 p-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <span className="block text-sm font-semibold">{item.name}</span>
      {item.detail && (
        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
          {item.detail}
        </span>
      )}
    </Link>
  );
}

function ReleaseImageGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {children}
    </div>
  );
}

function ReleaseStackGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>
  );
}

function lastPathSegment(href: string): string {
  return href.split("/").filter(Boolean).at(-1) ?? "";
}
