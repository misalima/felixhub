begin;

create index if not exists class_council_results_import_id_cursor_idx
  on public.class_council_results (import_id, id);

create index if not exists class_council_interventions_council_status_created_idx
  on public.class_council_interventions (origin_council_id, status, created_at desc, id);

commit;
