import type {
  CreateManagedUserInput,
  ManagedUser,
  UpdateManagedUserInput,
} from "@/types/admin-users";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || "Não foi possível concluir a operação.");
  }
  return body as T;
}

export function getManagedUsers() {
  return request<ManagedUser[]>("/api/admin/users");
}

export function createManagedUser(input: CreateManagedUserInput) {
  return request<ManagedUser>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateManagedUser(userId: string, input: UpdateManagedUserInput) {
  return request<ManagedUser>(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
