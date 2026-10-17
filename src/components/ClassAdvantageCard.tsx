import Link from "next/link";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { SpriteCell } from "@/components/CardSprite";
import { MAGIC_TYPES, getMagicTypeById, type MagicType } from "@/lib/magic";
import { resolveMagicRulebookLinks } from "@/lib/rulebook-links";
import { slugify } from "@/lib/slug";
import type {
  TTSCardImage,
  TTSClassSetup,
  TTSClassSetupCube,
  TTSClassSetupItem,
} from "@/lib/tts";
import { getEquipmentBySlug, type EquipmentEntry } from "@/lib/tts/lookup";

export async function ClassAdvantageCard({ setup }: { setup?: TTSClassSetup }) {
  const magicAccess = await magicAccessForSetup(setup);
  const frontStartingItems = startingItemsForSide(setup?.front.items);
  const backStartingItems = startingItemsForSide(setup?.back.items);

  return (
    <section>
      <div className="space-y-6">
        {magicAccess.length > 0 && <MagicAccessBox entries={magicAccess} />}
        {frontStartingItems.length > 0 && (
          <StartingItemsBox
            title="Starting Items (Front)"
            items={frontStartingItems}
          />
        )}
        {backStartingItems.length > 0 && (
          <StartingItemsBox
            title="Starting Items (Back)"
            items={backStartingItems}
          />
        )}
      </div>
    </section>
  );
}

type MagicAccessEntry = {
  type: MagicType;
  icon?: string;
  sides: ("front" | "back")[];
};

function MagicAccessBox({ entries }: { entries: MagicAccessEntry[] }) {
  return (
    <CollapsibleBox
      title="Magic Access"
      count={entries.length}
      countLabel={`${entries.length} magic type${entries.length === 1 ? "" : "s"}`}
      contentClassName="border-t border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <Link
            key={entry.type.id}
            href={`/magic/${entry.type.slug}`}
            className="flex min-w-0 items-center gap-3 rounded border border-zinc-200 p-3 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <MagicAccessIcon icon={entry.icon} label={entry.type.label} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {entry.type.label}
              </span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {magicAccessSideLabel(entry.sides)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </CollapsibleBox>
  );
}

function MagicAccessIcon({ icon, label }: { icon?: string; label: string }) {
  if (!icon) {
    return (
      <span
        className="block size-8 shrink-0 rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
        aria-hidden="true"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon}
      alt={`${label} icon`}
      className="block size-8 shrink-0 rounded border border-zinc-200 bg-zinc-100 object-contain dark:border-zinc-800 dark:bg-zinc-900"
    />
  );
}

function StartingItemsBox({
  title,
  items,
}: {
  title: string;
  items: TTSClassSetupItem[];
}) {
  return (
    <CollapsibleBox
      title={title}
      count={items.length}
      countLabel={`${items.length} item${items.length === 1 ? "" : "s"}`}
      contentClassName="border-t border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <LoadoutItemCard
            key={`${slugify(item.name)}-${item.slot}`}
            item={item}
          />
        ))}
      </div>
    </CollapsibleBox>
  );
}

function LoadoutItemCard({ item }: { item: TTSClassSetupItem }) {
  const equipment = getEquipmentBySlug(slugify(item.name));
  const card = equipment ? equipmentCardForLoadout(equipment) : undefined;
  const href = `/equipment/${equipment?.slug ?? slugify(item.name)}`;

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
      </div>
    </section>
  );
}

function equipmentCardForLoadout(
  entry: EquipmentEntry,
): TTSCardImage | undefined {
  return entry.item?.cards[0] ?? entry.treasures[0];
}

function startingItemsForSide(
  items: TTSClassSetupItem[] | undefined,
): TTSClassSetupItem[] {
  return [...(items ?? [])].sort((a, b) => a.name.localeCompare(b.name));
}

async function magicAccessForSetup(
  setup: TTSClassSetup | undefined,
): Promise<MagicAccessEntry[]> {
  if (!setup) return [];

  const sidesByMagic = new Map<string, Set<"front" | "back">>();
  for (const side of ["front", "back"] as const) {
    for (const cube of setup[side]?.cubes ?? []) {
      for (const color of magicColorsForCube(cube)) {
        const sides = sidesByMagic.get(color) ?? new Set<"front" | "back">();
        sides.add(side);
        sidesByMagic.set(color, sides);
      }
    }
  }

  const entries = [...sidesByMagic.entries()]
    .flatMap(([color, sides]) => {
      const type = getMagicTypeById(color);
      return type ? [{ type, sides: [...sides] }] : [];
    })
    .sort((a, b) => a.type.label.localeCompare(b.type.label));

  return Promise.all(
    entries.map(async (entry) => {
      const links = await resolveMagicRulebookLinks(entry.type.id, "core");
      return {
        ...entry,
        icon: links.find((link) => Boolean(link.icon))?.icon,
      };
    }),
  );
}

function magicColorsForCube(cube: TTSClassSetupCube): string[] {
  if (cube.type !== "Spell") return [];
  const colors = cube.colors ?? (cube.color ? [cube.color] : []);
  return colors.flatMap((color) => {
    const normalized = normalizeMagicCubeColor(color);
    return normalized === "any" ? selectableMagicTypeIds() : [normalized];
  });
}

function selectableMagicTypeIds(): string[] {
  return MAGIC_TYPES.filter((type) => type.id !== "universal").map(
    (type) => type.id,
  );
}

function normalizeMagicCubeColor(color: string): string {
  return color === "grey" ? "gray" : color;
}

function magicAccessSideLabel(sides: ("front" | "back")[]): string {
  if (sides.length === 2) return "Front and back";
  return sides[0] === "back" ? "Back" : "Front";
}
