"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  Eye,
  EyeOff,
  ImageUp,
  Loader2,
  LockKeyhole,
  Mail,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { HubHeader } from "@/components/hub/HubHeader";
import { PageHeader } from "@/components/hub/PageHeader";
import { UserAvatar } from "@/components/hub/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AVATAR_ACCEPT,
  changePassword,
  removeAvatarFile,
  uploadAvatar,
  validateAvatar,
} from "@/lib/accountApi";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  admin: "Administração",
  gestor: "Gestão",
  coordenador: "Coordenação",
  professor: "Professor",
};

export default function ProfilePage() {
  const { user, loading, updateProfile } = useUser();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/hub/login?redirect=/hub/perfil");
  }, [loading, router, user]);

  useEffect(() => {
    if (user) setFullName(user.fullName ?? "");
  }, [user]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function clearSelectedAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleAvatarSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      validateAvatar(file);
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    } catch (error) {
      event.target.value = "";
      toast.error(error instanceof Error ? error.message : "Imagem inválida.");
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const normalizedName = fullName.trim();
    if (normalizedName.length < 3) {
      toast.error("Informe seu nome completo.");
      return;
    }

    setSavingProfile(true);
    try {
      let avatarUrl = user.avatarUrl;
      if (avatarFile) avatarUrl = await uploadAvatar(user.id, avatarFile);

      const { error } = await updateProfile({
        fullName: normalizedName,
        avatarUrl,
      });

      if (error) throw new Error("Não foi possível salvar seu perfil.");

      clearSelectedAvatar();
      toast.success("Perfil atualizado com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar seu perfil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!user) return;

    if (avatarFile) {
      clearSelectedAvatar();
      return;
    }

    setRemovingAvatar(true);
    try {
      await removeAvatarFile(user.id);
      const { error } = await updateProfile({ avatarUrl: null });
      if (error) throw new Error("Não foi possível atualizar seu perfil.");
      toast.success("Foto removida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover a foto.");
    } finally {
      setRemovingAvatar(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      toast.error("A nova senha deve ter ao menos 8 caracteres, uma letra e um número.");
      return;
    }
    if (newPassword === currentPassword) {
      toast.error("A nova senha deve ser diferente da senha atual.");
      return;
    }
    if (newPassword !== passwordConfirmation) {
      toast.error("A confirmação da nova senha não confere.");
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword({
        email: user.email,
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordConfirmation("");
      toast.success("Senha alterada com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="hub-app-background grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-[3px] border-sky-200 border-t-sky-600 dark:border-sky-950 dark:border-t-sky-400" />
          <p className="text-xs font-medium text-muted-foreground">Carregando seu perfil...</p>
        </div>
      </div>
    );
  }

  const displayedAvatar = avatarPreview ?? user.avatarUrl;
  const hasAvatar = Boolean(displayedAvatar);

  return (
    <div className="hub-app-background min-h-screen">
      <HubHeader module={{ label: "Meu perfil", href: "/hub/perfil" }} />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <PageHeader
          icon={UserRound}
          eyebrow="Conta"
          title="Meu perfil"
          description="Atualize suas informações pessoais, foto e credenciais de acesso."
        />

        <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <Card className="overflow-hidden rounded-[1.75rem] border-slate-200/80 bg-white/82 py-0 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.55)] backdrop-blur dark:border-white/10 dark:bg-slate-900/72 lg:sticky lg:top-24">
            <div className="relative overflow-hidden border-b border-slate-200/70 bg-slate-50/85 px-6 pb-8 pt-9 dark:border-white/5 dark:bg-slate-950/35">
              <div className="relative flex flex-col items-center text-center">
                <div className="relative">
                  <UserAvatar
                    src={displayedAvatar}
                    fullName={fullName || user.fullName}
                    email={user.email}
                    className="size-32 rounded-[2rem] border-4 border-white text-3xl shadow-[0_18px_45px_-20px_rgba(15,23,42,0.65)] dark:border-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 flex size-10 items-center justify-center rounded-xl border-4 border-white bg-slate-950 text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-900 dark:bg-white dark:text-slate-950"
                    aria-label="Escolher nova foto"
                  >
                    <Camera className="size-4" />
                  </button>
                </div>
                <h2 className="mt-5 max-w-full truncate text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">
                  {fullName.trim() || user.email.split("@")[0]}
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {roleLabels[user.role] ?? user.role}
                </p>
              </div>
            </div>

            <CardContent className="space-y-3 px-5 pb-6 pt-5">
              <input
                ref={fileInputRef}
                type="file"
                accept={AVATAR_ACCEPT}
                className="sr-only"
                onChange={handleAvatarSelection}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => fileInputRef.current?.click()}
                disabled={savingProfile || removingAvatar}
              >
                <ImageUp className="size-4" />
                {hasAvatar ? "Trocar foto" : "Adicionar foto"}
              </Button>
              {hasAvatar ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-200"
                  onClick={() => void handleRemoveAvatar()}
                  disabled={savingProfile || removingAvatar}
                >
                  {removingAvatar ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  {avatarFile ? "Descartar foto" : "Remover foto"}
                </Button>
              ) : null}
              <p className="text-center text-[11px] leading-5 text-muted-foreground">
                JPG, PNG ou WebP · máximo de 2 MB
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <form onSubmit={handleProfileSubmit}>
              <Card className="rounded-[1.75rem] border-slate-200/80 bg-white/82 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.55)] backdrop-blur dark:border-white/10 dark:bg-slate-900/72">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-extrabold">
                    <UserRound className="size-4 text-sky-700 dark:text-sky-300" />
                    Informações pessoais
                  </CardTitle>
                  <CardDescription>O nome e a foto serão exibidos em todo o FelixHub.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="full-name">Nome completo</Label>
                    <Input
                      id="full-name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      maxLength={100}
                      autoComplete="name"
                      className="h-11 rounded-xl bg-white/70 dark:bg-slate-950/30"
                      placeholder="Como você quer ser chamado"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="profile-email"
                        value={user.email}
                        className="h-11 rounded-xl bg-slate-50 pl-10 dark:bg-slate-950/30"
                        disabled
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-role">Perfil de acesso</Label>
                    <Input
                      id="profile-role"
                      value={roleLabels[user.role] ?? user.role}
                      className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950/30"
                      disabled
                    />
                  </div>
                </CardContent>
                <CardFooter className="justify-end border-t border-slate-100 dark:border-white/5">
                  <Button type="submit" className="rounded-xl" disabled={savingProfile || !fullName.trim()}>
                    {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    {savingProfile ? "Salvando..." : "Salvar alterações"}
                  </Button>
                </CardFooter>
              </Card>
            </form>

            <form onSubmit={handlePasswordSubmit}>
              <Card className="rounded-[1.75rem] border-slate-200/80 bg-white/82 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.55)] backdrop-blur dark:border-white/10 dark:bg-slate-900/72">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-extrabold">
                    <LockKeyhole className="size-4 text-sky-700 dark:text-sky-300" />
                    Alterar senha
                  </CardTitle>
                  <CardDescription>Confirme sua senha atual antes de definir uma nova.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <PasswordField
                    id="current-password"
                    label="Senha atual"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    autoComplete="current-password"
                  />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <PasswordField
                      id="new-password"
                      label="Nova senha"
                      value={newPassword}
                      onChange={setNewPassword}
                      autoComplete="new-password"
                    />
                    <PasswordField
                      id="password-confirmation"
                      label="Confirmar nova senha"
                      value={passwordConfirmation}
                      onChange={setPasswordConfirmation}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="grid gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 text-xs text-muted-foreground dark:border-white/5 dark:bg-slate-950/30 sm:grid-cols-3">
                    <PasswordRequirement valid={newPassword.length >= 8}>8 caracteres</PasswordRequirement>
                    <PasswordRequirement valid={/[A-Za-z]/.test(newPassword)}>Uma letra</PasswordRequirement>
                    <PasswordRequirement valid={/\d/.test(newPassword)}>Um número</PasswordRequirement>
                  </div>
                </CardContent>
                <CardFooter className="justify-end border-t border-slate-100 dark:border-white/5">
                  <Button
                    type="submit"
                    className="rounded-xl"
                    disabled={changingPassword || !currentPassword || !newPassword || !passwordConfirmation}
                  >
                    {changingPassword ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}
                    {changingPassword ? "Alterando..." : "Alterar senha"}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="h-11 rounded-xl bg-white/70 pr-11 dark:bg-slate-950/30"
          required
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-white/5"
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function PasswordRequirement({ valid, children }: { valid: boolean; children: React.ReactNode }) {
  return (
    <span className={cn("flex items-center gap-2 transition-colors", valid && "font-medium text-emerald-700 dark:text-emerald-300")}>
      <span className={cn("flex size-4 items-center justify-center rounded-full border", valid ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/60" : "border-slate-300 dark:border-slate-700")}>
        {valid ? <Check className="size-2.5" /> : null}
      </span>
      {children}
    </span>
  );
}
