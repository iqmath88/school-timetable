-- MASAR 0.9.19.0 — run once in a NEW Supabase project, SQL Editor.
-- Auth users are managed by Supabase Auth, never store passwords in public tables.
create extension if not exists pgcrypto;
create table if not exists public.schools (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 2 and 120),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.school_members (
 school_id uuid not null references public.schools(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin','teacher')),
 created_at timestamptz not null default now(),
 primary key(school_id,user_id)
);
create table if not exists public.school_states (
 school_id uuid primary key references public.schools(id) on delete cascade,
 payload jsonb not null default '{}'::jsonb,
 revision bigint not null default 1,
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now(),
 constraint payload_object check(jsonb_typeof(payload)='object')
);
create index if not exists school_members_user_idx on public.school_members(user_id);
alter table public.schools enable row level security;
alter table public.school_members enable row level security;
alter table public.school_states enable row level security;
revoke all on public.schools,public.school_members,public.school_states from anon;
grant select on public.schools,public.school_members,public.school_states to authenticated;
-- No direct client INSERT/UPDATE/DELETE: all mutations go through checked RPCs.
revoke insert,update,delete on public.schools,public.school_members,public.school_states from authenticated;
create policy "schools member read" on public.schools for select to authenticated using (
 exists(select 1 from public.school_members m where m.school_id=id and m.user_id=(select auth.uid()))
);
-- Membership listing is scoped to the current user; no recursive RLS policy.
create policy "members self read" on public.school_members for select to authenticated using (user_id=(select auth.uid()));
create policy "states member read" on public.school_states for select to authenticated using (
 exists(select 1 from public.school_members m where m.school_id=school_states.school_id and m.user_id=(select auth.uid()))
);
create or replace function public.create_masar_school(school_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare sid uuid; uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if length(trim(coalesce(school_name,''))) not between 2 and 120 then raise exception 'Invalid school name'; end if;
 insert into public.schools(name,created_by) values(trim(school_name),uid) returning id into sid;
 insert into public.school_members(school_id,user_id,role) values(sid,uid,'owner');
 return sid;
end $$;
create or replace function public.save_masar_school_state(p_school_id uuid,p_expected_revision bigint,p_payload jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); oldrev bigint; newrev bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.school_members m where m.school_id=p_school_id and m.user_id=uid and m.role in ('owner','admin')) then
  raise exception 'Not permitted to write this school';
 end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or not(p_payload ? 'timetable' and p_payload ? 'sections' and p_payload ? 'assignments') then
  raise exception 'Invalid school payload';
 end if;
 -- Lock parent row so first-time saves are serialized too.
 perform 1 from public.schools s where s.id=p_school_id for update;
 select revision into oldrev from public.school_states where school_id=p_school_id for update;
 if oldrev is distinct from p_expected_revision then raise exception 'Revision conflict: cloud data changed. Download latest before saving.'; end if;
 if oldrev is null then
  insert into public.school_states(school_id,payload,revision,updated_by) values(p_school_id,p_payload,1,uid);
  newrev:=1;
 else
  newrev:=oldrev+1;
  update public.school_states set payload=p_payload,revision=newrev,updated_by=uid,updated_at=now() where school_id=p_school_id;
 end if;
 return newrev;
end $$;
revoke all on function public.create_masar_school(text) from public,anon;
revoke all on function public.save_masar_school_state(uuid,bigint,jsonb) from public,anon;
grant execute on function public.create_masar_school(text) to authenticated;
grant execute on function public.save_masar_school_state(uuid,bigint,jsonb) to authenticated;
