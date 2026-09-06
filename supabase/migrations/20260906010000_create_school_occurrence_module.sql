begin;

alter table public.student_occurrences rename to school_occurrences;

alter table public.school_occurrences
  add column target_type text not null default 'student'
    check (target_type in ('student', 'class')),
  add column school_year smallint,
  add column class_official_code text,
  add column class_name text;

update public.school_occurrences
set school_year = extract(year from occurred_on)::smallint
where school_year is null;

alter table public.school_occurrences
  alter column school_year set not null,
  alter column student_id drop not null,
  add constraint school_occurrences_school_year_check
    check (school_year between 2020 and 2100),
  add constraint school_occurrences_target_check
    check (
      (target_type = 'student' and student_id is not null)
      or
      (target_type = 'class'
        and student_id is null
        and class_official_code is not null
        and class_name is not null
        and btrim(class_official_code) <> ''
        and btrim(class_name) <> '')
    );

drop index if exists public.student_occurrences_student_date_idx;
drop index if exists public.student_occurrences_category_date_idx;

create index school_occurrences_year_date_idx
  on public.school_occurrences (school_year, occurred_on desc, created_at desc);

create index school_occurrences_student_year_date_idx
  on public.school_occurrences (student_id, school_year, occurred_on desc, created_at desc)
  where target_type = 'student';

create index school_occurrences_class_year_date_idx
  on public.school_occurrences (school_year, class_official_code, occurred_on desc, created_at desc)
  where target_type = 'class';

create index school_occurrences_category_year_date_idx
  on public.school_occurrences (category, school_year, occurred_on desc);

alter trigger student_occurrences_set_updated_at on public.school_occurrences
  rename to school_occurrences_set_updated_at;

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
  select distinct on (o.student_id)
    o.student_id,
    count(*) over (partition by o.student_id) as occurrence_count,
    o.occurred_on as latest_occurred_on,
    o.category as latest_category
  from public.school_occurrences o
  where o.target_type = 'student'
    and (p_student_ids is null or o.student_id = any(p_student_ids))
    and (p_school_year is null or o.school_year = p_school_year)
  order by o.student_id, o.occurred_on desc, o.created_at desc, o.id;
$$;

revoke all on function public.list_student_occurrence_summaries(uuid[], smallint) from public, anon, authenticated;
grant execute on function public.list_student_occurrence_summaries(uuid[], smallint) to service_role;

create or replace function public.list_school_occurrence_years()
returns table (school_year smallint)
language sql
stable
set search_path = ''
as $$
  select distinct o.school_year
  from public.school_occurrences o
  order by o.school_year desc;
$$;

revoke all on function public.list_school_occurrence_years() from public, anon, authenticated;
grant execute on function public.list_school_occurrence_years() to service_role;

comment on table public.school_occurrences is
  'Registro factual de ocorrências escolares vinculadas a um estudante ou a uma turma em um ano letivo.';
comment on column public.school_occurrences.school_year is
  'Ano letivo usado para recortar as ocorrências exibidas no Conselho de Classe.';
comment on column public.school_occurrences.class_official_code is
  'Código estável da turma no ano letivo; não depende de um Conselho ou bimestre específico.';

commit;
