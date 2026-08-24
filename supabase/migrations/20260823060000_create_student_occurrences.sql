begin;

create table public.student_occurrences (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  occurred_on date not null,
  category text not null check (category in (
    'removed_from_classroom',
    'inappropriate_phone_use',
    'unjustified_class_absence',
    'disrespect_staff',
    'violence_threat_or_bullying',
    'other'
  )),
  notes text check (notes is null or char_length(notes) <= 2000),
  guardian_notified boolean not null default false,
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index student_occurrences_student_date_idx
  on public.student_occurrences (student_id, occurred_on desc, created_at desc);

create index student_occurrences_category_date_idx
  on public.student_occurrences (category, occurred_on desc);

create trigger student_occurrences_set_updated_at
before update on public.student_occurrences
for each row execute function public.class_council_set_updated_at();

alter table public.student_occurrences enable row level security;

create policy staff_select
  on public.student_occurrences
  for select
  to authenticated
  using (public.is_active_staff());

revoke all on table public.student_occurrences from public, anon, authenticated;
grant select on table public.student_occurrences to authenticated;
grant all on table public.student_occurrences to service_role;

comment on table public.student_occurrences is
  'Registro factual de ocorrências disciplinares vinculadas ao prontuário permanente do estudante.';
comment on column public.student_occurrences.guardian_notified is
  'Indica se o responsável legal foi comunicado ou tomou ciência da ocorrência.';

commit;
