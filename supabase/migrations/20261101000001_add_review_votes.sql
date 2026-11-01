create table if not exists public.review_votes (
  review_id text not null,
  product_id text not null,
  user_id uuid not null,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create index if not exists review_votes_product_id_idx
  on public.review_votes (product_id);

alter table public.review_votes enable row level security;

grant select, insert, update, delete on public.review_votes to anon, authenticated;

drop policy if exists "Anyone can read review votes" on public.review_votes;
create policy "Anyone can read review votes"
  on public.review_votes for select
  using (true);

drop policy if exists "Anyone can add review votes" on public.review_votes;
create policy "Anyone can add review votes"
  on public.review_votes for insert
  with check (true);

drop policy if exists "Anyone can update review votes" on public.review_votes;
create policy "Anyone can update review votes"
  on public.review_votes for update
  using (true)
  with check (true);

drop policy if exists "Anyone can remove review votes" on public.review_votes;
create policy "Anyone can remove review votes"
  on public.review_votes for delete
  using (true);

create or replace function public.cleanup_review_votes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.review_votes where review_id = old.id::text;
  return old;
end;
$$;

drop trigger if exists cleanup_review_votes_after_delete on public.reviews;
create trigger cleanup_review_votes_after_delete
  after delete on public.reviews
  for each row execute function public.cleanup_review_votes();
