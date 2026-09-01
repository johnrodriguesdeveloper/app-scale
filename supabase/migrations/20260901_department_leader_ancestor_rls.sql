-- A leader of a department should have the same rights in its subdepartments
-- as a leader added directly to that subdepartment. The RLS policies below
-- only checked for an exact department_leaders.department_id match, so a
-- parent-department leader could see the roster/member controls unlocked
-- (client-side check already walks the ancestor chain) but writes were
-- rejected by RLS. This adds a recursive helper and reuses it in the write
-- policies that were still doing an exact match.

create or replace function public.is_department_leader_or_ancestor(p_department_id uuid, p_user_id uuid default auth.uid())
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    with recursive dept_chain as (
      select id, parent_id from public.departments where id = p_department_id
      union all
      select d.id, d.parent_id
      from public.departments d
      join dept_chain dc on d.id = dc.parent_id
    )
    select 1
    from public.department_leaders dl
    where dl.user_id = p_user_id
      and dl.department_id in (select id from dept_chain)
  );
end;
$$;

alter policy "Gerenciar escalas (Admin ou Líder)" on public.rosters
  using (
    (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and (profiles.org_role = 'admin' or profiles.org_role = 'master')
    ))
    or public.is_department_leader_or_ancestor(rosters.department_id, auth.uid())
  );

alter policy "Líderes podem inserir membros" on public.department_members
  with check (public.is_department_leader_or_ancestor(department_members.department_id, auth.uid()));

alter policy "Líderes podem remover membros" on public.department_members
  using (public.is_department_leader_or_ancestor(department_members.department_id, auth.uid()));
