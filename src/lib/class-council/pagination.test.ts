import { describe, expect, it, vi } from "vitest";
import { collectSupabasePages } from "./pagination";

describe("paginação das leituras acadêmicas", () => {
  it("não interrompe a leitura no limite padrão de mil registros", async () => {
    const source = Array.from({ length: 2_506 }, (_, index) => index);
    const fetchPage = vi.fn(async (from: number, to: number) => source.slice(from, to + 1));

    const rows = await collectSupabasePages(fetchPage);

    expect(rows).toEqual(source);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 999);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 1_000, 1_999);
    expect(fetchPage).toHaveBeenNthCalledWith(3, 2_000, 2_999);
  });

  it("faz uma leitura final vazia quando a quantidade é múltipla da página", async () => {
    const source = Array.from({ length: 1_000 }, (_, index) => index);
    const fetchPage = vi.fn(async (from: number, to: number) => source.slice(from, to + 1));

    expect(await collectSupabasePages(fetchPage)).toEqual(source);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
