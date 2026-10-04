import { describe, it, expect } from "vitest";
import { cached, mapLimited } from "@/lib/tse/cache";
describe("Cache e deduplicação", () => {
  it("100 chamadas concorrentes fazem uma única carga", async () => {
    let calls = 0;
    const key = crypto.randomUUID();
    const task = () =>
      cached(key, 30, async () => {
        calls++;
        await new Promise((r) => setTimeout(r, 10));
        return { official: true };
      });
    const results = await Promise.all(Array.from({ length: 100 }, task));
    expect(calls).toBe(1);
    expect(results.every((r) => r.official)).toBe(true);
  });
  it("uma falha não é guardada indefinidamente", async () => {
    const key = crypto.randomUUID();
    await expect(
      cached(key, 30, async () => {
        throw new Error("TSE indisponível");
      }),
    ).rejects.toThrow();
    expect(await cached(key, 30, async () => 12)).toBe(12);
  });
  it("não ultrapassa a concorrência configurada e preserva a ordem", async () => {
    let active = 0,
      max = 0;
    const out = await mapLimited(
      [1, 2, 3, 4, 5, 6, 7],
      async (n) => {
        active++;
        max = Math.max(max, active);
        await new Promise((r) => setTimeout(r, 5));
        active--;
        return n * 2;
      },
      3,
    );
    expect(max).toBeLessThanOrEqual(3);
    expect(out).toEqual([2, 4, 6, 8, 10, 12, 14]);
  });
});
