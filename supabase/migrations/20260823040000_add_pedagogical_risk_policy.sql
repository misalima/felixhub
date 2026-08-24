begin;

create table public.pedagogical_risk_policies (
  id uuid primary key default gen_random_uuid(),
  school_year smallint not null unique check (school_year between 2020 and 2100),
  version integer not null default 1 check (version > 0),
  annual_required_points numeric(5,2) not null default 24 check (annual_required_points > 0),
  term_expected_points numeric(4,2) not null default 6 check (term_expected_points > 0),
  partial_progression_limit smallint not null default 4 check (partial_progression_limit >= 0),
  grade_1_2_attention_count smallint not null default 3 check (grade_1_2_attention_count > 0),
  grade_3_attention_count smallint not null default 2 check (grade_3_attention_count > 0),
  pressure_required_average numeric(4,2) not null default 7 check (pressure_required_average >= 0),
  critical_required_average numeric(4,2) not null default 8 check (critical_required_average >= pressure_required_average),
  attendance_attention_threshold numeric(5,2) not null default 80 check (attendance_attention_threshold between 0 and 100),
  attendance_retention_threshold numeric(5,2) not null default 75 check (attendance_retention_threshold between 0 and 100),
  effective_from date not null,
  source_reference text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pedagogical_risk_policies enable row level security;

create policy staff_select on public.pedagogical_risk_policies
  for select to authenticated
  using (public.is_active_staff());

insert into public.pedagogical_risk_policies (
  school_year,
  version,
  annual_required_points,
  term_expected_points,
  partial_progression_limit,
  grade_1_2_attention_count,
  grade_3_attention_count,
  pressure_required_average,
  critical_required_average,
  attendance_attention_threshold,
  attendance_retention_threshold,
  effective_from,
  source_reference
) values (
  2026,
  1,
  24,
  6,
  4,
  3,
  2,
  7,
  8,
  80,
  75,
  '2026-01-01',
  'Portaria SEDUC n. 1.133/2026'
) on conflict (school_year) do nothing;

alter table public.class_council_classes
  add column grade_level smallint
  check (grade_level in (1, 2, 3));

update public.class_council_classes
set grade_level = case
  when upper(coalesce(grade_label, '') || ' ' || coalesce(display_name, '')) ~ '(^|[^0-9])1([^0-9]|$)' then 1
  when upper(coalesce(grade_label, '') || ' ' || coalesce(display_name, '')) ~ '(^|[^0-9])2([^0-9]|$)' then 2
  when upper(coalesce(grade_label, '') || ' ' || coalesce(display_name, '')) ~ '(^|[^0-9])3([^0-9]|$)' then 3
  else null
end
where grade_level is null;

-- Os conselhos de 2026 passam a guardar a fotografia completa da política
-- aprovada para o ano. Alterações futuras na tabela de políticas não mudam
-- os conselhos já criados.
update public.class_councils
set criteria = criteria || jsonb_build_object(
  'risk_model_version', 2,
  'policy_version', 1,
  'annual_required_points', 24,
  'term_expected_points', 6,
  'partial_progression_limit', 4,
  'grade_1_2_attention_count', 3,
  'grade_3_attention_count', 2,
  'pressure_required_average', 7,
  'critical_required_average', 8,
  'attendance_attention_threshold', 80,
  'attendance_retention_threshold', 75,
  'source_reference', 'Portaria SEDUC n. 1.133/2026'
)
where school_year = 2026
  and archived_at is null;

create index class_council_classes_grade_idx
  on public.class_council_classes(council_id, grade_level, shift);

create index class_council_results_dashboard_idx
  on public.class_council_results(import_id, term, subject_id, enrollment_id);

comment on table public.pedagogical_risk_policies is
  'Políticas anuais usadas como modelo. Cada conselho mantém uma cópia em criteria para auditoria.';

comment on column public.class_council_classes.grade_level is
  'Série normalizada do Ensino Médio: 1, 2 ou 3.';

commit;
