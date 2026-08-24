begin;

alter table public.class_council_interventions
  add column status_changed_at timestamptz not null default now(),
  add column started_at timestamptz,
  add column completed_at timestamptz,
  add column cancelled_at timestamptz;

update public.class_council_interventions
set started_at = case when status in ('in_progress', 'completed') then updated_at else null end,
    completed_at = case when status = 'completed' then updated_at else null end,
    cancelled_at = case when status = 'cancelled' then updated_at else null end,
    status_changed_at = updated_at;

create table public.class_council_intervention_status_history (
  id bigint generated always as identity primary key,
  intervention_id uuid not null references public.class_council_interventions(id) on delete restrict,
  previous_status text not null check (previous_status in ('pending', 'in_progress', 'completed', 'cancelled')),
  new_status text not null check (new_status in ('pending', 'in_progress', 'completed', 'cancelled')),
  changed_by uuid not null references public.profiles(id) on delete restrict,
  changed_at timestamptz not null default now(),
  check (previous_status <> new_status)
);

create index class_council_intervention_status_history_idx
  on public.class_council_intervention_status_history (intervention_id, changed_at desc);

create or replace function public.class_council_track_intervention_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    new.status_changed_at = now();

    if new.status = 'in_progress' then
      new.started_at = coalesce(new.started_at, now());
      new.completed_at = null;
      new.cancelled_at = null;
    elsif new.status = 'completed' then
      new.started_at = coalesce(new.started_at, now());
      new.completed_at = now();
      new.cancelled_at = null;
    elsif new.status = 'cancelled' then
      new.completed_at = null;
      new.cancelled_at = now();
    elsif new.status = 'pending' then
      new.completed_at = null;
      new.cancelled_at = null;
    end if;
  end if;
  return new;
end;
$$;

create trigger class_council_intervention_track_status
before update of status on public.class_council_interventions
for each row execute function public.class_council_track_intervention_status();

create or replace function public.class_council_record_intervention_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    insert into public.class_council_intervention_status_history (
      intervention_id,
      previous_status,
      new_status,
      changed_by,
      changed_at
    ) values (
      new.id,
      old.status,
      new.status,
      coalesce(new.updated_by, new.created_by),
      new.status_changed_at
    );
  end if;
  return new;
end;
$$;

create trigger class_council_intervention_record_status
after update of status on public.class_council_interventions
for each row execute function public.class_council_record_intervention_status();

alter table public.class_council_intervention_status_history enable row level security;
create policy staff_select
  on public.class_council_intervention_status_history
  for select
  to authenticated
  using (public.is_active_staff());

revoke all on table public.class_council_intervention_status_history from public, anon, authenticated;
grant select on table public.class_council_intervention_status_history to authenticated;
grant all on table public.class_council_intervention_status_history to service_role;
revoke all on sequence public.class_council_intervention_status_history_id_seq from public, anon, authenticated;
grant usage, select on sequence public.class_council_intervention_status_history_id_seq to service_role;

comment on table public.class_council_intervention_status_history is
  'Histórico auditável do ciclo operacional das intervenções definidas nos Conselhos de Classe.';
comment on column public.class_council_interventions.status_changed_at is
  'Momento da última transição de status, independente da conclusão da reunião de origem.';

commit;
