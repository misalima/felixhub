begin;

create or replace function public.reopen_class_council_class(
  p_council_id uuid,
  p_class_id uuid,
  p_actor_id uuid
)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  update public.class_council_classes c
  set
    status = 'in_progress',
    updated_by = p_actor_id
  where c.id = p_class_id
    and c.council_id = p_council_id
    and c.status = 'completed'
    and exists (
      select 1
      from public.class_councils council
      where council.id = p_council_id
        and council.archived_at is null
        and council.status <> 'completed'
    );

  if not found then
    return false;
  end if;

  insert into public.class_council_audit_log (
    council_id,
    council_class_id,
    actor_id,
    event_type,
    entity_type,
    entity_id
  ) values (
    p_council_id,
    p_class_id,
    p_actor_id,
    'class_reopened',
    'class',
    p_class_id
  );

  return true;
end;
$$;

revoke all on function public.reopen_class_council_class(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.reopen_class_council_class(uuid, uuid, uuid) to service_role;

commit;
