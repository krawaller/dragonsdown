export type MagicType = {
  id: string;
  slug: string;
  label: string;
  heading: string;
};

export const MAGIC_TYPES: MagicType[] = [
  {
    id: "universal",
    slug: "universal",
    label: "Universal Magic",
    heading: "Universal Spells",
  },
  {
    id: "black",
    slug: "black",
    label: "Black Magic",
    heading: "Black Spells",
  },
  {
    id: "blue",
    slug: "blue",
    label: "Blue Magic",
    heading: "Blue Spells",
  },
  {
    id: "gray",
    slug: "gray",
    label: "Gray Magic",
    heading: "Gray Spells",
  },
  {
    id: "green",
    slug: "green",
    label: "Green Magic",
    heading: "Green Spells",
  },
  {
    id: "purple",
    slug: "purple",
    label: "Purple Magic",
    heading: "Purple Spells",
  },
  {
    id: "white",
    slug: "white",
    label: "White Magic",
    heading: "White Spells",
  },
  {
    id: "yellow",
    slug: "yellow",
    label: "Yellow Magic",
    heading: "Yellow Spells",
  },
];

export function getMagicTypeBySlug(slug: string): MagicType | undefined {
  return MAGIC_TYPES.find((type) => type.slug === slug);
}

export function getMagicTypeById(id: string): MagicType | undefined {
  return MAGIC_TYPES.find((type) => type.id === id);
}

export function magicLabel(id: string): string {
  return getMagicTypeById(id)?.label ?? capitalize(id);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
