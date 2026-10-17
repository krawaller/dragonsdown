import Link from "next/link";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { SpriteCell } from "@/components/CardSprite";
import { slugify } from "@/lib/slug";
import type {
  TTSCardImage,
  TTSClassSetup,
  TTSClassSetupCube,
  TTSClassSetupItem,
  TTSClassSetupSide,
} from "@/lib/tts";
import { getEquipmentBySlug, type EquipmentEntry } from "@/lib/tts/lookup";

export function ClassAdvantageCard({ setup }: { setup?: TTSClassSetup }) {
  return (
    <section>
      <div className="space-y-6">
        {setup?.front && (
          <ClassSetupLoadout
            title="Starting Loadout (Front)"
            loadout={setup.front}
          />
        )}
        {setup?.back && (
          <ClassSetupLoadout
            title="Starting Loadout (Back)"
            loadout={setup.back}
          />
        )}
      </div>
    </section>
  );
}

function ClassSetupLoadout({
  title,
  loadout,
}: {
  title: string;
  loadout: TTSClassSetupSide;
}) {
  return (
    <CollapsibleBox
      title={title}
      count={loadoutSummaryCount(loadout)}
      countLabel={loadoutSummaryLabel(loadout)}
      contentClassName="border-t border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="space-y-4">
        {loadout.items.length > 0 && (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {loadout.items.map((item, index) => (
              <LoadoutItemCard
                key={`${item.name}-${item.slot}-${index}`}
                item={item}
              />
            ))}
          </div>
        )}
        <LoadoutSetupChips loadout={loadout} />
      </div>
    </CollapsibleBox>
  );
}

function LoadoutItemCard({ item }: { item: TTSClassSetupItem }) {
  const entry = getEquipmentBySlug(slugify(item.name));
  const card = entry ? equipmentCardForLoadout(entry) : undefined;
  const href = `/equipment/${entry?.slug ?? slugify(item.name)}`;

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <Link
        href={href}
        className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
        aria-label={`View ${item.name}`}
      >
        {card ? (
          <SpriteCell card={card} className="w-full" />
        ) : (
          <span className="block aspect-[5/7] w-full" />
        )}
      </Link>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold leading-5">
          <Link href={href} className="hover:underline">
            {item.name}
          </Link>
        </h3>
        {item.slot && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {loadoutSlotLabel(item.slot)}
          </p>
        )}
      </div>
    </section>
  );
}

function equipmentCardForLoadout(
  entry: EquipmentEntry,
): TTSCardImage | undefined {
  return entry.item?.cards[0] ?? entry.treasures[0];
}

function LoadoutSetupChips({ loadout }: { loadout: TTSClassSetupSide }) {
  const chips = [
    ...loadout.cubes.map(classSetupCubeLabel),
    ...(loadout.gold === undefined ? [] : [`${loadout.gold} gold`]),
  ];

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-300">
      {chips.map((chip, index) => (
        <span
          key={`${chip}-${index}`}
          className="rounded border border-zinc-200 px-2 py-1 dark:border-zinc-800"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

function loadoutSummaryCount(loadout: TTSClassSetupSide): number {
  return (
    loadout.items.length +
    loadout.cubes.length +
    (loadout.gold === undefined ? 0 : 1)
  );
}

function loadoutSummaryLabel(loadout: TTSClassSetupSide): string {
  const parts = [
    pluralLabel(loadout.items.length, "item"),
    pluralLabel(loadout.cubes.length, "cube group"),
    loadout.gold === undefined ? undefined : `${loadout.gold} gold`,
  ].filter(Boolean);

  return parts.join(" · ");
}

function pluralLabel(count: number, label: string): string | undefined {
  if (count === 0) return undefined;
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function classSetupCubeLabel(cube: TTSClassSetupCube): string {
  const color = cube.colors?.length
    ? cube.colors.join(" or ")
    : (cube.color ?? "unknown");
  return `${cube.count} ${color} ${cube.type}`;
}

function loadoutSlotLabel(slot: string): string {
  return slot.replace(/^slot/, "Slot ");
}
