begin;

alter table public.class_council_enrollments
  add column attendance_situation text not null default 'regular'
  constraint class_council_enrollments_attendance_situation_check
  check (attendance_situation in ('regular', 'infrequent', 'dropout'));

create index class_council_enrollments_attendance_situation_idx
  on public.class_council_enrollments (council_class_id, attendance_situation)
  where attendance_situation <> 'regular';

comment on column public.class_council_enrollments.attendance_situation is
  'Situação de frequência observada manualmente no conselho: regular, infrequente ou desistente (dropout). Independente da frequência numérica importada.';

commit;
