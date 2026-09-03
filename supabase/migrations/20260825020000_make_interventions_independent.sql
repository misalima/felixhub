begin;

alter table public.class_council_interventions
  add column source_type text not null default 'class_council'
    check (source_type in ('class_council', 'student_profile', 'intervention_center')),
  add column reason text,
  add column target_class_name text;

update public.class_council_interventions intervention
set target_class_official_code = coalesce(intervention.target_class_official_code, council_class.official_code),
    target_school_year = coalesce(intervention.target_school_year, council.school_year),
    target_class_name = coalesce(intervention.target_class_name, council_class.display_name)
from public.class_council_classes council_class
join public.class_councils council on council.id = council_class.council_id
where council_class.id = intervention.origin_class_id;

alter table public.class_council_interventions
  alter column origin_council_id drop not null,
  alter column origin_class_id drop not null,
  drop constraint if exists class_council_interventions_check;

alter table public.class_council_interventions
  add constraint class_council_interventions_target_check check (
    (target_type = 'student' and target_student_id is not null)
    or
    (target_type = 'class' and target_class_official_code is not null and target_school_year is not null)
  ),
  add constraint class_council_interventions_source_check check (
    (
      source_type = 'class_council'
      and origin_council_id is not null
      and origin_class_id is not null
      and (target_type <> 'student' or origin_enrollment_id is not null)
    )
    or
    (
      source_type <> 'class_council'
      and origin_council_id is null
      and origin_class_id is null
      and origin_enrollment_id is null
      and reason is not null
      and btrim(reason) <> ''
    )
  );

create or replace function public.class_council_validate_intervention_links()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  origin_class_council_id uuid;
  origin_class_code text;
  origin_class_name text;
  origin_school_year smallint;
  enrollment_class_id uuid;
  enrollment_student_id uuid;
begin
  if new.source_type <> 'class_council' then
    return new;
  end if;

  select c.council_id, c.official_code, c.display_name, council.school_year
  into origin_class_council_id, origin_class_code, origin_class_name, origin_school_year
  from public.class_council_classes c
  join public.class_councils council on council.id = c.council_id
  where c.id = new.origin_class_id;

  if origin_class_council_id is null or origin_class_council_id <> new.origin_council_id then
    raise exception 'Intervention origin class must belong to the origin council';
  end if;

  if new.target_type = 'student' then
    select e.council_class_id, e.student_id
    into enrollment_class_id, enrollment_student_id
    from public.class_council_enrollments e
    where e.id = new.origin_enrollment_id;

    if enrollment_class_id is null
       or enrollment_class_id <> new.origin_class_id
       or enrollment_student_id <> new.target_student_id then
      raise exception 'Student intervention target must match the origin enrollment';
    end if;
  elsif new.target_type = 'class' then
    if new.target_class_official_code <> origin_class_code
       or new.target_school_year <> origin_school_year then
      raise exception 'Class intervention target must match the origin class and school year';
    end if;
  end if;

  new.target_class_official_code := coalesce(new.target_class_official_code, origin_class_code);
  new.target_school_year := coalesce(new.target_school_year, origin_school_year);
  new.target_class_name := coalesce(new.target_class_name, origin_class_name);
  return new;
end;
$$;

drop trigger if exists class_council_intervention_validate_links on public.class_council_interventions;
create trigger class_council_intervention_validate_links
before insert or update of source_type, target_type, origin_council_id, origin_class_id,
  origin_enrollment_id, target_student_id, target_class_official_code, target_school_year,
  target_class_name
on public.class_council_interventions
for each row execute function public.class_council_validate_intervention_links();

create index class_council_interventions_source_status_idx
  on public.class_council_interventions (source_type, status, created_at desc);

comment on column public.class_council_interventions.source_type is
  'Local onde a intervenção foi criada: Conselho, prontuário do estudante ou Central de intervenções.';
comment on column public.class_council_interventions.reason is
  'Motivo ou contexto informado na criação independente da intervenção.';
comment on column public.class_council_interventions.target_class_name is
  'Nome da turma preservado como fotografia para agrupamento e relatórios.';

comment on table public.class_council_interventions is
  'Intervenções pedagógicas individuais ou coletivas criadas no Conselho, no prontuário ou na Central e acompanhadas até seu encerramento.';

commit;
