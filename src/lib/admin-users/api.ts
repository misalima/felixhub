import { NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/admin-users/auth";
import { UserAdminDomainError } from "@/services/server/userAdminService";

export function adminUserApiError(error: unknown) {
  if (error instanceof AdminAuthError) {
    return NextResponse.json(
      { error: error.message, code: error.status === 401 ? "unauthorized" : "forbidden" },
      { status: error.status },
    );
  }

  if (error instanceof UserAdminDomainError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { error: "Não foi possível concluir a operação." },
    { status: 500 },
  );
}
