import { CouncilDomainError } from "./validation";

export function assertClassCanComplete(participantCount: number) {
  if (participantCount < 1) {
    throw new CouncilDomainError("Adicione pelo menos um participante antes de concluir a turma.", 409, "participant_required");
  }
}

export function assertCouncilCanComplete(input: { hasCurrentImport: boolean; classStatuses: string[] }) {
  if (!input.hasCurrentImport) throw new CouncilDomainError("O conselho precisa de uma importação confirmada.", 409, "import_required");
  if (!input.classStatuses.length) throw new CouncilDomainError("O conselho não possui turmas.", 409, "classes_required");
  if (input.classStatuses.some((status) => status !== "completed")) {
    throw new CouncilDomainError("Conclua todas as turmas antes de concluir o conselho.", 409, "classes_pending");
  }
}

export function assertCouncilCanReopen(status: string) {
  if (status !== "completed") {
    throw new CouncilDomainError("Somente um conselho concluído pode ser reaberto.", 409, "invalid_transition");
  }
}

export function findNextOpenClass<T extends { id: string; status: string }>(classes: T[], currentClassId: string): T | null {
  const currentIndex = classes.findIndex((item) => item.id === currentClassId);
  const orderedCandidates = currentIndex >= 0
    ? [...classes.slice(currentIndex + 1), ...classes.slice(0, currentIndex)]
    : classes;
  return orderedCandidates.find((item) => item.id !== currentClassId && ["not_started", "in_progress"].includes(item.status)) ?? null;
}

export function assertImportCanActivate(input: { blockingErrorCount: number; snapshotCount: number; resultCount: number; expectedSnapshotCount: number; expectedResultCount: number }) {
  if (input.blockingErrorCount > 0) throw new CouncilDomainError("A importação contém erros bloqueantes.", 409, "blocking_import_errors");
  if (input.snapshotCount !== input.expectedSnapshotCount || input.resultCount !== input.expectedResultCount) {
    throw new CouncilDomainError("A reconciliação da importação falhou.", 409, "import_reconciliation_failed");
  }
}
