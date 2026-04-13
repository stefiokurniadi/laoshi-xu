-- Flashcard 2.0: separate points (no leaderboard)

create table if not exists public.flashcard_points (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_points integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.flashcard_points enable row level security;

create policy "flashcard_points_select_own"
on public.flashcard_points
for select
using (auth.uid() = user_id);

create policy "flashcard_points_insert_own"
on public.flashcard_points
for insert
with check (auth.uid() = user_id);

create policy "flashcard_points_update_own"
on public.flashcard_points
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.increment_flashcard_points(delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.flashcard_points (user_id, total_points, updated_at)
  values (auth.uid(), delta, now())
  on conflict (user_id) do update
    set total_points = flashcard_points.total_points + delta,
        updated_at = now()
  returning total_points into new_total;

  return coalesce(new_total, 0);
end;
$$;

revoke all on function public.increment_flashcard_points(integer) from public;
grant execute on function public.increment_flashcard_points(integer) to authenticated;

