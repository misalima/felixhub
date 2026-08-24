begin;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'gestor', 'coordenador'));

create table if not exists public.user_admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(id),
  target_user_id uuid references public.profiles(id),
  action text not null check (action in ('user_created', 'role_changed', 'user_activated', 'user_deactivated')),
  old_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_admin_audit_log_target_idx
  on public.user_admin_audit_log (target_user_id, created_at desc);

create index if not exists user_admin_audit_log_actor_idx
  on public.user_admin_audit_log (actor_id, created_at desc);

alter table public.user_admin_audit_log enable row level security;
revoke all on table public.user_admin_audit_log from public, anon, authenticated;
grant all on table public.user_admin_audit_log to service_role;
revoke all on sequence public.user_admin_audit_log_id_seq from public, anon, authenticated;
grant usage, select on sequence public.user_admin_audit_log_id_seq to service_role;

comment on table public.user_admin_audit_log is
  'Auditoria imutável das operações administrativas realizadas sobre usuários do FelixHub.';

commit;
