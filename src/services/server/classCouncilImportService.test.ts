import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: {} }));

import { assertImportDeletionAllowed } from "./classCouncilImportService";

describe("assertImportDeletionAllowed", () => {
  const base = {
    importId: "old-import",
    currentImportId: "current-import",
    latestImportId: "current-import",
    importCount: 3,
  };

  it("permite excluir uma versão histórica", () => {
    expect(() => assertImportDeletionAllowed(base)).not.toThrow();
  });

  it("protege o único relatório", () => {
    expect(() => assertImportDeletionAllowed({ ...base, importCount: 1 })).toThrowError(expect.objectContaining({ code: "only_import" }));
  });

  it("protege a versão atual", () => {
    expect(() => assertImportDeletionAllowed({ ...base, importId: "current-import" })).toThrowError(expect.objectContaining({ code: "current_import" }));
  });

  it("protege a versão mais recente mesmo quando ela não é a atual", () => {
    expect(() => assertImportDeletionAllowed({ ...base, importId: "latest-import", latestImportId: "latest-import" })).toThrowError(expect.objectContaining({ code: "latest_import" }));
  });
});
