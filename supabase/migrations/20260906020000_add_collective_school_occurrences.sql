begin;

alter table public.school_occurrences
  drop constraint school_occurrences_target_type_check,
  drop constraint school_occurrences_target_check;

alter table public.school_occurrences
  add constraint school_occurrences_target_type_check
    check (target_type in ('student', 'collective', 'class')),
  add constraint school_occurrences_target_check
    check (
      (target_type = 'student' and student_id is not null)
      or
      (target_type = 'collective'
        and student_id is null
        and class_official_code is null
        and class_name is null)
      or
      (target_type = 'class'
        and student_id is null
        and class_official_code is not null
        and class_name is not null
        and btrim(class_official_code) <> ''
        and btrim(class_name) <> '')
    );

create table public.school_occurrence_students (
  occurrence_id uuid not null references public.school_occurrences(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  class_official_code text,
  class_name text,
  created_at timestamptz not null default now(),
  primary key (occurrence_id, student_id)
);

create index school_occurrence_students_student_idx
  on public.school_occurrence_students (student_id, occurrence_id);

create index school_occurrence_students_class_idx
  on public.school_occurrence_students (class_official_code, occurrence_id);

alter table public.school_occurrence_students enable row level security;

create policy staff_select
  on public.school_occurrence_students
  for select
  to authenticated
  using (public.is_active_staff());

revoke all on table public.school_occurrence_students from public, anon, authenticated;
grant select on table public.school_occurrence_students to authenticated;
grant all on table public.school_occurrence_students to service_role;

create or replace function public.create_collective_school_occurrence(
  p_school_year smallint,
  p_occurred_on date,
  p_category text,
  p_notes text,
  p_guardian_notified boolean,
  p_actor_id uuid,
  p_students jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_occurrence_id uuid;
  v_student_count integer;
begin
  if jsonb_typeof(p_students) <> 'array' then
    raise exception 'A lista de estudantes é inválida.';
  end if;

  select count(distinct item->>'student_id')
  into v_student_count
  from jsonb_array_elements(p_students) item;

  if v_student_count < 2 then
    raise exception 'Selecione pelo menos dois estudantes.';
  end if;

  insert into public.school_occurrences (
    target_type, school_year, occurred_on, category, notes,
    guardian_notified, created_by, updated_by
  ) values (
    'collective', p_school_year, p_occurred_on, p_category, p_notes,
    p_guardian_notified, p_actor_id, p_actor_id
  ) returning id into v_occurrence_id;

  insert into public.school_occurrence_students (
    occurrence_id, student_id, class_official_code, class_name
  )
  select distinct on (item->>'student_id')
    v_occurrence_id,
    (item->>'student_id')::uuid,
    nullif(btrim(item->>'class_official_code'), ''),
    nullif(btrim(item->>'class_name'), '')
  from jsonb_array_elements(p_students) item
  order by item->>'student_id';

  return v_occurrence_id;
end;
$$;

revoke all on function public.create_collective_school_occurrence(smallint, date, text, text, boolean, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_collective_school_occurrence(smallint, date, text, text, boolean, uuid, jsonb) to service_role;

create or replace function public.list_student_occurrence_summaries(
  p_student_ids uuid[] default null,
  p_school_year smallint default null
)
returns table (
  student_id uuid,
  occurrence_count bigint,
  latest_occurred_on date,
  latest_category text
)
language sql
stable
set search_path = ''
as $$
  with student_occurrences as (
    select o.id, o.student_id, o.school_year, o.occurred_on, o.category, o.created_at
    from public.school_occurrences o
    where o.target_type = 'student'
    union all
    select o.id, os.student_id, o.school_year, o.occurred_on, o.category, o.created_at
    from public.school_occurrences o
    join public.school_occurrence_students os on os.occurrence_id = o.id
    where o.target_type = 'collective'
  )
  select distinct on (o.student_id)
    o.student_id,
    count(*) over (partition by o.student_id) as occurrence_count,
    o.occurred_on as latest_occurred_on,
    o.category as latest_category
  from student_occurrences o
  where (p_student_ids is null or o.student_id = any(p_student_ids))
    and (p_school_year is null or o.school_year = p_school_year)
  order by o.student_id, o.occurred_on desc, o.created_at desc, o.id;
$$;

comment on table public.school_occurrence_students is
  'Estudantes participantes de uma ocorrência coletiva, com o contexto de turma registrado no momento do fato.';

commit;
