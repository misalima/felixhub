begin;

alter table public.class_council_student_snapshots
  add column report_position integer
  check (report_position is null or report_position >= 0);

create index class_council_snapshots_import_position_idx
  on public.class_council_student_snapshots(import_id, report_position);

create or replace function public.replace_class_council_participants(
  p_council_id uuid,
  p_class_id uuid,
  p_participants jsonb,
  p_actor_id uuid
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_participants is null or jsonb_typeof(p_participants) <> 'array' then
    raise exception 'Participants must be a JSON array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_participants) item
    where nullif(btrim(item ->> 'name'), '') is null
  ) then
    raise exception 'Participant name is required';
  end if;

  if not exists (
    select 1
    from public.class_council_classes c
    join public.class_councils council on council.id = c.council_id
    where c.id = p_class_id
      and c.council_id = p_council_id
      and c.status <> 'completed'
      and council.archived_at is null
      and council.status <> 'completed'
  ) then
    raise exception 'Class council is not editable';
  end if;

  delete from public.class_council_participants
  where council_class_id = p_class_id;

  insert into public.class_council_participants (
    council_class_id,
    name,
    role_or_subject,
    position,
    created_by,
    updated_by
  )
  select
    p_class_id,
    btrim(item.value ->> 'name'),
    nullif(btrim(item.value ->> 'role_or_subject'), ''),
    item.ordinality - 1,
    p_actor_id,
    p_actor_id
  from jsonb_array_elements(p_participants) with ordinality as item(value, ordinality);

  update public.class_council_classes
  set status = 'in_progress',
      updated_by = p_actor_id
  where id = p_class_id;

  update public.class_councils
  set status = 'in_progress',
      updated_by = p_actor_id
  where id = p_council_id
    and status in ('draft', 'preparation');
end;
$$;

create or replace function public.start_class_council_class(
  p_council_id uuid,
  p_class_id uuid,
  p_teachers jsonb,
  p_actor_id uuid
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  teacher_count integer;
begin
  if p_teachers is null or jsonb_typeof(p_teachers) <> 'array' then
    raise exception 'Teachers must be a JSON array';
  end if;

  select count(*) into teacher_count
  from jsonb_array_elements(p_teachers);

  if teacher_count < 1 or teacher_count > 50 then
    raise exception 'At least one teacher is required';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_teachers) item
    where nullif(btrim(item ->> 'name'), '') is null
      or nullif(item ->> 'subject_id', '') is null
  ) then
    raise exception 'Teacher name and subject are required';
  end if;

  if teacher_count <> (
    select count(distinct item ->> 'subject_id')
    from jsonb_array_elements(p_teachers) item
  ) then
    raise exception 'Each subject can only be informed once';
  end if;

  if teacher_count <> (
    select count(*)
    from public.class_council_subjects subject
    where subject.council_class_id = p_class_id
      and subject.id in (
        select (item ->> 'subject_id')::uuid
        from jsonb_array_elements(p_teachers) item
      )
  ) then
    raise exception 'Invalid subject for this class';
  end if;

  update public.class_council_classes
  set status = 'in_progress',
      updated_by = p_actor_id
  where id = p_class_id
    and council_id = p_council_id
    and status = 'not_started';

  if not found then
    return false;
  end if;

  insert into public.class_council_participants (
    council_class_id,
    name,
    role_or_subject,
    position,
    created_by,
    updated_by
  )
  select
    p_class_id,
    btrim(item.value ->> 'name'),
    subject.display_name,
    item.ordinality - 1,
    p_actor_id,
    p_actor_id
  from jsonb_array_elements(p_teachers) with ordinality as item(value, ordinality)
  join public.class_council_subjects subject
    on subject.id = (item.value ->> 'subject_id')::uuid
   and subject.council_class_id = p_class_id;

  update public.class_council_subjects subject
  set teacher_name = btrim(item.value ->> 'name'),
      updated_by = p_actor_id
  from jsonb_array_elements(p_teachers) item
  where subject.id = (item.value ->> 'subject_id')::uuid
    and subject.council_class_id = p_class_id;

  update public.class_councils
  set status = 'in_progress',
      updated_by = p_actor_id
  where id = p_council_id
    and status in ('draft', 'preparation');

  insert into public.class_council_audit_log (
    council_id,
    council_class_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_council_id,
    p_class_id,
    p_actor_id,
    'class_started',
    'class',
    p_class_id,
    jsonb_build_object('teacher_count', teacher_count)
  );

  return true;
end;
$$;

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
      join public.class_council_enrollments e on e.council_class_id = c.id
      join public.class_council_student_snapshots snapshot on snapshot.enrollment_id = e.id
      where c.council_id = new.id
        and snapshot.import_id = new.current_import_id
    ) then
      raise exception 'A council cannot be completed without classes in its current import';
    end if;

    if exists (
      select 1
      from public.class_council_classes c
      where c.council_id = new.id
        and c.status <> 'completed'
        and exists (
          select 1
          from public.class_council_enrollments e
          join public.class_council_student_snapshots snapshot on snapshot.enrollment_id = e.id
          where e.council_class_id = c.id
            and snapshot.import_id = new.current_import_id
        )
    ) then
      raise exception 'All classes in the current import must be completed before completing the council';
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

revoke all on function public.replace_class_council_participants(uuid, uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.replace_class_council_participants(uuid, uuid, jsonb, uuid) to service_role;

revoke all on function public.start_class_council_class(uuid, uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.start_class_council_class(uuid, uuid, jsonb, uuid) to service_role;

commit;
