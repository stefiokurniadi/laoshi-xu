-- Guest demo pool: up to 200 words from HSK 1–4 (ordered for manual review in `sort_order`).
-- Safe to re-run: clears and repopulates from current `hsk_words`.

delete from public.anon_demo_words;

insert into public.anon_demo_words (hsk_word_id, sort_order)
select id, row_number() over (order by level, id) as sort_order
from (
  select id, level
  from public.hsk_words
  where level between 1 and 4
  order by level, id
  limit 200
) picked;
