import { supabase } from "@/lib/supabaseClient";

export const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

const allowedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateAvatar(file: File) {
  if (!allowedAvatarTypes.has(file.type)) {
    throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  }

  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("A imagem deve ter no máximo 2 MB.");
  }
}

export async function uploadAvatar(userId: string, file: File) {
  validateAvatar(file);

  const path = `${userId}/avatar`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true,
  });

  if (error) throw new Error("Não foi possível enviar a imagem. Tente novamente.");

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function removeAvatarFile(userId: string) {
  const { error } = await supabase.storage.from("avatars").remove([`${userId}/avatar`]);
  if (error) throw new Error("Não foi possível remover a imagem.");
}

export async function changePassword({
  email,
  currentPassword,
  newPassword,
}: {
  email: string;
  currentPassword: string;
  newPassword: string;
}) {
  const { error: authenticationError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (authenticationError) throw new Error("A senha atual está incorreta.");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error("Não foi possível alterar a senha. Tente novamente.");
}
