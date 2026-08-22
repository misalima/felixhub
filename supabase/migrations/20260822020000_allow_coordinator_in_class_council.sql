begin;

-- Amplia o acesso do Conselho de Classe para coordenadores ativos.
-- As políticas existentes chamam esta função, portanto não precisam ser recriadas.
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
      and p.role in ('admin', 'gestor', 'coordenador')
  );
$$;

revoke all on function public.is_active_staff() from public, anon;
grant execute on function public.is_active_staff() to authenticated, service_role;

comment on function public.is_active_staff() is
  'Autoriza perfis ativos admin, gestor ou coordenador nas áreas administrativas restritas.';

commit;
