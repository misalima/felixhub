"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserRoundCog,
  UsersRound,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { HubHeader } from "@/components/hub/HubHeader";
import { PageHeader } from "@/components/hub/PageHeader";
import { UserAvatar } from "@/components/hub/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUser } from "@/hooks/useUser";
import {
  createManagedUser,
  getManagedUsers,
  updateManagedUser,
} from "@/lib/adminUsersApi";
import {
  MANAGED_USER_ROLES,
  type ManagedUser,
  type ManagedUserRole,
} from "@/types/admin-users";

const roleLabels: Record<ManagedUserRole, string> = {
  admin: "Administração",
  gestor: "Gestão",
  coordenador: "Coordenação",
};

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [statusUser, setStatusUser] = useState<ManagedUser | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/hub/login?redirect=/hub/usuarios");
  }, [authLoading, router, user]);

  const loadUsers = useCallback(async () => {
    if (user?.role !== "admin") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setUsers(await getManagedUsers());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return users;
    return users.filter((item) =>
      [item.fullName, item.email, roleLabels[item.role]]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("pt-BR").includes(normalized)),
    );
  }, [search, users]);

  if (authLoading || !user) {
    return <LoadingScreen />;
  }

  if (user.role !== "admin") {
    return (
      <div className="hub-app-background min-h-screen">
        <HubHeader module={{ label: "Usuários", href: "/hub/usuarios" }} />
        <main className="grid min-h-[calc(100vh-4.5rem)] place-items-center p-6">
          <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-8 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/75">
            <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <ShieldAlert className="size-6" />
            </span>
            <h1 className="text-xl font-extrabold tracking-tight">Acesso exclusivo para administradores</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Seu perfil não possui permissão para criar ou alterar usuários.</p>
            <Button asChild className="mt-6 rounded-xl"><Link href="/hub">Voltar ao painel</Link></Button>
          </div>
        </main>
      </div>
    );
  }

  const activeCount = users.filter((item) => item.isActive).length;
  const adminCount = users.filter((item) => item.isActive && item.role === "admin").length;

  return (
    <div className="hub-app-background min-h-screen">
      <HubHeader module={{ label: "Usuários", href: "/hub/usuarios" }} />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <PageHeader
          icon={UsersRound}
          eyebrow="Administração"
          title="Gerenciar usuários"
          description="Crie contas e controle os papéis e acessos da equipe."
          actions={<Button className="rounded-xl" onClick={() => setCreateOpen(true)}><Plus className="size-4" />Novo usuário</Button>}
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Metric label="Usuários cadastrados" value={loading ? "—" : users.length} icon={UsersRound} />
          <Metric label="Contas ativas" value={loading ? "—" : activeCount} icon={UserCheck} />
          <Metric label="Administradores ativos" value={loading ? "—" : adminCount} icon={ShieldCheck} />
        </div>

        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/85 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-slate-900/72">
          <div className="flex flex-col gap-4 border-b border-slate-200/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-white/5">
            <div>
              <h2 className="font-extrabold tracking-tight">Equipe do FelixHub</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {loading ? "Carregando usuários..." : `${filteredUsers.length} usuário(s) encontrado(s)`}
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, e-mail ou papel" className="h-10 rounded-xl bg-white/75 pl-9 dark:bg-slate-950/30" />
            </div>
          </div>

          {loading ? (
            <div className="grid min-h-72 place-items-center"><Loader2 className="size-6 animate-spin text-sky-600" /></div>
          ) : error ? (
            <div className="p-8 text-center"><p className="text-sm text-red-600 dark:text-red-300">{error}</p><Button variant="outline" className="mt-4 rounded-xl" onClick={() => void loadUsers()}>Tentar novamente</Button></div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center"><UsersRound className="mx-auto size-9 text-muted-foreground" /><h3 className="mt-3 font-bold">Nenhum usuário encontrado</h3><p className="mt-1 text-sm text-muted-foreground">Ajuste a busca ou crie uma nova conta.</p></div>
          ) : (
            <>
              <div className="divide-y divide-slate-200/70 md:hidden dark:divide-white/5">
                {filteredUsers.map((item) => {
                  const isSelf = item.id === user.id;
                  return (
                    <article key={item.id} className="p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar src={item.avatarUrl} fullName={item.fullName} email={item.email} className="size-11 rounded-xl text-xs" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {item.fullName || item.email.split("@")[0]}
                            {isSelf ? <span className="ml-1.5 text-[10px] font-medium text-muted-foreground">(você)</span> : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{item.email}</p>
                        </div>
                      </div>

                      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50/90 p-3 dark:bg-slate-950/35">
                        <div>
                          <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Papel</dt>
                          <dd className="mt-1 truncate text-xs font-semibold">{roleLabels[item.role]}</dd>
                        </div>
                        <div>
                          <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Status</dt>
                          <dd className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
                            <span className={`size-1.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                            {item.isActive ? "Ativo" : "Desativado"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Criado em</dt>
                          <dd className="mt-1 text-xs font-semibold">{new Date(item.createdAt).toLocaleDateString("pt-BR")}</dd>
                        </div>
                      </dl>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setEditingUser(item)} disabled={isSelf}>
                          <Pencil className="size-3.5" />Papel
                        </Button>
                        <Button variant="outline" size="sm" className={`rounded-lg ${item.isActive ? "text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-950/40" : "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"}`} onClick={() => setStatusUser(item)} disabled={isSelf}>
                          {item.isActive ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                          {item.isActive ? "Desativar" : "Ativar"}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-72 pl-5">Usuário</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="pr-5 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((item) => {
                    const isSelf = item.id === user.id;
                    return (
                      <TableRow key={item.id} className="group">
                        <TableCell className="pl-5">
                          <div className="flex items-center gap-3">
                            <UserAvatar src={item.avatarUrl} fullName={item.fullName} email={item.email} className="size-10 rounded-xl text-xs" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{item.fullName || item.email.split("@")[0]}{isSelf ? <span className="ml-1.5 text-[10px] font-medium text-muted-foreground">(você)</span> : null}</p>
                              <p className="truncate text-xs text-muted-foreground">{item.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{roleLabels[item.role]}</TableCell>
                        <TableCell><span className="inline-flex items-center gap-2 text-sm"><span className={`size-2 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />{item.isActive ? "Ativo" : "Desativado"}</span></TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="pr-5">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setEditingUser(item)} disabled={isSelf}><Pencil className="size-3.5" />Papel</Button>
                            <Button variant="ghost" size="sm" className={`rounded-lg ${item.isActive ? "text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-950/40" : "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"}`} onClick={() => setStatusUser(item)} disabled={isSelf}>{item.isActive ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}{item.isActive ? "Desativar" : "Ativar"}</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </section>
      </main>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(created) => setUsers((current) => [...current, created].sort(sortUsers))} />
      <EditRoleDialog user={editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }} onUpdated={(updated) => { setUsers((current) => current.map((item) => item.id === updated.id ? updated : item)); setEditingUser(null); }} />
      <StatusDialog user={statusUser} onOpenChange={(open) => { if (!open) setStatusUser(null); }} onUpdated={(updated) => { setUsers((current) => current.map((item) => item.id === updated.id ? updated : item)); setStatusUser(null); }} />
    </div>
  );
}

function LoadingScreen() {
  return <div className="hub-app-background grid min-h-screen place-items-center"><Loader2 className="size-7 animate-spin text-sky-600" /></div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof UsersRound }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/82 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70"><span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"><Icon className="size-4.5" /></span><span><strong className="block text-xl font-extrabold leading-none">{value}</strong><span className="mt-1 block text-[11px] text-muted-foreground">{label}</span></span></div>;
}

function sortUsers(left: ManagedUser, right: ManagedUser) {
  return (left.fullName || left.email).localeCompare(right.fullName || right.email, "pt-BR");
}

function CreateUserDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (user: ManagedUser) => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ManagedUserRole>("coordenador");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const created = await createManagedUser({ fullName, email, role, password });
      onCreated(created);
      onOpenChange(false);
      setFullName(""); setEmail(""); setRole("coordenador"); setPassword("");
      toast.success("Usuário criado com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o usuário.");
    } finally { setSubmitting(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="rounded-2xl sm:max-w-xl"><form onSubmit={submit}><DialogHeader><DialogTitle>Novo usuário</DialogTitle><DialogDescription>Crie uma conta com senha temporária para um membro da equipe.</DialogDescription></DialogHeader><div className="grid gap-4 py-5 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="new-user-name">Nome completo</Label><Input id="new-user-name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-11 rounded-xl" required minLength={3} maxLength={100} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="new-user-email">E-mail</Label><Input id="new-user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 rounded-xl" required /></div><div className="space-y-2"><Label>Papel de acesso</Label><Select value={role} onValueChange={(value) => setRole(value as ManagedUserRole)}><SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{MANAGED_USER_ROLES.map((item) => <SelectItem key={item} value={item}>{roleLabels[item]}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="new-user-password">Senha temporária</Label><div className="relative"><Input id="new-user-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 rounded-xl pr-10" autoComplete="new-password" required minLength={8} /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div><p className="text-[10px] text-muted-foreground">8 caracteres, uma letra e um número.</p></div></div><DialogFooter><Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" className="rounded-xl" disabled={submitting}>{submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}{submitting ? "Criando..." : "Criar usuário"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function EditRoleDialog({ user, onOpenChange, onUpdated }: { user: ManagedUser | null; onOpenChange: (open: boolean) => void; onUpdated: (user: ManagedUser) => void }) {
  const [role, setRole] = useState<ManagedUserRole>("coordenador");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (user) setRole(user.role); }, [user]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!user) return; setSubmitting(true); try { const updated = await updateManagedUser(user.id, { role }); onUpdated(updated); toast.success("Papel atualizado."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o papel."); } finally { setSubmitting(false); } }
  return <Dialog open={Boolean(user)} onOpenChange={onOpenChange}><DialogContent className="rounded-2xl"><form onSubmit={submit}><DialogHeader><DialogTitle>Alterar papel</DialogTitle><DialogDescription>Defina as permissões de {user?.fullName || user?.email}.</DialogDescription></DialogHeader><div className="space-y-2 py-5"><Label>Papel de acesso</Label><Select value={role} onValueChange={(value) => setRole(value as ManagedUserRole)}><SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{MANAGED_USER_ROLES.map((item) => <SelectItem key={item} value={item}>{roleLabels[item]}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" className="rounded-xl" disabled={submitting || role === user?.role}>{submitting ? <Loader2 className="size-4 animate-spin" /> : <UserRoundCog className="size-4" />}{submitting ? "Salvando..." : "Salvar papel"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function StatusDialog({ user, onOpenChange, onUpdated }: { user: ManagedUser | null; onOpenChange: (open: boolean) => void; onUpdated: (user: ManagedUser) => void }) {
  const [submitting, setSubmitting] = useState(false);
  async function confirm() { if (!user) return; setSubmitting(true); try { const updated = await updateManagedUser(user.id, { isActive: !user.isActive }); onUpdated(updated); toast.success(updated.isActive ? "Usuário ativado." : "Usuário desativado."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível alterar o acesso."); } finally { setSubmitting(false); } }
  return <AlertDialog open={Boolean(user)} onOpenChange={onOpenChange}><AlertDialogContent className="rounded-2xl"><AlertDialogHeader><AlertDialogTitle>{user?.isActive ? "Desativar usuário?" : "Ativar usuário?"}</AlertDialogTitle><AlertDialogDescription>{user?.isActive ? `${user.fullName || user.email} perderá o acesso ao FelixHub. Os dados e o histórico serão preservados.` : `${user?.fullName || user?.email} poderá voltar a entrar no FelixHub.`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={submitting} onClick={(event) => { event.preventDefault(); void confirm(); }} className={user?.isActive ? "bg-red-600 text-white hover:bg-red-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}>{submitting ? <Loader2 className="size-4 animate-spin" /> : user?.isActive ? <UserX className="size-4" /> : <UserCheck className="size-4" />}{submitting ? "Salvando..." : user?.isActive ? "Desativar" : "Ativar"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
