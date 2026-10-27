-- MASAR 0.9.30 — ترقية اختيارية: سجل نسخ سحابية (آخر 20 مراجعة لكل مدرسة).
-- شغّله مرة واحدة في SQL Editor بعد SUPABASE_SETUP.sql. آمن لإعادة التشغيل.
create table if not exists public.school_state_history (
 id bigint generated always as identity primary key,
 school_id uuid not null references public.schools(id) on delete cascade,
 revision bigint not null,
 payload jsonb not null,
 saved_by uuid references auth.users(id),
 saved_at timestamptz not null default now()
);
create index if not exists school_state_history_idx on public.school_state_history(school_id, revision desc);
alter table public.school_state_history enable row level security;
revoke all on public.school_state_history from anon;
grant select on public.school_state_history to authenticated;
revoke insert,update,delete on public.school_state_history from authenticated;
drop policy if exists "history admin read" on public.school_state_history;
create policy "history admin read" on public.school_state_history for select to authenticated using (
 exists(select 1 from public.school_members m where m.school_id=school_state_history.school_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin'))
);
create or replace function public.save_masar_school_state(p_school_id uuid,p_expected_revision bigint,p_payload jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); oldrev bigint; oldpayload jsonb; newrev bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.school_members m where m.school_id=p_school_id and m.user_id=uid and m.role in ('owner','admin')) then
  raise exception 'Not permitted to write this school';
 end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or not(p_payload ? 'timetable' and p_payload ? 'sections' and p_payload ? 'assignments') then
  raise exception 'Invalid school payload';
 end if;
 perform 1 from public.schools s where s.id=p_school_id for update;
 select revision,payload into oldrev,oldpayload from public.school_states where school_id=p_school_id for update;
 if oldrev is distinct from p_expected_revision then raise exception 'Revision conflict: cloud data changed. Download latest before saving.'; end if;
 if oldrev is null then
  insert into public.school_states(school_id,payload,revision,updated_by) values(p_school_id,p_payload,1,uid);
  newrev:=1;
 else
  insert into public.school_state_history(school_id,revision,payload,saved_by) values(p_school_id,oldrev,oldpayload,uid);
  delete from public.school_state_history where school_id=p_school_id and id not in (
   select id from public.school_state_history where school_id=p_school_id order by revision desc limit 20);
  newrev:=oldrev+1;
  update public.school_states set payload=p_payload,revision=newrev,updated_by=uid,updated_at=now() where school_id=p_school_id;
 end if;
 return newrev;
end $$;
revoke all on function public.save_masar_school_state(uuid,bigint,jsonb) from public,anon;
grant execute on function public.save_masar_school_state(uuid,bigint,jsonb) to authenticated;
