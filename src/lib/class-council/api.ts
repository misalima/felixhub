import { NextResponse } from "next/server";
import { CouncilAuthError } from "./auth";
import { CouncilDomainError } from "./validation";

export function councilApiError(error: unknown) {
  if (error instanceof CouncilAuthError || error instanceof CouncilDomainError) {
    return NextResponse.json({ error: error.message, code: "code" in error ? error.code : error.status === 401 ? "unauthorized" : "forbidden" }, { status: error.status });
  }
  return NextResponse.json({ error: "Não foi possível concluir a operação." }, { status: 500 });
}
