import { describe, expect, it } from "vitest";
import { assertClassCanComplete, assertCouncilCanComplete, assertCouncilCanReopen, assertImportCanActivate, findNextOpenClass } from "./stateRules";

describe("transições protegidas", () => {
  it("bloqueia turma sem participante", () => expect(() => assertClassCanComplete(0)).toThrow(/participante/i));
  it("aceita turma com participante", () => expect(() => assertClassCanComplete(1)).not.toThrow());
  it("bloqueia conselho com turma pendente", () => expect(() => assertCouncilCanComplete({ hasCurrentImport: true, classStatuses: ["completed", "in_progress"] })).toThrow(/todas as turmas/i));
  it("bloqueia conselho sem importação", () => expect(() => assertCouncilCanComplete({ hasCurrentImport: false, classStatuses: ["completed"] })).toThrow(/importação/i));
  it("permite reabrir apenas conselho concluído", () => {
    expect(() => assertCouncilCanReopen("completed")).not.toThrow();
    expect(() => assertCouncilCanReopen("in_progress")).toThrow(/concluído/i);
  });
  it("bloqueia ativação com erro ou reconciliação incompleta", () => {
    expect(() => assertImportCanActivate({ blockingErrorCount: 1, snapshotCount: 0, resultCount: 0, expectedSnapshotCount: 1, expectedResultCount: 1 })).toThrow(/bloqueantes/i);
    expect(() => assertImportCanActivate({ blockingErrorCount: 0, snapshotCount: 1, resultCount: 0, expectedSnapshotCount: 1, expectedResultCount: 1 })).toThrow(/reconciliação/i);
  });
  it("aceita ativação reconciliada", () => expect(() => assertImportCanActivate({ blockingErrorCount: 0, snapshotCount: 2, resultCount: 20, expectedSnapshotCount: 2, expectedResultCount: 20 })).not.toThrow());
});

describe("navegação entre turmas", () => {
  const classes = [
    { id: "1MA", status: "completed" },
    { id: "1MB", status: "completed" },
    { id: "1MC", status: "in_progress" },
    { id: "1MD", status: "not_started" },
  ];

  it("encontra a próxima turma aberta na ordem", () => expect(findNextOpenClass(classes, "1MB")?.id).toBe("1MC"));
  it("volta ao início quando necessário", () => expect(findNextOpenClass(classes, "1MD")?.id).toBe("1MC"));
  it("retorna nulo quando todas foram concluídas", () => expect(findNextOpenClass(classes.map((item) => ({ ...item, status: "completed" })), "1MB")).toBeNull());
});
