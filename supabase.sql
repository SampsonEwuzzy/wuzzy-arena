create table if not exists public.comments (
  id bigint generated always as identity primary key,
  post_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at desc);
alter table public.comments enable row level security;
create policy "anyone can read" on public.comments for select using (true);
create policy "signed-in users can comment" on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy "owners can delete" on public.comments for delete to authenticated using (auth.uid() = user_id);
