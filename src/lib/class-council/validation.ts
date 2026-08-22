import { MAX_IMPORT_BYTES, XLSX_MIME } from "./constants";

export class CouncilDomainError extends Error {
  constructor(message: string, public readonly status = 400, public readonly code = "invalid_request") {
    super(message);
  }
}

export function validateXlsxUpload(file: File, buffer: Buffer): void {
  if (!file.name.toLocaleLowerCase("pt-BR").endsWith(".xlsx")) {
    throw new CouncilDomainError("Envie o Relatório de Desempenho no formato .xlsx.", 415, "invalid_extension");
  }
  if (file.size <= 0 || file.size > MAX_IMPORT_BYTES) {
    throw new CouncilDomainError("O arquivo deve ter no máximo 25 MiB.", 413, "file_too_large");
  }
  if (file.type && file.type !== XLSX_MIME && file.type !== "application/octet-stream") {
    throw new CouncilDomainError("O tipo do arquivo não corresponde a um XLSX.", 415, "invalid_mime");
  }
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new CouncilDomainError("O conteúdo do arquivo não é um XLSX válido.", 415, "invalid_signature");
  }
}

export function parseUuid(value: string, label = "Identificador"): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new CouncilDomainError(`${label} inválido.`);
  }
  return value;
}

export function optionalText(value: unknown, maxLength = 5000): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > maxLength) throw new CouncilDomainError(`O texto ultrapassa ${maxLength} caracteres.`);
  return text;
}
