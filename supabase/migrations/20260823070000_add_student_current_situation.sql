begin;

alter table public.students
  add column current_situation text not null default 'regular'
    check (current_situation in ('regular', 'infrequent', 'dropout', 'transferred')),
  add column situation_updated_at timestamptz,
  add column situation_updated_by uuid references public.profiles(id);

alter table public.class_council_enrollments
  drop constraint class_council_enrollments_attendance_situation_check;

alter table public.class_council_enrollments
  add constraint class_council_enrollments_attendance_situation_check
  check (attendance_situation in ('regular', 'infrequent', 'dropout', 'transferred'));

with latest_situation as (
  select distinct on (enrollment.student_id)
    enrollment.student_id,
    enrollment.attendance_situation
  from public.class_council_enrollments enrollment
  join public.class_council_classes council_class
    on council_class.id = enrollment.council_class_id
  join public.class_councils council
    on council.id = council_class.council_id
  where council.archived_at is null
  order by enrollment.student_id, council.school_year desc, council.term desc, council.meeting_date desc
)
update public.students student
set current_situation = latest_situation.attendance_situation
from latest_situation
where student.id = latest_situation.student_id;

create index students_current_situation_idx
  on public.students (current_situation, canonical_name);

create table public.student_situation_history (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students(id) on delete restrict,
  previous_situation text not null check (previous_situation in ('regular', 'infrequent', 'dropout', 'transferred')),
  new_situation text not null check (new_situation in ('regular', 'infrequent', 'dropout', 'transferred')),
  changed_by uuid not null references public.profiles(id),
  changed_at timestamptz not null default now(),
  check (previous_situation <> new_situation)
);

create index student_situation_history_student_idx
  on public.student_situation_history (student_id, changed_at desc);

create or replace function public.record_student_situation_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.current_situation is distinct from new.current_situation then
    if new.situation_updated_by is null then
      raise exception 'Situation changes require an actor';
    end if;
    insert into public.student_situation_history (
      student_id,
      previous_situation,
      new_situation,
      changed_by,
      changed_at
    ) values (
      new.id,
      old.current_situation,
      new.current_situation,
      new.situation_updated_by,
      coalesce(new.situation_updated_at, now())
    );
  end if;
  return new;
end;
$$;

create trigger students_record_situation_change
after update of current_situation on public.students
for each row execute function public.record_student_situation_change();

revoke all on function public.record_student_situation_change() from public, anon, authenticated;
grant execute on function public.record_student_situation_change() to service_role;

create or replace function public.set_student_current_situation(
  p_student_id uuid,
  p_situation text,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_situation not in ('regular', 'infrequent', 'dropout', 'transferred') then
    raise exception 'Invalid student situation';
  end if;

  update public.students
  set current_situation = p_situation,
      situation_updated_at = now(),
      situation_updated_by = p_actor_id
  where id = p_student_id;

  if not found then
    raise exception 'Student not found';
  end if;

  with latest_council as (
    select id, current_import_id
    from public.class_councils
    where archived_at is null
      and current_import_id is not null
    order by school_year desc, term desc, meeting_date desc
    limit 1
  )
  update public.class_council_enrollments enrollment
  set attendance_situation = p_situation,
      updated_by = p_actor_id
  from public.class_council_classes council_class, latest_council council
  where enrollment.student_id = p_student_id
    and enrollment.council_class_id = council_class.id
    and council_class.council_id = council.id
    and exists (
      select 1
      from public.class_council_student_snapshots snapshot
      where snapshot.enrollment_id = enrollment.id
        and snapshot.import_id = council.current_import_id
    );
end;
$$;

revoke all on function public.set_student_current_situation(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.set_student_current_situation(uuid, text, uuid) to service_role;

alter table public.student_situation_history enable row level security;
create policy staff_select
  on public.student_situation_history
  for select
  to authenticated
  using (public.is_active_staff());
revoke all on table public.student_situation_history from public, anon, authenticated;
grant select on table public.student_situation_history to authenticated;
grant all on table public.student_situation_history to service_role;
revoke all on sequence public.student_situation_history_id_seq from public, anon, authenticated;
grant usage, select on sequence public.student_situation_history_id_seq to service_role;

comment on column public.students.current_situation is
  'Situação permanente de frequência e vínculo: regular, infrequente, desistente ou transferido.';
comment on column public.class_council_enrollments.attendance_situation is
  'Situação de frequência e vínculo: regular, infrequente, desistente ou transferido. Alterações no conselho também atualizam o cadastro permanente.';
comment on table public.student_situation_history is
  'Histórico auditável das alterações manuais de frequência e vínculo do estudante.';

commit;
