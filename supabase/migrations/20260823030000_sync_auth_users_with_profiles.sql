begin;

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.email, new.raw_user_meta_data ->> 'email', ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    case
      when requested_role in ('admin', 'gestor', 'coordenador') then requested_role
      else 'coordenador'
    end,
    false,
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;

drop trigger if exists create_profile_after_auth_signup on auth.users;
create trigger create_profile_after_auth_signup
  after insert on auth.users
  for each row
  execute function public.create_profile_for_auth_user();

insert into public.profiles (
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
)
select
  auth_user.id,
  coalesce(auth_user.email, auth_user.raw_user_meta_data ->> 'email', ''),
  nullif(trim(coalesce(auth_user.raw_user_meta_data ->> 'full_name', '')), ''),
  case
    when auth_user.raw_user_meta_data ->> 'role' in ('admin', 'gestor', 'coordenador')
      then auth_user.raw_user_meta_data ->> 'role'
    else 'coordenador'
  end,
  false,
  coalesce(auth_user.created_at, now()),
  now()
from auth.users as auth_user
left join public.profiles as profile on profile.id = auth_user.id
where profile.id is null;

comment on function public.create_profile_for_auth_user() is
  'Mantém contas do Supabase Auth visíveis em profiles, inativas até revisão administrativa.';

commit;
