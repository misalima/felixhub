begin;

-- Um mesmo arquivo pode ser enviado novamente como uma nova versão. O hash
-- continua indexado para auditoria e comparação, mas deixa de bloquear versões.
alter table public.class_council_imports
  drop constraint if exists class_council_imports_council_id_file_sha256_key;

create index if not exists class_council_imports_council_hash_idx
  on public.class_council_imports(council_id, file_sha256, version desc);

create or replace function public.class_council_audit_council_reopening()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'completed' and new.status = 'reopened' then
    if new.updated_by is null then
      raise exception 'updated_by is required when reopening a council';
    end if;

    insert into public.class_council_audit_log (
      council_id,
      actor_id,
      event_type,
      entity_type,
      entity_id,
      metadata
    ) values (
      new.id,
      new.updated_by,
      'council_reopened',
      'council',
      new.id,
      jsonb_build_object('previous_status', old.status)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists class_council_audit_council_reopening
  on public.class_councils;

create trigger class_council_audit_council_reopening
after update of status on public.class_councils
for each row execute function public.class_council_audit_council_reopening();

commit;
