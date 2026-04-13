-- Flashcard 2.0: track review source (quiz vs flashcard)

alter table public.failed_words
  add column if not exists from_quiz boolean not null default false;

alter table public.failed_words
  add column if not exists from_flashcard boolean not null default false;

-- New implementation with explicit source.
create or replace function public.touch_failed_word(p_word_id bigint, p_source text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_source is null or p_source = '' then
    raise exception 'invalid source';
  end if;
  if p_source not in ('quiz', 'flashcard') then
    raise exception 'invalid source';
  end if;

  insert into public.failed_words (user_id, word_id, last_seen, times_seen, from_quiz, from_flashcard)
  values (
    auth.uid(),
    p_word_id,
    now(),
    1,
    (p_source = 'quiz'),
    (p_source = 'flashcard')
  )
  on conflict (user_id, word_id) do update
    set last_seen = excluded.last_seen,
        times_seen = failed_words.times_seen + 1,
        from_quiz = (failed_words.from_quiz or excluded.from_quiz),
        from_flashcard = (failed_words.from_flashcard or excluded.from_flashcard);

  update public.profiles
  set first_played_at = coalesce(first_played_at, now())
  where id = auth.uid();
end;
$$;

-- Backwards-compatible wrapper used by older clients.
create or replace function public.touch_failed_word(p_word_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  select public.touch_failed_word(p_word_id, 'quiz');
$$;

revoke all on function public.touch_failed_word(bigint) from public;
revoke all on function public.touch_failed_word(bigint, text) from public;
grant execute on function public.touch_failed_word(bigint) to authenticated;
grant execute on function public.touch_failed_word(bigint, text) to authenticated;

