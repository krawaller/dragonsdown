import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import {
  PageHeader,
  type PageHeaderCategoryLink,
} from "@/components/PageHeader";
import { RulebookLinks } from "@/components/RulebookLinks";
import { getMagicTypeById, magicLabel } from "@/lib/magic";
import {
  resolveMagicRulebookLinks,
  resolveSpellRulebookLinks,
} from "@/lib/rulebook-links";
import type { TTSCardImage, TTSTreasureCard } from "@/lib/tts";
import {
  getAllSpells,
  getEquipmentCastersForSpell,
  getSpellBySlug,
  getSpellCastersForSpell,
  type EquipmentSpellCasterEntry,
  type SpellCasterEntry,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllSpells().map((entry) => ({ slug: entry.slug }));
}

export default async function SpellPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getSpellBySlug(slug);
  if (!entry) notFound();
  const spell = entry.spells[0];
  if (!spell) notFound();
  const rulebookLinks = await resolveSpellRulebookLinks(entry.name);
  const casters = getSpellCastersForSpell(entry.name);
  const equipmentCasters = getEquipmentCastersForSpell(entry.name);
  const treasureCasterItems = equipmentCasters.flatMap((caster) =>
    caster.cards.map((card, index) => ({ caster, card, index })),
  );
  const spellCard = spell.spellCards[0] ?? spell.cards[0];
  const casterCount = casters.length + treasureCasterItems.length;
  const primaryMagic = spell.magic[0]
    ? getMagicTypeById(spell.magic[0])
    : undefined;
  const magicIcon = primaryMagic
    ? (await resolveMagicRulebookLinks(primaryMagic.id, "core")).find((link) =>
        Boolean(link.icon),
      )?.icon
    : undefined;
  const categories = spellHeaderCategories({
    primaryMagic,
    magicIcon,
    spellCard,
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <PageHeader
        title={entry.name}
        subtitle={magicSummary(spell.magic)}
        categories={categories}
      />

      <div className="space-y-6">
        {spellCard && (
          <SpriteCell
            card={spellCard}
            className="mx-auto w-full max-w-64 border border-zinc-200 shadow-sm dark:border-zinc-800"
          />
        )}

        <RulebookLinks
          links={rulebookLinks}
          heading={null}
          linksClassName="space-y-6"
        />

        <CollapsibleBox
          title="Cast by"
          count={casterCount}
          countLabel={`${casterCount} caster${casterCount === 1 ? "" : "s"}`}
        >
          <div className="space-y-5">
            {casters.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {casters.map((caster) => (
                  <MonsterCasterCard key={caster.monsterName} caster={caster} />
                ))}
              </div>
            )}

            {treasureCasterItems.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {treasureCasterItems.map((item) => (
                  <TreasureCasterCard
                    key={`${item.caster.slug}-${item.card.faceURL}-${item.card.row}-${item.card.col}-${item.index}`}
                    item={item}
                  />
                ))}
              </div>
            )}
          </div>
        </CollapsibleBox>
      </div>
    </main>
  );
}

function spellHeaderCategories({
  primaryMagic,
  magicIcon,
  spellCard,
}: {
  primaryMagic?: NonNullable<ReturnType<typeof getMagicTypeById>>;
  magicIcon?: string;
  spellCard?: TTSCardImage;
}): PageHeaderCategoryLink[] {
  return [
    ...(primaryMagic
      ? [
          {
            href: `/magic/${primaryMagic.slug}`,
            label: "Magic",
            value: primaryMagic.label.replace(/\s+Magic$/i, ""),
            imageUrl: magicIcon,
            imageFit: "contain" as const,
          },
        ]
      : []),
    {
      href: "/spells",
      label: "Component",
      value: "Spell cards",
      imageUrl: spellCard?.backURL,
      imageCrop:
        spellCard?.uniqueBack === true ? cardImageCrop(spellCard) : undefined,
      imageFit: "contain",
    },
  ];
}

function cardImageCrop(card: TTSCardImage) {
  return {
    left: card.col / card.numWidth,
    top: card.row / card.numHeight,
    width: 1 / card.numWidth,
    height: 1 / card.numHeight,
  };
}

function MonsterCasterCard({ caster }: { caster: SpellCasterEntry }) {
  const token = caster.token;
  const imageURL = token ? tokenImageForSides(token, caster.sides) : undefined;

  return (
    <Link
      href={caster.href}
      className="group block rounded border border-zinc-200 p-3 text-center transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <figure>
        {imageURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageURL}
            alt={`${caster.monsterName} ${sideLabel(caster.sides)} token`}
            className="mx-auto aspect-square w-full max-w-28 rounded-full border border-zinc-200 bg-zinc-100 object-cover transition group-hover:ring-2 group-hover:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:group-hover:ring-zinc-700"
          />
        ) : (
          <div className="mx-auto grid aspect-square w-full max-w-28 place-items-center rounded-full border border-zinc-200 bg-zinc-100 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            No image
          </div>
        )}
        <figcaption className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {caster.monsterName}
        </figcaption>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {sideLabel(caster.sides)}
        </p>
      </figure>
    </Link>
  );
}

function TreasureCasterCard({
  item,
}: {
  item: {
    caster: EquipmentSpellCasterEntry;
    card: TTSTreasureCard;
    index: number;
  };
}) {
  return (
    <Link
      href={`/equipment/${item.caster.slug}`}
      className="group block rounded border border-zinc-200 p-3 text-center transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <figure>
        <SpriteCell
          card={item.card}
          className="mx-auto w-full max-w-28 border border-zinc-200 shadow-sm transition group-hover:ring-2 group-hover:ring-zinc-300 dark:border-zinc-800 dark:group-hover:ring-zinc-700"
        />
        <figcaption className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {item.caster.name}
        </figcaption>
      </figure>
    </Link>
  );
}

function tokenImageForSides(
  token: NonNullable<SpellCasterEntry["token"]>,
  sides: SpellCasterEntry["sides"],
): string {
  return sides.length === 1 && sides[0] === "back"
    ? token.imageSecondaryURL
    : token.imageURL;
}

function sideLabel(sides: SpellCasterEntry["sides"]): string {
  return sides.join("/");
}

function magicSummary(magic: string[]): string {
  if (magic.length === 0) return "Unclassified";
  return magic.map(magicLabel).join(", ");
}
