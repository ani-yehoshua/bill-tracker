-- Households were built assuming exactly two people: the invite code
-- auto-closed the moment a second member joined. Removing that cap so
-- family/roommate-sized groups work means the code is now a longer-lived
-- shared secret, so this also strengthens it: drops the fixed "OWED-"
-- prefix (all 8 characters are now random — ~852 quadrillion combinations
-- vs. the previous ~923k) and adds a 3-day expiry, rotatable anytime.

alter table public.households
  add column if not exists invite_code_expires_at timestamptz
    default (now() + interval '3 days');

-- Existing open codes get a fresh 3-day window from now, since their
-- original (now-removed) protection was the 2-member auto-close, not time.
update public.households
  set invite_code_expires_at = now() + interval '3 days'
  where invite_code is not null and invite_code_expires_at is null;

create or replace function public.gen_invite_code()
returns text language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code text; i int;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      if i = 4 then code := code || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.households h where h.invite_code = code);
  end loop;
  return code;
end $$;

create or replace function public.join_household_by_code(p_code text)
returns public.households
language plpgsql security definer set search_path = public as $$
declare h public.households; norm text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'already_in_household';
  end if;

  norm := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(norm) <> 8 then raise exception 'invalid_code'; end if;

  select * into h from public.households
   where upper(regexp_replace(invite_code, '[^A-Za-z0-9]', '', 'g')) = norm
     and (invite_code_expires_at is null or invite_code_expires_at > now());
  if h.id is null then raise exception 'invalid_code'; end if;

  insert into public.household_members (household_id, user_id, role)
    values (h.id, auth.uid(), 'member')
    on conflict (household_id, user_id) do nothing;

  return h;
end $$;

create or replace function public.rotate_invite_code()
returns text language plpgsql security definer set search_path = public as $$
declare hid uuid; code text;
begin
  hid := public.my_household_id();
  if hid is null then raise exception 'no_household'; end if;
  code := public.gen_invite_code();
  update public.households
    set invite_code = code, invite_code_expires_at = now() + interval '3 days'
    where id = hid;
  return code;
end $$;
