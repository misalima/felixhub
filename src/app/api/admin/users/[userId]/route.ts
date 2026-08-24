import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-users/auth";
import { adminUserApiError } from "@/lib/admin-users/api";
import { updateManagedUser } from "@/services/server/userAdminService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { user } = await requireAdmin(request);
    const { userId } = await params;
    const body = await request.json();
    return NextResponse.json(await updateManagedUser(userId, body, user.id));
  } catch (error) {
    return adminUserApiError(error);
  }
}
