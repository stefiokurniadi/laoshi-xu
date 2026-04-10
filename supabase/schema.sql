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

