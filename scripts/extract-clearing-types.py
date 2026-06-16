import colorsys
import json
import math
import statistics
import sys
from pathlib import Path
from typing import Any, Literal, TypedDict

from PIL import Image

ClearingType = Literal[
    "plains",
    "caves",
    "mountains",
    "woods",
    "swamps",
    "river",
    "desert",
]


class Clearing(TypedDict):
    x: float
    y: float


class MapTile(TypedDict):
    name: str
    terrain: str
    imageUrl: str
    imageSecondaryUrl: str
    clearings: list[Clearing]


class ClearingTypeAnchor(TypedDict):
    name: str
    front: list[str]
    back: list[str]


ROOT = Path.cwd()
MAP_TILES_FILE = ROOT / "data" / "extracted-from-tts" / "map-tiles.json"
ANCHORS_FILE = ROOT / "data" / "manual" / "clearing-type-anchors.json"
IMAGE_DIR = ROOT / "generated" / "downloaded-images"
OUT_FILE = ROOT / "data" / "clearing-types.json"

TILE_COORDINATE_EXTENT = 3
TILE_DISPLAY_ROTATION_DEGREES = -30
CLEARING_MARKER_RADIUS_SCALE = 0.76

CLEARING_TYPE_ALIASES: dict[str, ClearingType] = {
    "plain": "plains",
    "plains": "plains",
    "cave": "caves",
    "caves": "caves",
    "mountain": "mountains",
    "mountains": "mountains",
    "wood": "woods",
    "woods": "woods",
    "swamp": "swamps",
    "swamps": "swamps",
    "river": "river",
    "rivers": "river",
    "desert": "desert",
    "deserts": "desert",
}


def main() -> None:
    map_tiles = read_json(MAP_TILES_FILE)
    anchors = read_json(ANCHORS_FILE)
    image_files = list(IMAGE_DIR.iterdir())
    tiles_by_name = index_tiles(map_tiles)
    prototypes = build_prototypes(tiles_by_name, anchors, image_files)
    output = classify_tiles(map_tiles, prototypes, image_files)
    mismatches = anchor_mismatches(output, anchors)

    if mismatches:
        for mismatch in mismatches:
            print(mismatch, file=sys.stderr)
        raise SystemExit(f"manual anchor check failed: {len(mismatches)} mismatch(es)")

    OUT_FILE.write_text(json.dumps(output, indent=2) + "\n")
    clearing_count = sum(len(tile["clearings"]) for tile in output)
    print(
        f"clearing-types.json: {len(output)} map tiles, "
        f"{clearing_count} clearings, {clearing_count * 2} side labels"
    )
    print(f"manual anchor check: {sum(len(a['front']) + len(a['back']) for a in anchors)} labels matched")


def read_json(path: Path) -> Any:
    return json.loads(path.read_text())


def index_tiles(map_tiles: list[MapTile]) -> dict[str, MapTile]:
    tiles_by_name: dict[str, MapTile] = {}
    for tile in map_tiles:
        name = tile["name"]
        if name in tiles_by_name:
            raise ValueError(f"duplicate map tile name in map-tiles.json: {name}")
        tiles_by_name[name] = tile
    return tiles_by_name


def build_prototypes(
    tiles_by_name: dict[str, MapTile],
    anchors: list[ClearingTypeAnchor],
    image_files: list[Path],
) -> dict[ClearingType, list[tuple[float, float, float]]]:
    samples: dict[ClearingType, list[tuple[float, float, float]]] = {}
    for anchor in anchors:
        tile = tiles_by_name.get(anchor["name"])
        if tile is None:
            raise ValueError(f"unknown map tile in clearing anchors: {anchor['name']}")
        check_anchor_counts(tile, anchor)
        for side, url_key in (("front", "imageUrl"), ("back", "imageSecondaryUrl")):
            image = load_image(tile[url_key], image_files)
            for clearing, label in zip(tile["clearings"], anchor[side]):
                clearing_type = normalize_clearing_type(label, tile["name"])
                samples.setdefault(clearing_type, []).append(clearing_feature(image, clearing))

    missing = set(CLEARING_TYPE_ALIASES.values()) - set(samples)
    if missing:
        raise ValueError(f"manual anchors do not cover clearing types: {sorted(missing)}")

    return samples


def check_anchor_counts(tile: MapTile, anchor: ClearingTypeAnchor) -> None:
    clearing_count = len(tile["clearings"])
    for side in ("front", "back"):
        side_count = len(anchor[side])
        if side_count != clearing_count:
            raise ValueError(
                f"{anchor['name']}: {side} has {side_count} types, "
                f"but map tile has {clearing_count} clearings"
            )


def classify_tiles(
    map_tiles: list[MapTile],
    prototypes: dict[ClearingType, list[tuple[float, float, float]]],
    image_files: list[Path],
) -> list[dict[str, Any]]:
    output = []
    for tile in map_tiles:
        front = load_image(tile["imageUrl"], image_files)
        back = load_image(tile["imageSecondaryUrl"], image_files)
        output.append(
            {
                "name": tile["name"],
                "terrain": tile["terrain"],
                "clearings": [
                    {
                        "x": clearing["x"],
                        "y": clearing["y"],
                        "type": [
                            classify_feature(clearing_feature(front, clearing), prototypes),
                            classify_feature(clearing_feature(back, clearing), prototypes),
                        ],
                    }
                    for clearing in tile["clearings"]
                ],
            }
        )
    return output


def load_image(url: str, image_files: list[Path]) -> Image.Image:
    path = local_image_path(url, image_files)
    if path is None:
        raise FileNotFoundError(f"no downloaded image found for {url}")
    return Image.open(path).convert("RGB")


def local_image_path(url: str, image_files: list[Path]) -> Path | None:
    parts = [part for part in url.split("/") if part]
    keys = [parts[-1]] if parts else []
    file_name = Path(url).name
    if file_name:
        keys.append(file_name)
    for key in keys:
        for path in image_files:
            if key in path.name:
                return path
    return None


def clearing_feature(image: Image.Image, clearing: Clearing) -> tuple[float, float, float]:
    center_x, center_y = source_image_point(clearing, image.width, image.height)
    pixels = image.load()
    hsv_values: list[tuple[float, float, float]] = []
    radius = image.width * 0.0375

    for y in range(max(0, int(center_y - radius)), min(image.height, int(center_y + radius) + 1), 2):
        for x in range(max(0, int(center_x - radius)), min(image.width, int(center_x + radius) + 1), 2):
            if (x - center_x) ** 2 + (y - center_y) ** 2 > radius**2:
                continue
            red, green, blue = pixels[x, y]
            maximum = max(red, green, blue)
            minimum = min(red, green, blue)
            saturation = (maximum - minimum) / max(maximum, 1)
            if maximum > 245 and saturation < 0.06:
                continue
            hue, sat, value = colorsys.rgb_to_hsv(red / 255, green / 255, blue / 255)
            hsv_values.append((hue * 360, sat, value))

    if not hsv_values:
        raise ValueError("clearing crop did not contain any usable pixels")
    return median_feature(hsv_values)


def source_image_point(clearing: Clearing, width: int, height: int) -> tuple[float, float]:
    displayed_x = width * (
        0.5
        + (clearing["x"] * CLEARING_MARKER_RADIUS_SCALE)
        / (TILE_COORDINATE_EXTENT * 2)
    )
    displayed_y = height * (
        0.5
        - (clearing["y"] * CLEARING_MARKER_RADIUS_SCALE)
        / (TILE_COORDINATE_EXTENT * 2)
    )
    delta_x = displayed_x - width / 2
    delta_y = displayed_y - height / 2
    source_x, source_y = rotate_point(delta_x, delta_y, -TILE_DISPLAY_ROTATION_DEGREES)
    return width / 2 + source_x, height / 2 + source_y


def rotate_point(x: float, y: float, degrees: float) -> tuple[float, float]:
    radians = math.radians(degrees)
    cos = math.cos(radians)
    sin = math.sin(radians)
    return x * cos - y * sin, x * sin + y * cos


def median_feature(values: list[tuple[float, float, float]]) -> tuple[float, float, float]:
    return tuple(statistics.median(value[index] for value in values) for index in range(3))


def classify_feature(
    feature: tuple[float, float, float],
    prototypes: dict[ClearingType, list[tuple[float, float, float]]],
) -> ClearingType:
    _hue, saturation, value = feature
    if saturation < 0.18 and value > 0.65:
        return "river"
    if saturation < 0.18:
        return "caves"
    return min(prototypes, key=lambda clearing_type: feature_distance_to_type(feature, prototypes[clearing_type]))


def feature_distance_to_type(
    feature: tuple[float, float, float],
    samples: list[tuple[float, float, float]],
) -> float:
    return min(feature_distance(feature, sample) for sample in samples)


def feature_distance(
    left: tuple[float, float, float],
    right: tuple[float, float, float],
) -> float:
    hue_delta = abs(left[0] - right[0])
    hue_delta = min(hue_delta, 360 - hue_delta) / 20
    saturation_delta = (left[1] - right[1]) * 8
    value_delta = (left[2] - right[2]) * 6
    return hue_delta**2 + saturation_delta**2 + value_delta**2


def anchor_mismatches(
    output: list[dict[str, Any]],
    anchors: list[ClearingTypeAnchor],
) -> list[str]:
    output_by_name = {tile["name"]: tile for tile in output}
    mismatches = []
    for anchor in anchors:
        tile = output_by_name[anchor["name"]]
        for index, clearing in enumerate(tile["clearings"]):
            expected_front = normalize_clearing_type(anchor["front"][index], anchor["name"])
            expected_back = normalize_clearing_type(anchor["back"][index], anchor["name"])
            actual_front, actual_back = clearing["type"]
            if actual_front != expected_front:
                mismatches.append(
                    f"{anchor['name']} front clearing {index + 1}: expected {expected_front}, got {actual_front}"
                )
            if actual_back != expected_back:
                mismatches.append(
                    f"{anchor['name']} back clearing {index + 1}: expected {expected_back}, got {actual_back}"
                )
    return mismatches


def normalize_clearing_type(value: str, tile_name: str) -> ClearingType:
    clearing_type = CLEARING_TYPE_ALIASES.get(value.strip().lower())
    if clearing_type is None:
        raise ValueError(f"{tile_name}: unknown clearing type {value!r}")
    return clearing_type


if __name__ == "__main__":
    main()