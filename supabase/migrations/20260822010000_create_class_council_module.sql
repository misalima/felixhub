begin;

-- Conselho de Classe: schema inicial.
-- Esta migração não importa dados e não altera tabelas existentes.

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'gestor')
  );
$$;

revoke all on function public.is_active_staff() from public, anon;
grant execute on function public.is_active_staff() to authenticated, service_role;

create table public.class_councils (
  id uuid primary key default gen_random_uuid(),
  school_year smallint not null check (school_year between 2020 and 2100),
  term smallint not null check (term between 1 and 4),
  offering text not null check (offering in ('regular', 'eja')),
  meeting_date date not null,
  status text not null default 'draft'
    check (status in ('draft', 'preparation', 'in_progress', 'completed', 'reopened', 'archived')),
  criteria jsonb not null default '{"low_grade_threshold": 6, "low_grade_subject_alert_count": 4, "low_attendance_threshold": 75}'::jsonb,
  current_import_id uuid,
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  completed_by uuid references public.profiles(id),
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(criteria) = 'object'),
  check ((status = 'archived') = (archived_at is not null))
);

create unique index class_councils_active_period_uidx
  on public.class_councils (school_year, term, offering)
  where archived_at is null;

create table public.class_council_imports (
  id uuid primary key default gen_random_uuid(),
  council_id uuid not null references public.class_councils(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'uploaded'
    check (status in ('uploaded', 'validating', 'validated', 'importing', 'confirmed', 'failed')),
  original_file_name text not null,
  original_file_path text not null,
  file_mime_type text not null default 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  file_size_bytes bigint not null check (file_size_bytes > 0),
  file_sha256 text not null check (file_sha256 ~ '^[0-9a-f]{64}$'),
  source_generated_at timestamptz,
  blocking_error_count integer not null default 0 check (blocking_error_count >= 0),
  warning_count integer not null default 0 check (warning_count >= 0),
  summary jsonb not null default '{}'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles(id),
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(summary) = 'object'),
  check (jsonb_typeof(issues) = 'array'),
  unique (council_id, version),
  unique (council_id, file_sha256),
  unique (council_id, id)
);

alter table public.class_councils
  add constraint class_councils_current_import_belongs_to_council_fkey
  foreign key (id, current_import_id)
  references public.class_council_imports(council_id, id)
  on delete restrict;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  enrollment_number text not null unique check (btrim(enrollment_number) <> ''),
  canonical_name text not null check (btrim(canonical_name) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.class_council_classes (
  id uuid primary key default gen_random_uuid(),
  council_id uuid not null references public.class_councils(id) on delete cascade,
  official_code text not null check (btrim(official_code) <> ''),
  display_name text not null check (btrim(display_name) <> ''),
  grade_label text not null check (btrim(grade_label) <> ''),
  shift text not null check (shift in ('morning', 'afternoon', 'evening')),
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  class_strengths text,
  general_difficulties text,
  behavior_and_coexistence text,
  learning_aspects text,
  collective_strategies text,
  editing_by uuid references public.profiles(id),
  editing_expires_at timestamptz,
  row_version integer not null default 1 check (row_version > 0),
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  completed_by uuid references public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (council_id, official_code)
);

create table public.class_council_enrollments (
  id uuid primary key default gen_random_uuid(),
  council_class_id uuid not null references public.class_council_classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  discussed boolean not null default false,
  activities_status text not null default 'not_informed'
    check (activities_status in ('not_informed', 'regular', 'irregular', 'does_not_do')),
  pedagogical_observation text,
  positive_notes text,
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (council_class_id, student_id)
);

create table public.class_council_student_snapshots (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.class_council_enrollments(id) on delete cascade,
  import_id uuid not null references public.class_council_imports(id) on delete cascade,
  imported_name text not null check (btrim(imported_name) <> ''),
  race_color text,
  pcd_status text,
  enrollment_status text,
  attendance_rate numeric(5,2) check (attendance_rate between 0 and 100),
  created_at timestamptz not null default now(),
  unique (enrollment_id, import_id)
);

create table public.class_council_subjects (
  id uuid primary key default gen_random_uuid(),
  council_class_id uuid not null references public.class_council_classes(id) on delete cascade,
  normalized_name text not null check (btrim(normalized_name) <> ''),
  display_name text not null check (btrim(display_name) <> ''),
  teacher_name text,
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (council_class_id, normalized_name)
);

create table public.class_council_results (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.class_council_imports(id) on delete cascade,
  enrollment_id uuid not null references public.class_council_enrollments(id) on delete cascade,
  subject_id uuid not null references public.class_council_subjects(id) on delete cascade,
  term smallint not null check (term between 1 and 4),
  grade numeric(4,2) check (grade between 0 and 10),
  grade_marker text,
  absences integer check (absences >= 0),
  created_at timestamptz not null default now(),
  unique (import_id, enrollment_id, subject_id, term),
  check (not (grade is not null and grade_marker is not null))
);

create table public.class_council_behaviors (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.class_council_enrollments(id) on delete cascade,
  category text not null check (category in (
    'excessive_talking',
    'inappropriate_phone_use',
    'peer_conflicts',
    'disrespect_or_coexistence_difficulty',
    'low_participation',
    'recurring_lateness',
    'activities_not_completed',
    'other'
  )),
  description text,
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, category)
);

create table public.class_council_participants (
  id uuid primary key default gen_random_uuid(),
  council_class_id uuid not null references public.class_council_classes(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  role_or_subject text,
  position integer not null default 0 check (position >= 0),
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.class_council_interventions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('student', 'class')),
  origin_council_id uuid not null references public.class_councils(id) on delete restrict,
  origin_class_id uuid not null references public.class_council_classes(id) on delete restrict,
  origin_enrollment_id uuid references public.class_council_enrollments(id) on delete restrict,
  target_student_id uuid references public.students(id) on delete restrict,
  target_class_official_code text,
  target_school_year smallint check (target_school_year between 2020 and 2100),
  description text not null check (btrim(description) <> ''),
  responsible_name text,
  due_date date,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  outcome text,
  cancellation_reason text,
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (target_type = 'student' and target_student_id is not null and origin_enrollment_id is not null)
    or
    (target_type = 'class' and target_class_official_code is not null and target_school_year is not null)
  )
);

create table public.class_council_audit_log (
  id bigint generated always as identity primary key,
  council_id uuid not null references public.class_councils(id) on delete restrict,
  council_class_id uuid references public.class_council_classes(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (btrim(event_type) <> ''),
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(metadata) = 'object')
);

create index class_council_imports_council_idx on public.class_council_imports(council_id, created_at desc);
create index class_council_classes_council_idx on public.class_council_classes(council_id, display_name);
create index class_council_enrollments_class_idx on public.class_council_enrollments(council_class_id);
create index class_council_enrollments_student_idx on public.class_council_enrollments(student_id);
create index class_council_snapshots_import_idx on public.class_council_student_snapshots(import_id);
create index class_council_results_import_idx on public.class_council_results(import_id);
create index class_council_results_enrollment_term_idx on public.class_council_results(enrollment_id, term);
create index class_council_results_subject_term_idx on public.class_council_results(subject_id, term);
create index class_council_behaviors_enrollment_idx on public.class_council_behaviors(enrollment_id);
create index class_council_participants_class_idx on public.class_council_participants(council_class_id, position);
create index class_council_interventions_student_idx on public.class_council_interventions(target_student_id, status);
create index class_council_interventions_class_idx on public.class_council_interventions(target_school_year, target_class_official_code, status);
create index class_council_audit_council_idx on public.class_council_audit_log(council_id, created_at desc);

create or replace function public.class_council_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger class_councils_set_updated_at
before update on public.class_councils
for each row execute function public.class_council_set_updated_at();

create trigger class_council_imports_set_updated_at
before update on public.class_council_imports
for each row execute function public.class_council_set_updated_at();

create trigger students_set_updated_at
before update on public.students
for each row execute function public.class_council_set_updated_at();

create trigger class_council_classes_set_updated_at
before update on public.class_council_classes
for each row execute function public.class_council_set_updated_at();

create trigger class_council_enrollments_set_updated_at
before update on public.class_council_enrollments
for each row execute function public.class_council_set_updated_at();

create trigger class_council_subjects_set_updated_at
before update on public.class_council_subjects
for each row execute function public.class_council_set_updated_at();

create trigger class_council_behaviors_set_updated_at
before update on public.class_council_behaviors
for each row execute function public.class_council_set_updated_at();

create trigger class_council_participants_set_updated_at
before update on public.class_council_participants
for each row execute function public.class_council_set_updated_at();

create trigger class_council_interventions_set_updated_at
before update on public.class_council_interventions
for each row execute function public.class_council_set_updated_at();

create or replace function public.class_council_validate_class_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    if not exists (
      select 1
      from public.class_council_participants p
      where p.council_class_id = new.id
    ) then
      raise exception 'A class council cannot be completed without at least one participant';
    end if;

    if new.completed_by is null then
      raise exception 'completed_by is required when completing a class council';
    end if;

    new.completed_at = coalesce(new.completed_at, now());
  elsif old.status = 'completed' and new.status is distinct from 'completed' then
    new.completed_at = null;
    new.completed_by = null;
  end if;

  return new;
end;
$$;

create trigger class_council_class_validate_completion
before update of status on public.class_council_classes
for each row execute function public.class_council_validate_class_completion();

create or replace function public.class_council_validate_council_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    if new.current_import_id is null then
      raise exception 'A council cannot be completed without a confirmed import';
    end if;

    if not exists (
      select 1
      from public.class_council_classes c
      where c.council_id = new.id
    ) then
      raise exception 'A council cannot be completed without classes';
    end if;

    if exists (
      select 1
      from public.class_council_classes c
      where c.council_id = new.id
        and c.status <> 'completed'
    ) then
      raise exception 'All classes must be completed before completing the council';
    end if;

    if new.completed_by is null then
      raise exception 'completed_by is required when completing a council';
    end if;

    new.completed_at = coalesce(new.completed_at, now());
  elsif old.status = 'completed' and new.status = 'reopened' then
    new.completed_at = null;
    new.completed_by = null;
  end if;

  return new;
end;
$$;

create trigger class_council_validate_completion
before update of status on public.class_councils
for each row execute function public.class_council_validate_council_completion();

create or replace function public.class_council_validate_student_snapshot_links()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  enrollment_council_id uuid;
  import_council_id uuid;
begin
  select c.council_id
  into enrollment_council_id
  from public.class_council_enrollments e
  join public.class_council_classes c on c.id = e.council_class_id
  where e.id = new.enrollment_id;

  select i.council_id
  into import_council_id
  from public.class_council_imports i
  where i.id = new.import_id;

  if enrollment_council_id is null
     or import_council_id is null
     or enrollment_council_id <> import_council_id then
    raise exception 'Student snapshot, enrollment and import must belong to the same council';
  end if;

  return new;
end;
$$;

create trigger class_council_student_snapshot_validate_links
before insert or update of enrollment_id, import_id
on public.class_council_student_snapshots
for each row execute function public.class_council_validate_student_snapshot_links();

create or replace function public.class_council_validate_result_links()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  enrollment_class_id uuid;
  enrollment_council_id uuid;
  subject_class_id uuid;
  import_council_id uuid;
begin
  select e.council_class_id, c.council_id
  into enrollment_class_id, enrollment_council_id
  from public.class_council_enrollments e
  join public.class_council_classes c on c.id = e.council_class_id
  where e.id = new.enrollment_id;

  select s.council_class_id
  into subject_class_id
  from public.class_council_subjects s
  where s.id = new.subject_id;

  select i.council_id
  into import_council_id
  from public.class_council_imports i
  where i.id = new.import_id;

  if enrollment_class_id is null
     or subject_class_id is null
     or import_council_id is null
     or enrollment_class_id <> subject_class_id
     or enrollment_council_id <> import_council_id then
    raise exception 'Result, enrollment, subject and import must belong to the same class council';
  end if;

  return new;
end;
$$;

create trigger class_council_result_validate_links
before insert or update of import_id, enrollment_id, subject_id
on public.class_council_results
for each row execute function public.class_council_validate_result_links();

create or replace function public.class_council_validate_intervention_links()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  origin_class_council_id uuid;
  origin_class_code text;
  origin_school_year smallint;
  enrollment_class_id uuid;
  enrollment_student_id uuid;
begin
  select c.council_id, c.official_code, council.school_year
  into origin_class_council_id, origin_class_code, origin_school_year
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

  return new;
end;
$$;

create trigger class_council_intervention_validate_links
before insert or update of target_type, origin_council_id, origin_class_id,
  origin_enrollment_id, target_student_id, target_class_official_code, target_school_year
on public.class_council_interventions
for each row execute function public.class_council_validate_intervention_links();

create or replace function public.class_council_before_confirm_import()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    if old.status not in ('validated', 'importing') then
      raise exception 'Only validated or importing records can be confirmed';
    end if;

    if new.blocking_error_count <> 0 then
      raise exception 'Cannot confirm an import with blocking errors';
    end if;

    if not exists (
      select 1
      from public.class_council_student_snapshots s
      where s.import_id = new.id
    ) then
      raise exception 'Cannot confirm an import without student snapshots';
    end if;

    if not exists (
      select 1
      from public.class_council_results r
      where r.import_id = new.id
    ) then
      raise exception 'Cannot confirm an import without academic results';
    end if;

    new.confirmed_at = coalesce(new.confirmed_at, now());
    new.confirmed_by = coalesce(new.confirmed_by, new.created_by);
  end if;

  return new;
end;
$$;

create trigger class_council_import_before_confirm
before update of status on public.class_council_imports
for each row execute function public.class_council_before_confirm_import();

create or replace function public.class_council_after_confirm_import()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    update public.class_councils
    set current_import_id = new.id,
        status = case when status = 'draft' then 'preparation' else status end,
        updated_by = new.confirmed_by
    where id = new.council_id;
  end if;

  return new;
end;
$$;

create trigger class_council_import_after_confirm
after update of status on public.class_council_imports
for each row execute function public.class_council_after_confirm_import();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'class_councils',
    'class_council_imports',
    'students',
    'class_council_classes',
    'class_council_enrollments',
    'class_council_student_snapshots',
    'class_council_subjects',
    'class_council_results',
    'class_council_behaviors',
    'class_council_participants',
    'class_council_interventions',
    'class_council_audit_log'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists staff_select on public.%I', table_name);
    execute format(
      'create policy staff_select on public.%I for select to authenticated using (public.is_active_staff())',
      table_name
    );
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('revoke all on table public.%I from authenticated', table_name);
    execute format('grant select on table public.%I to authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end;
$$;

revoke all on sequence public.class_council_audit_log_id_seq from public, anon, authenticated;
grant usage, select on sequence public.class_council_audit_log_id_seq to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'class-council-imports',
  'class-council-imports',
  false,
  26214400,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Nenhuma policy de storage é criada para authenticated. Uploads e downloads
-- passam pelas rotas protegidas do servidor, usando service_role. O bucket
-- permanece privado e não pode ser acessado diretamente pelo navegador.

comment on table public.class_councils is 'Eventos gerais de conselho de classe, um por ano/bimestre/oferta enquanto ativos.';
comment on table public.class_council_imports is 'Versões dos relatórios de desempenho importados para um conselho.';
comment on table public.students is 'Identidade interna mínima do estudante, reconhecida pela matrícula.';
comment on table public.class_council_enrollments is 'Participação pedagógica do estudante em uma turma de um conselho.';
comment on table public.class_council_student_snapshots is 'Fotografia cadastral e de frequência do estudante em cada importação.';
comment on table public.class_council_results is 'Notas, marcadores especiais e faltas por disciplina e bimestre.';
comment on table public.class_council_interventions is 'Intervenções individuais ou coletivas com continuidade entre conselhos.';

commit;
