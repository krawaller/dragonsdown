import type { ReactNode } from "react";
import type { TTSClassSetupCube } from "@/lib/tts";

export type MagicIcons = Map<string, string> | Record<string, string>;

export function MagicCube({
  cube,
  magicIcons,
}: {
  cube: TTSClassSetupCube;
  magicIcons: MagicIcons;
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
  magicIcons: MagicIcons;
}) {
  if (colors.length <= 1) {
    const color = colors[0] ?? "unknown";
    return (
      <MagicCubeShell>
        <MagicCubeImage color={color} icon={magicIconFor(magicIcons, color)} />
      </MagicCubeShell>
    );
  }

  const [first, second] = colors;
  return (
    <MagicCubeShell>
      <MagicCubeImage
        color={first}
        icon={magicIconFor(magicIcons, first)}
        clip="left"
      />
      <MagicCubeImage
        color={second}
        icon={magicIconFor(magicIcons, second)}
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

function magicIconFor(
  magicIcons: MagicIcons,
  color: string,
): string | undefined {
  return magicIcons instanceof Map ? magicIcons.get(color) : magicIcons[color];
}
