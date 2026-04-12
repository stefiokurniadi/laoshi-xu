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

-- First flashcard interaction (scored pick, wrong answer, or “I don’t know”). Used to hide never-played users from the leaderboard.
alter table public.profiles
  add column if not exists first_played_at timestamptz;

-- Peak score (for leaderboard “high” column and profile “best rating”).
alter table public.profiles
  add column if not exists highest_points integer not null default 0;

update public.profiles
set highest_points = greatest(coalesce(highest_points, 0), total_points);

-- Study stats (Gemini advice context + 100-answer milestones) and cached advice text
alter table public.profiles
  add column if not exists total_scored_answers integer not null default 0;
alter table public.profiles
  add column if not exists answers_en_to_zh integer not null default 0;
alter table public.profiles
  add column if not exists answers_hz_to_en integer not null default 0;
alter table public.profiles
  add column if not exists answers_py_to_mix integer not null default 0;
alter table public.profiles
  add column if not exists last_advice_text text;
alter table public.profiles
  add column if not exists last_advice_at timestamptz;

-- 1b) Gemini API usage log (inserts from Next.js service role; users can read own rows for UI)
create table if not exists public.gemini_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  prompt_tokens integer not null default 0,
  candidates_tokens integer not null default 0,
  total_tokens integer not null default 0,
  answers_at_generation integer not null
);

create index if not exists gemini_usage_user_created_idx on public.gemini_usage (user_id, created_at desc);

alter table public.gemini_usage enable row level security;

create policy "gemini_usage_select_own"
on public.gemini_usage
for select
using (auth.uid() = user_id);

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

  update public.profiles
  set first_played_at = coalesce(first_played_at, now())
  where id = auth.uid();
end;
$$;

revoke all on function public.touch_failed_word(bigint) from public;
grant execute on function public.touch_failed_word(bigint) to authenticated;

-- 3a) Per-word consecutive correct (for downweighting “mastered” words in random draw)
create table if not exists public.user_word_streaks (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id bigint not null references public.hsk_words(id) on delete cascade,
  consecutive_correct smallint not null default 0
    check (consecutive_correct >= 0 and consecutive_correct <= 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, word_id)
);

create index if not exists user_word_streaks_user_id_idx
on public.user_word_streaks(user_id);

alter table public.user_word_streaks enable row level security;

create policy "user_word_streaks_select_own"
on public.user_word_streaks
for select
using (auth.uid() = user_id);

create policy "user_word_streaks_insert_own"
on public.user_word_streaks
for insert
with check (auth.uid() = user_id);

create policy "user_word_streaks_update_own"
on public.user_word_streaks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_word_streaks_delete_own"
on public.user_word_streaks
for delete
using (auth.uid() = user_id);

-- Client records outcome after each scored answer; used by GET /api/word weighted picker.
create or replace function public.record_word_answer_outcome(p_word_id bigint, p_correct boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_correct then
    insert into public.user_word_streaks (user_id, word_id, consecutive_correct, updated_at)
    values (auth.uid(), p_word_id, 1, now())
    on conflict (user_id, word_id) do update
      set consecutive_correct = least(public.user_word_streaks.consecutive_correct + 1, 5),
          updated_at = now();
  else
    insert into public.user_word_streaks (user_id, word_id, consecutive_correct, updated_at)
    values (auth.uid(), p_word_id, 0, now())
    on conflict (user_id, word_id) do update
      set consecutive_correct = 0,
          updated_at = now();
  end if;
end;
$$;

revoke all on function public.record_word_answer_outcome(bigint, boolean) from public;
grant execute on function public.record_word_answer_outcome(bigint, boolean) to authenticated;

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

-- Backfill leaderboard eligibility for existing accounts (after failed_words / idk_daily_uses exist).
update public.profiles p
set first_played_at = now()
where p.first_played_at is null
  and (
    p.total_points <> 0
    or exists (select 1 from public.failed_words f where f.user_id = p.id)
    or exists (select 1 from public.idk_daily_uses i where i.user_id = p.id and i.uses > 0)
  );

-- 4) Atomic point increments + optional per-answer study stats (question_mode null = points only)
drop function if exists public.increment_total_points(integer);

create or replace function public.increment_total_points(delta integer, question_mode text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  if question_mode is not null and question_mode not in ('EN_TO_ZH', 'HZ_TO_EN', 'PY_TO_MIX') then
    raise exception 'invalid question_mode %', question_mode;
  end if;

  with curr as (
    select
      p.total_points,
      coalesce(p.highest_points, 0) as peak,
      coalesce(p.total_scored_answers, 0) as sc,
      coalesce(p.answers_en_to_zh, 0) as a_en,
      coalesce(p.answers_hz_to_en, 0) as a_hz,
      coalesce(p.answers_py_to_mix, 0) as a_py
    from public.profiles p
    where p.id = auth.uid()
  ),
  next_vals as (
    select
      case when delta = 0 then c.total_points else c.total_points + delta end as new_total,
      case
        when delta = 0 then c.peak
        else greatest(c.peak, c.total_points + delta)
      end as new_peak,
      case when question_mode is null then c.sc else c.sc + 1 end as new_sc,
      case
        when question_mode is null then c.a_en
        else c.a_en + (case when question_mode = 'EN_TO_ZH' then 1 else 0 end)
      end as na_en,
      case
        when question_mode is null then c.a_hz
        else c.a_hz + (case when question_mode = 'HZ_TO_EN' then 1 else 0 end)
      end as na_hz,
      case
        when question_mode is null then c.a_py
        else c.a_py + (case when question_mode = 'PY_TO_MIX' then 1 else 0 end)
      end as na_py
    from curr c
  )
  update public.profiles p
  set
    total_points = n.new_total,
    highest_points = n.new_peak,
    first_played_at = coalesce(p.first_played_at, now()),
    total_scored_answers = n.new_sc,
    answers_en_to_zh = n.na_en,
    answers_hz_to_en = n.na_hz,
    answers_py_to_mix = n.na_py
  from next_vals n
  where p.id = auth.uid()
  returning p.total_points into new_total;

  if new_total is null then
    raise exception 'profile not found for user %', auth.uid();
  end if;

  return new_total;
end;
$$;

revoke all on function public.increment_total_points(integer, text) from public;
grant execute on function public.increment_total_points(integer, text) to authenticated;

-- Leaderboard: top 20 by points; emails masked in RPC (first 3 chars + ***), except the caller’s own row.
-- Excludes superadmin@laoshixu.com (must match SUPERADMIN_EMAIL / src/lib/superadmin.ts).
-- Excludes users who have never played (profiles.first_played_at is null).
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
  v_highest int;
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
        coalesce(p.highest_points, p.total_points) as high_pts,
        row_number() over (order by p.total_points desc, p.id asc) as rnk
      from public.profiles p
      where coalesce(lower(trim(p.email)), '') <> 'superadmin@laoshixu.com'
        and p.first_played_at is not null
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
              'highestPoints', t.high_pts,
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

  select r.rnk, r.total_points, r.email, coalesce(r.highest_points, r.total_points)
  into v_rank, v_points, v_email, v_highest
  from (
    select
      p.id,
      p.email,
      p.total_points,
      p.highest_points,
      row_number() over (order by p.total_points desc, p.id asc) as rnk
    from public.profiles p
    where coalesce(lower(trim(p.email)), '') <> 'superadmin@laoshixu.com'
      and p.first_played_at is not null
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
             'highestPoints', v_highest,
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

-- 9) Global app settings (singleton row; updates via service role from server actions only)
create table if not exists public.app_settings (
  id smallint primary key default 1 check (id = 1),
  google_login_enabled boolean not null default true,
  tts_voice_preset text not null default 'auto',
  mastery_streak_threshold smallint not null default 5
    check (mastery_streak_threshold >= 1 and mastery_streak_threshold <= 50),
  mastery_relative_weight double precision not null default 0.15
    check (mastery_relative_weight > 0::double precision and mastery_relative_weight <= 1::double precision),
  updated_at timestamptz not null default now()
);

-- Add columns before any INSERT that names them (existing DBs may already have app_settings without these).
alter table public.app_settings
  add column if not exists tts_voice_preset text not null default 'auto';

alter table public.app_settings
  add column if not exists mastery_streak_threshold smallint not null default 5;

alter table public.app_settings
  add column if not exists mastery_relative_weight double precision not null default 0.15;

insert into public.app_settings (id, google_login_enabled, tts_voice_preset, mastery_streak_threshold, mastery_relative_weight)
values (1, true, 'auto', 5, 0.15)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

create policy "app_settings_select_all"
on public.app_settings
for select
to anon, authenticated
using (true);

-- No insert/update/delete policies: clients read only; writes use service_role in Next.js.

