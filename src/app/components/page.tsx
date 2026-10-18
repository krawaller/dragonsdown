import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import {
  CIVILISATION_TOKEN_FACE_URL,
  ITEM_CARD_BACK_URL,
  SITE_FACE_URL,
  SPECIALIST_TOKEN_BACK_URL,
  SPELL_CARD_BACK_URL,
  WEATHER_CARD_BACK_URL,
} from "@/lib/tts";
import {
  getAllBoards,
  getAllCivilisationTokenNames,
  getAllClasses,
  getAllEquipment,
  getAllLineages,
  getAllMapTiles,
  getAllMissions,
  getAllMonsterGroups,
  getAllNativeGroups,
  getAllSites,
  getAllSpecialists,
  getAllSpells,
  getAllWeatherCards,
  getAllWildernessTokenNames,
} from "@/lib/tts/lookup";

type ComponentCategory = {
  href: string;
  title: string;
  count: number;
  countName: string;
  imageUrl?: string;
  imageFit?: "contain" | "cover";
};

export default function ComponentsPage() {
  const boards = getAllBoards();
  const classes = getAllClasses();
  const lineages = getAllLineages();
  const equipment = getAllEquipment();
  const missions = getAllMissions();
  const spells = getAllSpells();
  const mapTiles = getAllMapTiles();
  const siteTokens = getAllSites().filter((entry) => entry.kind === "proper");
  const civilisationTokens = getAllCivilisationTokenNames();
  const wildernessTokens = getAllWildernessTokenNames();
  const monsterGroups = getAllMonsterGroups();
  const nativeGroups = getAllNativeGroups();
  const specialists = getAllSpecialists();
  const weatherCards = getAllWeatherCards();
  const categories: ComponentCategory[] = [
    {
      href: "/boards",
      title: "Boards",
      count: boards.length,
      countName: "board",
      imageUrl: boards[0]?.board.imageURL,
    },
    {
      href: "/classes",
      title: "Classes",
      count: classes.length,
      countName: "class",
    },
    {
      href: "/lineages",
      title: "Lineages",
      count: lineages.length,
      countName: "lineage",
    },
    {
      href: "/equipment",
      title: "Equipment",
      count: equipment.length,
      countName: "entry",
      imageUrl: ITEM_CARD_BACK_URL,
      imageFit: "contain",
    },
    {
      href: "/missions",
      title: "Mission Cards",
      count: missions.length,
      countName: "mission",
    },
    {
      href: "/spells",
      title: "Spell Cards",
      count: spells.length,
      countName: "spell",
      imageUrl: SPELL_CARD_BACK_URL,
      imageFit: "contain",
    },
    {
      href: "/map-tiles",
      title: "Map Tiles",
      count: mapTiles.length,
      countName: "tile",
      imageUrl: mapTiles[0]?.imageUrl,
    },
    {
      href: "/site-tokens",
      title: "Site Tokens",
      count: siteTokens.length,
      countName: "token",
      imageUrl: SITE_FACE_URL,
    },
    {
      href: "/civilisation-tokens",
      title: "Civilisation Tokens",
      count: civilisationTokens.length,
      countName: "token",
      imageUrl: CIVILISATION_TOKEN_FACE_URL,
    },
    {
      href: "/wilderness-tokens",
      title: "Wilderness Tokens",
      count: wildernessTokens.length,
      countName: "token",
    },
    {
      href: "/monster-groups",
      title: "Monster Chips",
      count: monsterGroups.length,
      countName: "group",
      imageUrl: monsterGroups[0]?.chips[0]?.imageURL,
    },
    {
      href: "/natives",
      title: "Native Groups",
      count: nativeGroups.length,
      countName: "group",
      imageUrl: nativeGroups[0]?.chips[0]?.imageURL,
    },
    {
      href: "/specialists",
      title: "Specialists",
      count: specialists.length,
      countName: "specialist",
      imageUrl: SPECIALIST_TOKEN_BACK_URL,
    },
    {
      href: "/weather-cards",
      title: "Weather Cards",
      count: weatherCards.length,
      countName: "card",
      imageUrl: WEATHER_CARD_BACK_URL,
      imageFit: "contain",
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <PageHeader
        title="Components"
        subtitle={`${categories.length} component references`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <ComponentCategoryLink key={category.href} category={category} />
        ))}
      </div>
    </main>
  );
}

function ComponentCategoryLink({ category }: { category: ComponentCategory }) {
  return (
    <Link
      href={category.href}
      className="flex min-w-0 gap-4 rounded border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
        {category.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={category.imageUrl}
            alt=""
            className={`block size-full ${category.imageFit === "contain" ? "object-contain" : "object-cover"}`}
          />
        ) : (
          <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {category.title.slice(0, 1)}
          </span>
        )}
      </span>
      <span className="min-w-0 self-center">
        <span className="block text-lg font-semibold">{category.title}</span>
        <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
          {countLabel(category.count, category.countName)}
        </span>
      </span>
    </Link>
  );
}

function countLabel(count: number, name: string): string {
  if (count === 1) return `1 ${name}`;
  if (name === "class") return `${count} classes`;
  if (name === "entry") return `${count} entries`;
  return `${count} ${name}s`;
}
