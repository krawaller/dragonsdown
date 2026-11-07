import { describe, expect, it } from "vitest";
import { collectNumberTokens, writeJson } from "./copy-tts-workshop-source";

describe("workshop number preservation", () => {
  it("preserves original tokens for small float drift across float32 values", () => {
    const original =
      '{"Transform":{"posX":89.41744,"rotX":0.0002370464790146798,"rotY":359.9999,"scaleX":1.0},"ColorDiffuse":{"r":0.12145691}}';
    const refreshed = {
      Transform: {
        posX: 89.417435,
        rotX: 0.00023306372168008238,
        rotY: 360,
        scaleX: 1.0000001,
      },
      ColorDiffuse: { r: 0.12145675 },
    };

    const output = writeJson(refreshed, [collectNumberTokens(original)]);
    expect(JSON.parse(output)).toEqual(JSON.parse(original));
    expect(output).toContain('"scaleX": 1.0');
  });

  it("keeps meaningful float changes and changes to other numeric fields", () => {
    const original =
      '{"posX":89.41744,"rotY":359.99,"r":0.12,"Count":10000000,"Value":0.000001}';
    const refreshed = {
      posX: 89.418,
      rotY: 360,
      r: 0.121,
      Count: 10000001,
      Value: 0.000002,
    };

    expect(
      JSON.parse(writeJson(refreshed, [collectNumberTokens(original)])),
    ).toEqual(refreshed);
  });

  it("prefers the committed baseline over an already refreshed token", () => {
    const committed = collectNumberTokens('{"posX":89.41744}');
    const current = collectNumberTokens('{"posX":89.417435}');

    expect(
      JSON.parse(writeJson({ posX: 89.417435 }, [committed, current])),
    ).toEqual({ posX: 89.41744 });
  });

  it("writes valid normalized numbers without a baseline", () => {
    expect(
      JSON.parse(writeJson({ scaleX: 1, posX: Math.fround(1.23) }, [])),
    ).toEqual({ scaleX: 1, posX: 1.23 });
  });

  it("preserves tokens when shortening a float reaches the tolerance boundary", () => {
    const baseline = collectNumberTokens('{"rotY":90.00609}');
    const output = writeJson({ rotY: Math.fround(90.006) }, [baseline]);

    expect(JSON.parse(output)).toEqual({ rotY: 90.00609 });
    expect(
      writeJson(JSON.parse(output), [baseline, collectNumberTokens(output)]),
    ).toBe(output);
  });
});
