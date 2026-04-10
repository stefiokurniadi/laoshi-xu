-- Supabase schema for Mandarin Learning Web App

-- 1) Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  total_points integer not null default 0
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- 2) HSK words
create table if not exists public.hsk_words (
  id bigint generated always as identity primary key,
  hanzi text not null,
  pinyin text not null,
  english text not null,
  level smallint not null check (level between 1 and 9)
);

create index if not exists hsk_words_level_idx on public.hsk_words(level);

alter table public.hsk_words enable row level security;

-- Public read-only word list
create policy "hsk_words_select_all"
on public.hsk_words
for select
using (true);

-- 3) Failed words (review list)
create table if not exists public.failed_words (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id bigint not null references public.hsk_words(id) on delete cascade,
  last_seen timestamptz not null default now(),
  times_seen integer not null default 1,
  primary key (user_id, word_id)
);

-- Existing databases: add counter if missing
alter table public.failed_words
  add column if not exists times_seen integer not null default 1;

create index if not exists failed_words_user_id_last_seen_idx
on public.failed_words(user_id, last_seen desc);

alter table public.failed_words enable row level security;

create policy "failed_words_select_own"
on public.failed_words
for select
using (auth.uid() = user_id);

create policy "failed_words_insert_own"
on public.failed_words
for insert
with check (auth.uid() = user_id);

create policy "failed_words_update_own"
on public.failed_words
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "failed_words_delete_own"
on public.failed_words
for delete
using (auth.uid() = user_id);

-- Add / bump review entry (increments times_seen on repeat misses / skips)
create or replace function public.touch_failed_word(p_word_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.failed_words (user_id, word_id, last_seen, times_seen)
  values (auth.uid(), p_word_id, now(), 1)
  on conflict (user_id, word_id) do update
    set last_seen = excluded.last_seen,
        times_seen = failed_words.times_seen + 1;
end;
$$;

revoke all on function public.touch_failed_word(bigint) from public;
grant execute on function public.touch_failed_word(bigint) to authenticated;

-- 3b) Daily "I don't know" quota (3 uses per calendar day; use_date = client local YYYY-MM-DD)
create table if not exists public.idk_daily_uses (
  user_id uuid not null references auth.users(id) on delete cascade,
  use_date date not null,
  uses smallint not null default 0 check (uses >= 0 and uses <= 3),
  primary key (user_id, use_date)
);

alter table public.idk_daily_uses enable row level security;

create policy "idk_daily_uses_select_own"
on public.idk_daily_uses
for select
using (auth.uid() = user_id);

create policy "idk_daily_uses_insert_own"
on public.idk_daily_uses
for insert
with check (auth.uid() = user_id);

create policy "idk_daily_uses_update_own"
on public.idk_daily_uses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.get_idk_remaining(p_use_date date)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    3 - coalesce(
      (select uses from public.idk_daily_uses where user_id = auth.uid() and use_date = p_use_date),
      0
    )
  );
$$;

revoke all on function public.get_idk_remaining(date) from public;
grant execute on function public.get_idk_remaining(date) to authenticated;

-- Returns remaining uses after a successful consume, or -1 if already at daily cap.
create or replace function public.consume_idk_quota(p_use_date date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cur int;
  new_rem int;
  i int := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  loop
    i := i + 1;
    if i > 8 then
      raise exception 'idk quota concurrent retry limit';
    end if;

    select uses into cur
    from public.idk_daily_uses
    where user_id = auth.uid() and use_date = p_use_date
    for update;

    if found then
      if cur >= 3 then
        return -1;
      end if;
      update public.idk_daily_uses
      set uses = uses + 1
      where user_id = auth.uid() and use_date = p_use_date
      returning 3 - uses into new_rem;
      return new_rem;
    end if;

    begin
      insert into public.idk_daily_uses (user_id, use_date, uses)
      values (auth.uid(), p_use_date, 1);
      return 2;
    exception
      when unique_violation then
        null;
    end;
  end loop;
end;
$$;

revoke all on function public.consume_idk_quota(date) from public;
grant execute on function public.consume_idk_quota(date) to authenticated;

-- 4) Atomic point increments (avoid races)
create or replace function public.increment_total_points(delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  update public.profiles
  set total_points = total_points + delta
  where id = auth.uid()
  returning total_points into new_total;

  if new_total is null then
    raise exception 'profile not found for user %', auth.uid();
  end if;

  return new_total;
end;
$$;

revoke all on function public.increment_total_points(integer) from public;
grant execute on function public.increment_total_points(integer) to authenticated;

-- Leaderboard: top 20 by points; emails masked in RPC (first 3 chars + ***), except the caller’s own row.
-- Excludes superadmin@laoshixu.com (must match SUPERADMIN_EMAIL / src/lib/superadmin.ts).
create or replace function public.get_leaderboard_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  viewer_email text;
  top_rows jsonb;
  viewer_in_top boolean;
  v_rank bigint;
  v_points int;
  v_email text;
  gap_hidden int;
begin
  if viewer is null then
    raise exception 'not authenticated';
  end if;

  select lower(trim(coalesce(email, ''))) into viewer_email from public.profiles where id = viewer;
  if viewer_email = 'superadmin@laoshixu.com' then
    raise exception 'Leaderboard is not available for this account.';
  end if;

  select a, b
  into top_rows, viewer_in_top
  from (
    with ranked as (
      select
        p.id,
        p.email,
        p.total_points,
        row_number() over (order by p.total_points desc, p.id asc) as rnk
      from public.profiles p
      where coalesce(lower(trim(p.email)), '') <> 'superadmin@laoshixu.com'
    ),
    top20 as (
      select * from ranked where rnk <= 20
    )
    select
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'rank', t.rnk,
              'profileId', t.id::text,
              'displayEmail',
                case
                  when t.id = viewer then coalesce(t.email, '')
                  else left(coalesce(t.email, ''), 3) || '***'
                end,
              'totalPoints', t.total_points,
              'isViewer', t.id = viewer
            )
            order by t.rnk
          )
          from top20 t
        ),
        '[]'::jsonb
      ) as a,
      exists (select 1 from top20 x where x.id = viewer) as b
  ) as _row;

  if viewer_in_top then
    return jsonb_build_object('rows', top_rows, 'showGap', false);
  end if;

  select r.rnk, r.total_points, r.email
  into v_rank, v_points, v_email
  from (
    select
      p.id,
      p.email,
      p.total_points,
      row_number() over (order by p.total_points desc, p.id asc) as rnk
    from public.profiles p
    where coalesce(lower(trim(p.email)), '') <> 'superadmin@laoshixu.com'
  ) r
  where r.id = viewer;

  if v_rank is null then
    return jsonb_build_object('rows', top_rows, 'showGap', false);
  end if;

  gap_hidden := greatest(0, v_rank::int - 20 - 1);

  return jsonb_build_object(
    'rows',
    top_rows
      || jsonb_build_array(
           jsonb_build_object('type', 'gap', 'hiddenCount', gap_hidden)
         )
      || jsonb_build_array(
           jsonb_build_object(
             'rank', v_rank,
             'profileId', viewer::text,
             'displayEmail', coalesce(v_email, ''),
             'totalPoints', v_points,
             'isViewer', true
           )
         ),
    'showGap', true
  );
end;
$$;

revoke all on function public.get_leaderboard_snapshot() from public;
grant execute on function public.get_leaderboard_snapshot() to authenticated;

-- 8) Anonymous demo word pool (curated subset for guests; edit rows after seeding)
create table if not exists public.anon_demo_words (
  id bigint generated always as identity primary key,
  hsk_word_id bigint not null references public.hsk_words(id) on delete cascade,
  sort_order integer not null unique,
  created_at timestamptz not null default now()
);

create index if not exists anon_demo_words_hsk_word_id_idx on public.anon_demo_words(hsk_word_id);

alter table public.anon_demo_words enable row level security;

create policy "anon_demo_words_select_all"
on public.anon_demo_words
for select
using (true);

-- Populate with `supabase/anon_demo_words_seed.sql` after `hsk_words` exists.

