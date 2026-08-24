import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-users/auth";
import { adminUserApiError } from "@/lib/admin-users/api";
import { createManagedUser, listManagedUsers } from "@/services/server/userAdminService";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return NextResponse.json(await listManagedUsers());
  } catch (error) {
    return adminUserApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAdmin(request);
    const body = await request.json();
    return NextResponse.json(await createManagedUser(body, user.id), { status: 201 });
  } catch (error) {
    return adminUserApiError(error);
  }
}
