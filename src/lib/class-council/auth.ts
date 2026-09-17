import type { NextRequest } from "next/server";

import { requireStaff, StaffAuthError } from "@/lib/auth/requireStaff";
import type { AuthDependencies } from "@/lib/auth/requireStaff";

export class CouncilAuthError extends StaffAuthError {}

export async function requireCouncilStaff(req: NextRequest, dependencies?: AuthDependencies) {
  try {
    return await requireStaff(req, dependencies);
  } catch (error) {
    if (error instanceof StaffAuthError) {
      if (error.status === 403) {
        throw new CouncilAuthError("Seu perfil não tem acesso ao Conselho de Classe.", 403);
      }
      throw new CouncilAuthError(error.message, error.status);
    }
    throw error;
  }
}
